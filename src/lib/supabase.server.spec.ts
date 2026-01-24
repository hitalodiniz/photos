/**
 * ⚠️ CRÍTICO: Testes para cliente Supabase do servidor
 * Estes testes validam gerenciamento de cookies no servidor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Mocks
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Importa após os mocks usando importOriginal para manter exports reais
vi.mock('./supabase.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./supabase.server')>();
  return {
    ...actual,
  };
});

describe('supabase.server', () => {
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NODE_ENV = 'development';
    
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  });

  describe('createSupabaseServerClient', () => {
    it('deve criar cliente com configuração de cookies completa', async () => {
      const { createSupabaseServerClient } = await import('./supabase.server');
      await createSupabaseServerClient();
      
      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: {
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          },
        }),
      );
    });

    it('deve manter maxAge e expires em desenvolvimento', async () => {
      const { createSupabaseServerClient } = await import('./supabase.server');
      process.env.NODE_ENV = 'development';
      vi.resetModules();
      
      await createSupabaseServerClient();
      
      const callArgs = vi.mocked(createServerClient).mock.calls[0];
      if (callArgs && callArgs[2] && callArgs[2].cookies) {
        const setAll = callArgs[2].cookies.setAll;
        
        const options = { maxAge: 3600, expires: new Date() };
        setAll([{ name: 'test', value: 'value', options }]);
        
        // Em dev, deve manter as opções (ou pelo menos passar para o store)
        expect(mockCookieStore.set).toHaveBeenCalledWith(
          'test',
          'value',
          expect.objectContaining(options),
        );
      }
    });

    it('deve remover maxAge e expires em produção', async () => {
      const { createSupabaseServerClient } = await import('./supabase.server');
      process.env.NODE_ENV = 'production';
      vi.resetModules();
      
      await createSupabaseServerClient();
      
      const callArgs = vi.mocked(createServerClient).mock.calls[0];
      if (callArgs && callArgs[2] && callArgs[2].cookies) {
        const setAll = callArgs[2].cookies.setAll;
        
        const options = { maxAge: 3600, expires: new Date() };
        setAll([{ name: 'test', value: 'value', options }]);
        
        // Em produção, deve remover maxAge e expires
        const setCall = mockCookieStore.set.mock.calls[0];
        expect(setCall[2]).not.toHaveProperty('maxAge');
        expect(setCall[2]).not.toHaveProperty('expires');
      }
    });
  });

  describe('createSupabaseServerClientReadOnly', () => {
    it('deve criar cliente read-only sem capacidade de escrever cookies', async () => {
      const { createSupabaseServerClientReadOnly } = await import('./supabase.server');
      await createSupabaseServerClientReadOnly();
      
      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: {
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          },
        }),
      );
      
      const callArgs = vi.mocked(createServerClient).mock.calls[0];
      if (callArgs && callArgs[2] && callArgs[2].cookies) {
        const setAll = callArgs[2].cookies.setAll;
        
        // setAll deve ser no-op
        setAll([{ name: 'test', value: 'value', options: {} }]);
        
        // Não deve chamar cookieStore.set
        expect(mockCookieStore.set).not.toHaveBeenCalled();
      }
    });
  });

  describe('createSupabaseClientForCache', () => {
    it('deve criar cliente simples sem cookies', async () => {
      const { createSupabaseClientForCache } = await import('./supabase.server');
      createSupabaseClientForCache();
      
      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
      );
    });

    it('não deve usar cookies do Next.js', async () => {
      const { createSupabaseClientForCache } = await import('./supabase.server');
      createSupabaseClientForCache();
      
      expect(cookies).not.toHaveBeenCalled();
      expect(createServerClient).not.toHaveBeenCalled();
    });
  });
});
