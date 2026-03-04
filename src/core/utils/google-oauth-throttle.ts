/**
 * 🎯 Rate Limiting e Retry Logic para Google OAuth Token Endpoint
 *
 * Previne rate limiting (429) ao fazer múltiplas requisições ao endpoint /token
 * Implementa:
 * - Throttling (máximo de requisições por período)
 * - Retry com backoff exponencial (exceto erros definitivos)
 * - Cache de resultado para evitar reusar Response já consumido
 * - Deduplicação de requisições em andamento
 */

interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
}

// Cache de requisições em andamento (por refresh_token)
const pendingRequests = new Map<string, PendingRequest>();

// Cache de resultado já parseado (evita reusar Response consumido)
const responseCache = new Map<string, { data: any; timestamp: number }>();

// Histórico de requisições para rate limiting
const requestHistory: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 10;
const WINDOW_MS = 60 * 1000;

function cleanupHistory() {
  const now = Date.now();
  while (requestHistory.length > 0 && requestHistory[0] < now - WINDOW_MS) {
    requestHistory.shift();
  }
}

function canMakeRequest(): boolean {
  cleanupHistory();
  return requestHistory.length < MAX_REQUESTS_PER_MINUTE;
}

function recordRequest() {
  requestHistory.push(Date.now());
  cleanupHistory();
}

async function waitForRateLimit(): Promise<void> {
  if (!canMakeRequest()) {
    const oldestRequest = requestHistory[0];
    const waitTime = WINDOW_MS - (Date.now() - oldestRequest) + 100;
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      cleanupHistory();
    }
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Erros definitivos — não faz retry
      if (
        error.status === 400 ||
        error.message?.includes('invalid_grant') ||
        error.message?.includes('invalid_request')
      ) {
        throw error;
      }

      // Rate limit — backoff exponencial
      if (error.status === 429 || error.message?.includes('429')) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(
          `[google-oauth-throttle] ⚠️ Rate limit (429) na tentativa ${attempt + 1}. Aguardando ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Outros erros — retry com backoff
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(
          `[google-oauth-throttle] ⚠️ Erro na tentativa ${attempt + 1}. Aguardando ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Faz requisição ao endpoint /token do Google com rate limiting,
 * retry inteligente e deduplicação segura de Response.
 */
export async function fetchGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<Response> {
  // 1. Cache de resultado recente (< 5s) — evita reusar Response já consumido
  const cached = responseCache.get(refreshToken);
  if (cached && Date.now() - cached.timestamp < 5000) {
    return new Response(JSON.stringify(cached.data), {
      status: cached.data?.error ? 400 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Deduplicação — reutiliza requisição em andamento para o mesmo token
  const existingRequest = pendingRequests.get(refreshToken);
  if (existingRequest && Date.now() - existingRequest.timestamp < 5000) {
    return existingRequest.promise;
  }

  // 3. Rate limiting
  await waitForRateLimit();

  // 4. Executa a requisição com retry
  const requestPromise = retryWithBackoff(async () => {
    recordRequest();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const error: any = new Error('Rate limit reached (429)');
        error.status = 429;
        throw error;
      }

      // Parseia e cacheia o resultado para deduplicação segura
      const data = await response.json();
      responseCache.set(refreshToken, { data, timestamp: Date.now() });

      // Retorna novo Response construído com o dado cacheado
      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        const timeoutError: any = new Error('Request timeout');
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw error;
    }
  });

  pendingRequests.set(refreshToken, {
    promise: requestPromise,
    timestamp: Date.now(),
  });

  try {
    const response = await requestPromise;
    pendingRequests.delete(refreshToken);
    return response;
  } catch (error) {
    pendingRequests.delete(refreshToken);
    throw error;
  }
}

/**
 * Limpa o cache de requisições pendentes e histórico (útil para testes ou cleanup)
 */
export function clearPendingRequests() {
  pendingRequests.clear();
  responseCache.clear();
  requestHistory.length = 0;
}
