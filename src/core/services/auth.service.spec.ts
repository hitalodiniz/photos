import { describe, it, expect, vi } from 'vitest';
import { authService } from '@/core/services/auth.service';
import { supabase } from '@/lib/supabase.client';

// Mock do cliente Supabase para não fazer chamadas reais à rede
vi.mock('@/lib/supabase.client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('AuthService', () => {
  it('deve retornar a sessão quando o usuário estiver logado', async () => {
    const mockSession = { user: { id: '123', email: 'teste@exemplo.com' } };

    // Configura o comportamento do mock
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const session = await authService.getSession();

    expect(session?.user.id).toBe('123');
    expect(session?.user.email).toBe('teste@exemplo.com');
  });

  it('deve chamar o signOut corretamente ao fazer logout', async () => {
    await authService.signOut();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
