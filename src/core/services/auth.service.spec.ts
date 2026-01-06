import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 1. Configuração de ambiente (Top-level)
 * Definido antes das importações para evitar "TypeError: Invalid URL" no client.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL =
  'https://bdgqiyvasucvhihaueuk.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';

/**
 * 2. Mock do Módulo
 * Unificamos 'supabase' e 'createSupabaseBrowserClient' em um único bloco.
 */
vi.mock('@/lib/supabase.client', () => {
  const mockAuth = {
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };

  return {
    // Exportação do objeto estático 'supabase'
    supabase: {
      auth: mockAuth,
    },
    // Exportação da função factory (caso use as duas abordagens)
    createSupabaseBrowserClient: vi.fn(() => ({
      auth: mockAuth,
    })),
  };
});

// 3. Importações após os mocks
import { authService } from './auth.service';
import { supabase, createSupabaseBrowserClient } from '@/lib/supabase.client';

describe('AuthService (Browser)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve chamar signInWithGoogle com o provedor correto', async () => {
    await authService.signInWithGoogle();

    // Verificamos através da instância importada
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
      }),
    );
  });

  it('deve retornar a sessão quando o usuário estiver logado', async () => {
    const mockSession = { user: { id: '123', email: 'teste@exemplo.com' } };

    // Usamos vi.mocked para tipagem correta ao alterar o valor em runtime
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    } as any);

    const session = await authService.getSession();

    expect(session?.user.id).toBe('123');
    expect(session?.user.email).toBe('teste@exemplo.com');
  });

  it('deve chamar o signOut corretamente ao fazer logout', async () => {
    await authService.signOut();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('deve registrar um listener de mudança de estado (onAuthStateChange)', () => {
    const callback = vi.fn();
    authService.onAuthStateChange(callback);

    // Isso evita o erro de mismatch entre Mock e Anonymous function
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });
});
