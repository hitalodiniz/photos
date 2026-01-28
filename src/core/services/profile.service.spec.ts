import { describe, it, expect, vi, beforeEach } from 'vitest';

// 🎯 1. Definição de Variáveis de Mock (Prefixo 'mock' obrigatório para hoisting)
const mockSignOut = vi.fn().mockResolvedValue({ error: null });

vi.mock('react', () => ({
  cache: vi.fn((fn) => fn),
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServerClientReadOnly: vi.fn(),
  createSupabaseClientForCache: vi.fn(),
}));

// 2. Importações após os mocks
import {
  getProfileData,
  upsertProfile,
  signOut,
} from './profile.service';
import {
  createSupabaseServerClient,
  createSupabaseClientForCache,
} from '@/lib/supabase.server';

describe('Profile Service (Cobertura 100%)', () => {
  // Helper para criar a cadeia do Supabase
  const createMockSupabase = () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u123', email: 't@t.com' } },
          error: null,
        }),
        signOut: mockSignOut,
      },
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'http://url.com' } }),
      },
    };
    // Garante que a cadeia de promessas funcione no await
    (chain.eq as any).then = vi
      .fn()
      .mockImplementation((res) => res({ data: {}, error: null }));
    return chain;
  };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as any,
    );
    vi.mocked(createSupabaseClientForCache).mockReturnValue(
      mockSupabase as any,
    );
  });

  it('deve retornar erro na linha 23 quando auth falha', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Erro' },
    });
    const res = await getProfileData(mockSupabase);
    expect(res.success).toBe(false);
  });

  /* it('deve validar erro de arquivo > 5MB', async () => {
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    const fd = new FormData();
    fd.append('username', 'hitalo');
    fd.append('full_name', 'Hitalo');
    fd.append('profile_picture', bigFile);

    const result = await upsertProfile(fd, mockSupabase);
    expect(result.success).toBe(false);
    expect(result.error).toContain('5MB');
  });*/

  it('deve capturar erro de JSON na linha 94', async () => {
    const fd = new FormData();
    fd.append('username', 'hitalo');
    fd.append('full_name', 'Hitalo');
    fd.append('operating_cities', '{invalid}');
    const result = await upsertProfile(fd, mockSupabase);
    expect(result.success).toBe(true);
  });

  it('deve retornar erro de username duplicado (erro 23505)', async () => {
    const fd = new FormData();
    fd.append('username', 'dup');
    fd.append('full_name', 'Hitalo');
    mockSupabase.eq.mockResolvedValueOnce({ error: { code: '23505' } });
    const result = await upsertProfile(fd, mockSupabase);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Username já está em uso.');
  });

  it('deve cobrir signOut nas linhas 170-171', async () => {
    await signOut();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
