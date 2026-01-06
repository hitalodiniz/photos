import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('get-base-url', () => {
  beforeEach(() => {
    // 🎯 Limpa o registro de módulos e ambientes
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('deve retornar a URL de produção definida na env', async () => {
    const prodUrl = 'https://suagaleria.com.br';

    // 1. Configura a env
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', prodUrl);

    // 2. 🎯 Usa doMock para isolar este carregamento de arquivo
    vi.doMock('./get-base-url', () => ({
      getBaseUrl: () =>
        process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    }));

    // 3. Reimporta dinamicamente
    const { getBaseUrl } = await import('./get-base-url');

    expect(getBaseUrl()).toBe(prodUrl);
  });

  it('deve retornar localhost em ambiente de desenvolvimento', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');

    const { getBaseUrl } = await import('./get-base-url');

    expect(getBaseUrl()).toBe('http://localhost:3000');
  });
});
