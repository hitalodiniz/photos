import { describe, it, expect, vi, beforeEach, vi } from 'vitest';
import {
  generateUniqueDatedSlug,
  createGaleria,
  updateGaleria,
  getGalerias,
  deleteGaleria,
  getGaleriaPhotos,
  authenticateGaleriaAccess,
} from './galeria.service';
import * as supabaseServer from '@/lib/supabase.server';
import * as googleAuth from '@/lib/google-auth';
import * as googleDrive from '@/lib/google-drive';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as googleService from '@/core/services/google.service';
// Garante que o fetch global seja um mock do Vitest
vi.stubGlobal('fetch', vi.fn());

// =========================================================================
// MOCKS DE DEPENDÊNCIAS
// =========================================================================

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServerClientReadOnly: vi.fn(),
}));
vi.mock('@/lib/google-auth');
vi.mock('@/lib/google-drive');

describe('Galeria Service - Testes Integrados', () => {
  const mockUserId = 'user_hitalo';
  const mockStudioId = 'studio_123';
  const mockProfile = {
    studio_id: mockStudioId,
    username: 'hitalodiniz',
    use_subdomain: false,
  };

  // Helper para resetar e configurar o encadeamento do Supabase
  const setupSupabaseMock = (
    profileData: any = mockProfile,
    existingSlugData: any = null,
  ) => {
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profileData, error: null }),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: existingSlugData, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
      mockSupabase as any,
    );
    vi.mocked(
      supabaseServer.createSupabaseServerClientReadOnly,
    ).mockResolvedValue(mockSupabase as any);

    return { mockSupabase, mockQueryBuilder };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. TESTES DE SLUG
  // =========================================================================
  describe('generateUniqueDatedSlug', () => {
    it('deve gerar slug único incluindo username e data', async () => {
      setupSupabaseMock();
      const slug = await generateUniqueDatedSlug(
        'Ensaio Gestante',
        '2026-01-10',
      );
      expect(slug).toBe('hitalodiniz/2026/01/10/ensaio-gestante');
    });

    it('deve resolver colisão adicionando sufixo incremental', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'original' } }) // Simula que já existe
        .mockResolvedValueOnce({ data: null }); // Simula que o próximo está livre

      const slug = await generateUniqueDatedSlug('Festa', '2026-01-01');
      expect(slug).toBe('hitalodiniz/2026/01/01/festa-1');
    });
  });

  // =========================================================================
  // 2. TESTES DE MUTAÇÃO (CREATE/UPDATE/DELETE)
  // =========================================================================
  describe('Mutações', () => {
    it('createGaleria deve sanitizar WhatsApp e salvar dados', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      const fd = new FormData();
      fd.append('title', 'Teste');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'folder_123');
      fd.append('client_whatsapp', '(31) 98888-7777');

      const result = await createGaleria(fd);

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          client_whatsapp: '31988887777',
        }),
      );
    });

    it('updateGaleria deve remover senha se galeria for alterada para pública', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      const fd = new FormData();
      fd.append('title', 'Update');
      fd.append('drive_folder_id', 'id');
      fd.append('clientName', 'Joao');
      fd.append('date', '2026-01-01');
      fd.append('is_public', 'true');
      fd.append('password', 'senha123'); // Deve ser anulada

      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)
        .mockResolvedValue({ error: null });

      await updateGaleria('gal_123', fd);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password: null,
        }),
      );
    });

    it('deleteGaleria deve validar usuário e revalidar cache', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder) // mock do getUser/profile
        .mockReturnValueOnce(mockQueryBuilder) // mock delete id
        .mockResolvedValue({ error: null }); // mock delete user_id

      const result = await deleteGaleria('gal_123');

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    });
  });

  // =========================================================================
  // 3. TESTES DE BUSCA E ACESSO
  // =========================================================================
  describe('Busca e Integração Drive', () => {
    /*it('getGalerias deve retornar lista formatada', async () => {
      // 1. Mock do Service de Google para evitar que ele tente bater na API real
      vi.spyOn(googleService, 'getValidGoogleTokenService').mockResolvedValue(
        'token-fake',
      );

      // 2. Mock do Fetch Global
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: [
            { id: '1', name: 'Galeria Casamento', webViewLink: 'link-google' },
          ],
        }),
      } as Response);

      const result = await getGalerias();

      expect(result.success).toBe(true);
      expect(result.data?.[0].title).toBe('Galeria Casamento');
    });
    */
    it('getGaleriaPhotos deve ordenar fotos por data decrescente', async () => {
      const { mockQueryBuilder, mockSupabase } = setupSupabaseMock();

      // 🎯 CONFIGURAÇÃO SEQUENCIAL DOS MOCKS
      // 1ª chamada (dentro de getAuthAndStudioIds): Busca o studio_id
      // 2ª chamada (dentro de getGaleriaPhotos): Busca o drive_folder_id
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { studio_id: 'studio_123' },
        error: null,
      });

      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { drive_folder_id: 'folder_abc' },
        error: null,
      });

      // Mock do Token do Google
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token_valido',
      );

      // Mock das Fotos do Drive
      const mockPhotos = [
        { name: 'Antiga', createdTime: '2025-01-01T10:00:00Z' },
        { name: 'Nova', createdTime: '2026-01-01T10:00:00Z' },
      ];
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        mockPhotos as any,
      );

      // Execução
      const res = await getGaleriaPhotos('gal_123');

      // Assertions
      if (!res.success) console.error('Erro retornado pela função:', res.error);

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(res.data![0].name).toBe('Nova'); // Mais recente primeiro
      expect(res.data![1].name).toBe('Antiga');
    });
    it('authenticateGaleriaAccess deve redirecionar se senha estiver correta', async () => {
      setupSupabaseMock({
        password: '123',
        user_id: 'u1',
        tb_profiles: { username: 'hitalo' },
      });

      await authenticateGaleriaAccess('id', 'hitalo/slug', '123');

      expect(redirect).toHaveBeenCalled();
    });
  });

  describe('Galeria Service - Casos de Erro Restantes', () => {
    it('deve retornar erro se o perfil do usuário não for encontrado no getAuth (Linhas de erro iniciais)', async () => {
      const { mockQueryBuilder, mockSupabase } = setupSupabaseMock(); // Simula erro ao buscar profile no getAuthAndStudioIds
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Profile not found' },
      });

      const result = await getGalerias(mockSupabase);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Profile do usuário não encontrado');
    });

    it('deve capturar erro genérico no catch do createGaleria', async () => {
      const { mockSupabase, mockQueryBuilder } = setupSupabaseMock();

      // Em vez de throw síncrono, simulamos uma rejeição na Promise do banco
      // Isso garante que o fluxo entre no bloco 'catch' da sua função async
      mockQueryBuilder.insert.mockRejectedValue(new Error('Erro de Conexão'));

      const fd = new FormData();
      fd.append('title', 'Teste Erro');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'id_folder');

      // Execução
      const result = await createGaleria(fd);

      // Verificações
      expect(result.success).toBe(false);
      // Ajuste a mensagem abaixo para bater exatamente com o que está no seu 'catch'
      expect(result.error).toBe('Erro interno ao salvar no banco de dados.');
    });

    it('deve retornar erro se a galeria não tiver drive_folder_id no getGaleriaPhotos', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      // Simula galeria sem ID de pasta
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { studio_id: '1' },
      }); // Auth
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { drive_folder_id: null },
      }); // Galeria

      const result = await getGaleriaPhotos('id');
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Galeria não encontrada ou pasta do Drive não definida.',
      );
    });

    it('deve retornar erro genérico se delete falhar criticamente', async () => {
      const { mockQueryBuilder } = setupSupabaseMock();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.delete.mockRejectedValue(new Error('Database Down'));

      const result = await deleteGaleria('123');
      expect(result.success).toBe(false);
    });
  });
});
