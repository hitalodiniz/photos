// src/core/services/asaas/api/client.ts
import { ASAAS_API_URL } from '../utils/constants';

function getAsaasApiKey(): string | null {
  return process.env.ASAAS_API_KEY?.trim() || null;
}

/** Chama a API do Asaas e retorna { ok, data }. Nunca lança — erros retornam ok=false. */
export async function asaasRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data: T }> {
  const apiKey = getAsaasApiKey();
  if (!apiKey)
    return {
      ok: false,
      data: {
        errors: [
          {
            description:
              'Chave Asaas não configurada (ASAAS_API_KEY no .env.local).',
          },
        ],
      } as T,
    };

  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...options,
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function asaasError(
  data: Record<string, unknown>,
  fallback: string,
): string {
  const errors = data?.errors as Array<{ description?: string }> | undefined;
  return errors?.[0]?.description ?? fallback;
}

export function getAsaasApiKeyOrThrow(): string {
  const key = getAsaasApiKey();
  if (!key) {
    throw new Error(
      'Configuração de pagamento indisponível. Configure ASAAS_API_KEY no .env.local e reinicie o servidor.',
    );
  }
  return key;
}
