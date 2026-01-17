import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProfileData,
  upsertProfile,
  getPublicProfile,
  getAvatarUrl,
  signOutServer,
} from './profile.service';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  createSupabaseServerClient,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';

// 1. Mocks de Cache e Supabase
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const mockSignOut = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { signOut: () => mockSignOut(), getUser: vi.fn() },
    from: vi.fn().mockReturnThis(),
    storage: { from: vi.fn() },
  }),
  createSupabaseServerClientReadOnly: vi.fn().mockResolvedValue({}),
  createSupabaseClientForCache: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }),
}));

describe('Profile Service (Cobertura 100%)', () => {
  const createMockSupabase = () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user_123', email: 'teste@fotos.com' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: 'user_123',
        username: 'hitalo',
        full_name: 'Hitalo Diniz',
        profile_picture_url: 'pic.jpg',
      },
      error: null,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: 'user_123', username: 'hitalo', full_name: 'Hitalo Diniz' },
      error: null,
    }),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: 'http://foto.com/avatar.jpg' } }),
    },
  });

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  // --- BUSCA PRIVADA ---
  describe('getProfileData', () => {
    it('deve retornar erro na linha 23 quando auth falha', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Erro' },
      });
      const result = await getProfileData(mockSupabase);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuário não autenticado.');
    });
  });

  // --- BUSCAS PÚBLICAS ---
  describe('Buscas Públicas', () => {
    it('deve cobrir linha 53 quando getPublicProfile não encontra nada', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'NotFound' },
      });
      const result = await getPublicProfile('user', mockSupabase);
      expect(result).toBeNull();
    });

    it('deve cobrir linha 74 quando getAvatarUrl falha', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB Error' },
      });
      const url = await getAvatarUrl('123', mockSupabase);
      expect(url).toBeNull();
    });
  });

  // --- ESCRITA (UPSERT) ---
  describe('upsertProfile', () => {
    it('deve capturar erro de JSON na linha 94 (operating_cities)', async () => {
      const fd = new FormData();
      fd.append('username', 'hitalo');
      fd.append('full_name', 'Hitalo');
      fd.append('operating_cities', '{invalid-json}');

      const result = await upsertProfile(fd, mockSupabase);
      expect(result.success).toBe(true); // O catch apenas loga o erro
    });

    it('deve validar erro de arquivo > 5MB', async () => {
      const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.png', {
        type: 'image/png',
      });
      const fd = new FormData();
      fd.append('username', 'hitalo');
      fd.append('full_name', 'Hitalo');
      fd.append('profile_picture', bigFile);

      const result = await upsertProfile(fd, mockSupabase);
      expect(result.success).toBe(false);
      expect(result.error).toContain('5MB');
    });

    it('deve processar upload de background_image e revalidar cache', async () => {
      const file = new File([''], 'bg.png', { type: 'image/png' });
      const fd = new FormData();
      fd.append('username', 'hitalo');
      fd.append('full_name', 'Hitalo');
      fd.append('background_image', file);

      const result = await upsertProfile(fd, mockSupabase);

      expect(result.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('profile-hitalo');
      expect(revalidatePath).toHaveBeenCalledWith('/hitalo');
    });

    it('deve retornar erro de username duplicado (erro 23505)', async () => {
      const fd = new FormData();
      fd.append('username', 'jaexiste');
      fd.append('full_name', 'Hitalo');

      mockSupabase.update.mockResolvedValueOnce({ error: { code: '23505' } });

      const result = await upsertProfile(fd, mockSupabase);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username já está em uso.');
    });
  });

  // --- OUTROS ---
  it('deve cobrir signOutServer nas linhas 170-171', async () => {
    // Mock do cliente interno para signOut
    const internalMock = { auth: { signOut: mockSignOut } };
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce(
      internalMock as any,
    );

    await signOutServer();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
