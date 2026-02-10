import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';
import { supabase } from '@/lib/supabase.client';

// 1. Configuração de Ambiente
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';

// 2. Mocks Avançados
// No topo do arquivo, fora de qualquer describe
vi.mock('@/lib/supabase.client', () => {
  const mockAuth = {
    signInWithOAuth: vi
      .fn()
      .mockResolvedValue({ data: { url: 'http://test.com' }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    refreshSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };
  return {
    supabase: {
      auth: mockAuth,
      from: vi.fn().mockReturnThis() /* ... outros */,
    },
  };
});

// Mock para evitar erros de URL no signInWithGoogle
vi.mock('@/lib/get-base-url', () => ({
  getBaseUrl: () => 'http://localhost:3000',
}));

describe('AuthService (Cobertura Total 100%)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 🎯 Reset total do Singleton Global para isolamento de testes
    const GLOBAL_CACHE_KEY = '___PHOTOS_AUTH_CACHE___';
    if ((globalThis as any)[GLOBAL_CACHE_KEY]) {
      (globalThis as any)[GLOBAL_CACHE_KEY].sessionPromise = null;
      (globalThis as any)[GLOBAL_CACHE_KEY].refreshPromise = null;
      (globalThis as any)[GLOBAL_CACHE_KEY].profileCache.clear();
      (globalThis as any)[GLOBAL_CACHE_KEY].lastRefreshTime = 0;
    }
  });

  describe('getSession()', () => {
    it('deve retornar null em caso de erro no Supabase', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Network error' },
      } as any);
      const session = await authService.getSession();
      expect(session).toBeNull();
    });

    it('deve lidar com exceção lançada (catch block)', async () => {
      vi.mocked(supabase.auth.getSession).mockRejectedValueOnce(
        new Error('Fatal'),
      );
      const session = await authService.getSession();
      expect(session).toBeNull();
    });

    it('deve disparar refreshSession se a sessão expirar em menos de 5 minutos', async () => {
      const futureDate = Math.floor(Date.now() / 1000) + 100; // expira em 100s
      const mockSession = { expires_at: futureDate, access_token: 'old' };
      const newSession = { expires_at: futureDate + 3600, access_token: 'new' };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      } as any);
      vi.spyOn(authService, 'refreshSession').mockResolvedValueOnce({
        data: { session: newSession },
        error: null,
      } as any);

      const session = await authService.getSession();
      expect(authService.refreshSession).toHaveBeenCalled();
      expect(session?.access_token).toBe('new');
    });
  });

  describe('refreshSession()', () => {
    it('deve respeitar a trava de 10 segundos (throttle)', async () => {
      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      await authService.refreshSession(); // Primeira chamada ok
      const result = await authService.refreshSession(); // Segunda bloqueada pela trava de tempo

      expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
      expect(result.data.session).toBeNull();
    });

    it('deve deslogar o usuário se o refresh_token for inválido', async () => {
      // Forçamos o tempo a avançar para ignorar o throttle
      const GLOBAL_CACHE_KEY = '___PHOTOS_AUTH_CACHE___';
      (globalThis as any)[GLOBAL_CACHE_KEY].lastRefreshTime = 0;

      vi.mocked(supabase.auth.refreshSession).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'refresh_token_not_found' },
      } as any);

      await authService.refreshSession();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('getProfile()', () => {
    const mockUserId = 'user-abc';

    it('deve retornar null se userId não for fornecido', async () => {
      expect(await authService.getProfile('')).toBeNull();
    });

    it('deve usar cache para chamadas subsequentes ao mesmo perfil', async () => {
      const mockData = { profile_picture_url: 'url' };
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
      } as any);

      await authService.getProfile(mockUserId);
      await authService.getProfile(mockUserId);

      expect(mockSingle).toHaveBeenCalledTimes(1);
    });

    it('deve lidar com erro 429 (Rate Limit) e limpar cache após 5s', async () => {
      vi.useFakeTimers();
      const mockSingle = vi.fn().mockRejectedValue({ status: 429 });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
      } as any);

      const result = await authService.getProfile(mockUserId);
      expect(result).toBeNull();

      // Avança o tempo
      vi.advanceTimersByTime(5001);
      // Tenta de novo, deve chamar o Supabase novamente
      await authService.getProfile(mockUserId);
      expect(mockSingle).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('deve remover do cache e retornar null em outros erros', async () => {
      const mockSingle = vi.fn().mockRejectedValue({ status: 500 });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
      } as any);

      await authService.getProfile(mockUserId);
      // Segunda tentativa deve forçar nova chamada por causa do delete no catch
      await authService.getProfile(mockUserId);
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });
  });

  describe('signInWithGoogle()', () => {
    it('deve forçar prompt "consent" quando forceConsent é true', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { url: 'http://google.com' },
        error: null,
      } as any);

      await authService.signInWithGoogle(true);

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            queryParams: expect.objectContaining({ prompt: 'consent' }),
          }),
        }),
      );
    });

    it('deve usar "select_account" por padrão e não quebrar no destructuring', async () => {
      // Garantimos que o mock retorne o formato esperado
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { url: 'http://google.com' },
        error: null,
      } as any);

      const result = await authService.signInWithGoogle(false);

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            queryParams: expect.objectContaining({ prompt: 'select_account' }),
          }),
        }),
      );
      expect(result?.url).toBe('http://google.com');
    });

    it('deve lançar erro se o Supabase falhar', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        error: { message: 'OAuth Error' },
      } as any);
      await expect(authService.signInWithGoogle()).rejects.toThrow(
        'OAuth Error',
      );
    });
  });
});
