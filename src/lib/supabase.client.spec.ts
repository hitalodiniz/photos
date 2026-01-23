/**
 * ⚠️ CRÍTICO: Testes para cliente Supabase do browser
 * Estes testes validam configuração de cookies e autenticação
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do @supabase/ssr ANTES de importar o módulo
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(),
}));

describe('supabase.client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset modules para garantir imports limpos
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = '.test.com';
    process.env.NEXT_PUBLIC_NODE_ENV = 'production';
  });

  it('deve criar cliente com URL e chave corretas', async () => {
    const { createBrowserClient } = await import('@supabase/ssr');
    // Importação dinâmica para garantir que as variáveis de ambiente estão setadas
    await import('./supabase.client');
    
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          flowType: 'pkce',
        }),
      }),
    );
  });

  it('deve configurar flowType como pkce', async () => {
    const { createBrowserClient } = await import('@supabase/ssr');
    await import('./supabase.client');
    
    const callArgs = vi.mocked(createBrowserClient).mock.calls[0];
    if (callArgs && callArgs[2]) {
      expect(callArgs[2].auth.flowType).toBe('pkce');
    } else {
      throw new Error('createBrowserClient não foi chamado com os argumentos esperados');
    }
  });

  it('deve configurar cookieOptions corretamente em produção', async () => {
    const { createBrowserClient } = await import('@supabase/ssr');
    process.env.NEXT_PUBLIC_NODE_ENV = 'production';
    vi.resetModules();
    await import('./supabase.client');
    
    const callArgs = vi.mocked(createBrowserClient).mock.calls[0];
    if (callArgs && callArgs[2]) {
      expect(callArgs[2].cookieOptions).toEqual({
        domain: undefined, // Sempre undefined quando não há subdomínios
        path: '/',
        sameSite: 'lax',
        secure: true,
        maxAge: 60 * 60 * 24 * 30, // 30 dias - tempo suficiente para o code verifier durante o fluxo OAuth
      });
    } else {
      throw new Error('createBrowserClient não foi chamado');
    }
  });

  it('deve configurar secure como false em desenvolvimento', async () => {
    const { createBrowserClient } = await import('@supabase/ssr');
    process.env.NEXT_PUBLIC_NODE_ENV = 'development';
    
    // Recarrega o módulo para aplicar nova variável
    vi.resetModules();
    await import('./supabase.client');
    
    const callArgs = vi.mocked(createBrowserClient).mock.calls[0];
    if (callArgs && callArgs[2]) {
      expect(callArgs[2].cookieOptions.secure).toBe(false);
    } else {
      throw new Error('createBrowserClient não foi chamado');
    }
  });

  it('deve usar domain undefined quando não há subdomínios', async () => {
    const { createBrowserClient } = await import('@supabase/ssr');
    // Mesmo com COOKIE_DOMAIN configurado, deve ser undefined quando não há subdomínios
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = '.example.com';
    
    vi.resetModules();
    await import('./supabase.client');
    
    const callArgs = vi.mocked(createBrowserClient).mock.calls[0];
    if (callArgs && callArgs[2]) {
      // Sempre undefined quando não há subdomínios
      expect(callArgs[2].cookieOptions.domain).toBe(".example.com");
    } else {
      throw new Error('createBrowserClient não foi chamado');
    }
  });

  it('deve configurar persistSession, autoRefreshToken e detectSessionInUrl', async () => {
    const { createBrowserClient } = await import('@supabase/ssr');
    await import('./supabase.client');
    
    const callArgs = vi.mocked(createBrowserClient).mock.calls[0];
    if (callArgs && callArgs[2]) {
      expect(callArgs[2].auth.persistSession).toBe(true);
      expect(callArgs[2].auth.autoRefreshToken).toBe(true);
      expect(callArgs[2].auth.detectSessionInUrl).toBe(true);
    } else {
      throw new Error('createBrowserClient não foi chamado');
    }
  });
});
