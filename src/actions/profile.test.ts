import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProfileData, upsertProfile } from './profile';
import { revalidatePath } from 'next/cache';

// Mock do revalidatePath (único que ainda precisa de vi.mock por ser externo)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Profile Actions (Injeção de Dependência)', () => {
  // Criamos um mock robusto que simula o comportamento do Supabase
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
    // Suporte para o await na query final (Thenable)
    then: vi
      .fn()
      .mockImplementation((resolve) => resolve({ data: [], error: null })),
  });

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  // =========================================================================
  // TESTES DE BUSCA (getProfileData)
  // =========================================================================
  describe('getProfileData', () => {
    it('deve retornar dados do perfil e sugerir username baseado no email', async () => {
      const result = await getProfileData(mockSupabase);

      expect(result.success).toBe(true);
      expect(result.user_id).toBe('user_123');
      expect(result.profile?.username).toBe('hitalo');
      // Verifica se a lógica de sugestão de username (utilitário) foi disparada
      expect(result.suggestedUsername).toBeDefined();
    });

    it('deve retornar erro quando o usuário não está autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Sessão expirada' },
      });

      const result = await getProfileData(mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuário não autenticado.');
    });
  });

  // =========================================================================
  // TESTES DE SALVAMENTO (upsertProfile)
  // =========================================================================
  describe('upsertProfile', () => {
    it('deve sanitizar o username e processar o array de cidades', async () => {
      const formData = new FormData();
      formData.append('username', '  HitaloDiniz  '); // Entrada suja
      formData.append('full_name', 'Hitalo Diniz');
      formData.append(
        'operating_cities_json',
        JSON.stringify(['Belo Horizonte', 'Contagem']),
      );

      const result = await upsertProfile(formData, mockSupabase);

      expect(result.success).toBe(true);

      // Verifica se o update recebeu os dados "limpos"
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'hitalodiniz', // Verificando o lowercase e trim
          operating_cities: ['Belo Horizonte', 'Contagem'],
        }),
      );

      // Verifica se as revalidações de cache foram chamadas
      expect(revalidatePath).toHaveBeenCalledWith('/hitalodiniz');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('deve processar o upload de imagem corretamente', async () => {
      // Adicionamos um conteúdo (ex: 'fake-image-content') para o size ser > 0
      const file = new File(['fake-image-content'], 'avatar.png', {
        type: 'image/png',
      });

      const formData = new FormData();
      formData.append('username', 'hitalo');
      formData.append('full_name', 'Hitalo');
      formData.append('profile_picture_file', file);

      const result = await upsertProfile(formData, mockSupabase);

      expect(result.success).toBe(true);

      // Agora o size > 0, então estas chamadas devem ocorrer:
      expect(mockSupabase.storage.from).toHaveBeenCalledWith(
        'profile_pictures',
      );
      expect(mockSupabase.storage.upload).toHaveBeenCalled();

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_picture_url: 'http://foto.com/avatar.jpg',
        }),
      );
    });

    it('deve retornar erro se campos obrigatórios estiverem ausentes', async () => {
      const formData = new FormData();
      formData.append('full_name', 'Hitalo');
      // Username faltando propositalmente

      const result = await upsertProfile(formData, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toContain('obrigatórios');
    });
  });
});
