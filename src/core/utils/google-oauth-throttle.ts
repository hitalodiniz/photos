/**
 * 🎯 Rate Limiting e Retry Logic para Google OAuth Token Endpoint
 * 
 * Previne rate limiting (429) ao fazer múltiplas requisições ao endpoint /token
 * Implementa:
 * - Throttling (máximo de requisições por período)
 * - Retry com backoff exponencial
 * - Cache de requisições em andamento para evitar duplicatas
 */

interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
}

// Cache de requisições em andamento (por refresh_token)
const pendingRequests = new Map<string, PendingRequest>();

// Histórico de requisições para rate limiting
const requestHistory: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 10; // Limite conservador
const WINDOW_MS = 60 * 1000; // 1 minuto

/**
 * Limpa requisições antigas do histórico
 */
function cleanupHistory() {
  const now = Date.now();
  while (requestHistory.length > 0 && requestHistory[0] < now - WINDOW_MS) {
    requestHistory.shift();
  }
}

/**
 * Verifica se podemos fazer uma nova requisição (rate limiting)
 */
function canMakeRequest(): boolean {
  cleanupHistory();
  return requestHistory.length < MAX_REQUESTS_PER_MINUTE;
}

/**
 * Registra uma requisição no histórico
 */
function recordRequest() {
  requestHistory.push(Date.now());
  cleanupHistory();
}

/**
 * Aguarda antes de fazer uma nova requisição (throttling)
 */
async function waitForRateLimit(): Promise<void> {
  if (!canMakeRequest()) {
    const oldestRequest = requestHistory[0];
    const waitTime = WINDOW_MS - (Date.now() - oldestRequest) + 100; // +100ms de margem
    if (waitTime > 0) {
      console.log(`[google-oauth-throttle] ⏳ Rate limit atingido. Aguardando ${Math.round(waitTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      cleanupHistory();
    }
  }
}

/**
 * Retry com backoff exponencial
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Se for 429 (rate limit), aguarda antes de retry
      if (error.status === 429 || error.message?.includes('429')) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[google-oauth-throttle] ⚠️ Rate limit (429) na tentativa ${attempt + 1}. Aguardando ${delay}ms antes de retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Para outros erros, retry imediato (até maxRetries)
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[google-oauth-throttle] ⚠️ Erro na tentativa ${attempt + 1}. Aguardando ${delay}ms antes de retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Faz requisição ao endpoint /token do Google com rate limiting e retry
 */
export async function fetchGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<Response> {
  // 🎯 DEDUPLICAÇÃO: Se já há uma requisição em andamento para este refresh_token, reutiliza
  const existingRequest = pendingRequests.get(refreshToken);
  if (existingRequest) {
    const age = Date.now() - existingRequest.timestamp;
    // Se a requisição é recente (< 5s), reutiliza
    if (age < 5000) {
      console.log(`[google-oauth-throttle] ♻️ Reutilizando requisição em andamento para refresh_token (${Math.round(age)}ms atrás)`);
      return existingRequest.promise;
    } else {
      // Requisição muito antiga, remove do cache
      pendingRequests.delete(refreshToken);
    }
  }

  // 🎯 RATE LIMITING: Aguarda se necessário
  await waitForRateLimit();

  // Cria a promise da requisição
  const requestPromise = retryWithBackoff(async () => {
    recordRequest();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Se for 429, lança erro para trigger retry
      if (response.status === 429) {
        const error: any = new Error('Rate limit reached (429)');
        error.status = 429;
        throw error;
      }
      
      return response;
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

  // Armazena no cache de requisições em andamento
  pendingRequests.set(refreshToken, {
    promise: requestPromise,
    timestamp: Date.now(),
  });

  try {
    const response = await requestPromise;
    // Remove do cache após sucesso
    pendingRequests.delete(refreshToken);
    return response;
  } catch (error) {
    // Remove do cache após erro
    pendingRequests.delete(refreshToken);
    throw error;
  }
}

/**
 * Limpa o cache de requisições pendentes (útil para testes ou cleanup)
 */
export function clearPendingRequests() {
  pendingRequests.clear();
  requestHistory.length = 0;
}
