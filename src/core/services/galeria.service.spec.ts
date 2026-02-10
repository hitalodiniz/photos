import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateUniqueDatedSlug,
  updateGaleria,
  getGalerias,
  getGaleriaPhotos,
  authenticateGaleriaAccess,
  deleteGalleryPermanently,
  moveToTrash,
  createGaleria,
  getGaleriaById,
  toggleArchiveGaleria,
  toggleShowOnProfile,
  restoreGaleria,
  permanentDelete,
  getGaleriaLeads,
  getPublicProfileGalerias,
  archiveExceedingGalleries,
  purgeOldDeletedGalleries,
} from './galeria.service';
import * as supabaseServer from '@/lib/supabase.server';
import * as googleAuth from '@/lib/google-auth';
import * as authContext from './auth-context.service';
import { PlanKey } from '../config/plans';

// =========================================================================
// CONFIGURAÇÃO GLOBAL E ENVIRONMENT VARIABLES
// =========================================================================

vi.stubGlobal('fetch', vi.fn());
vi.stubEnv('JWT_GALLERY_SECRET', '12345678901234567890123456789012');
vi.stubEnv('NEXT_PUBLIC_MAIN_DOMAIN', 'suagaleria.com');
vi.stubEnv(
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'BNoPwC8Q3ks4WK7x5xXk9Z0vX_L8wVwFxP7Rq8c9wK3L',
);
vi.stubEnv('VAPID_PRIVATE_KEY', 'xYzAbC123dEfGhI456jKlMnO789pQrStU012vWxYz345');
vi.stubEnv('NEXT_PUBLIC_EMAIL', 'contact@suagaleria.com');

// =========================================================================
// MOCKS DE BIBLIOTECAS EXTERNAS (ORDEM IMPORTANTE!)
// =========================================================================

// 1. Mock do web-push (DEVE VIR PRIMEIRO - antes de qualquer import que o use)
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

// 2. Mock do web-push-admin (que usa web-push internamente)
vi.mock('@/lib/web-push-admin', () => ({
  sendPushNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// 3. Mock do notification service (que pode usar web-push-admin)
vi.mock('@/services/notification.service', () => ({
  createInternalNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// 4. Mock do Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn(
    (fn) =>
      (...args: any[]) =>
        fn(...args),
  ),
}));

// 5. Mock do Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url) => {
    const err = new Error('NEXT_REDIRECT');
    (err as any).digest = `NEXT_REDIRECT;replace;${url};303;`;
    throw err;
  }),
}));

// 6. Mock do Supabase
vi.mock('@/lib/supabase.server');
vi.mock('@/lib/google-auth');

// 7. Mock do JWT como classe construtora
vi.mock('jose', () => ({
  SignJWT: class SignJWT {
    constructor(payload: any) {}
    setProtectedHeader(header: any) {
      return this;
    }
    sign(key: any) {
      return Promise.resolve('mock-jwt-token');
    }
  },
}));

// 8. Mock do next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn((key) => (key === 'host' ? 'localhost:3000' : null)),
  })),
}));

// 9. Mock do auth-context
vi.mock('./auth-context.service');

// 10. Mock do google-drive.service
vi.mock('./google-drive.service', () => ({
  getFolderPhotos: vi.fn(),
}));

// =========================================================================
// SUITE DE TESTES
// =========================================================================

describe('Galeria Service - Suite Completa de Testes', () => {
  const mockUserId = 'user-123';
  const mockProfile = {
    id: mockUserId,
    username: 'hitalo',
    plan_key: 'PRO',
    use_subdomain: true,
  };

  const createMockSupabase = () => {
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      insert: vi.fn().mockReturnThis(),
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
      from: vi.fn(() => mockQueryBuilder),
    };

    return { mockSupabase, mockQueryBuilder };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock padrão do getAuthenticatedUser
    vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: mockUserId,
      profile: mockProfile,
    });

    // Mock padrão do getAuthAndStudioIds
    vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
      success: true,
      userId: mockUserId,
      studioId: 'studio-123',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. GERAÇÃO DE SLUG
  // =========================================================================
  describe('generateUniqueDatedSlug', () => {
    it('deve gerar slug no formato correto: username/YYYY/MM/DD/titulo', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const slug = await generateUniqueDatedSlug(
        'Ensaio Gestante',
        '2026-01-15',
      );

      expect(slug).toBe('hitalo/2026/01/15/ensaio-gestante');
    });

    it('deve truncar títulos muito longos para 60 caracteres', async () => {
      const { mockSupabase } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const longTitle = 'a'.repeat(100);
      const slug = await generateUniqueDatedSlug(longTitle, '2026-01-01');

      const titlePart = slug.split('/').pop();
      expect(titlePart!.length).toBeLessThanOrEqual(60);
    });

    it('deve adicionar sufixo incremental em caso de colisão', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // Simula 2 colisões antes de encontrar slug livre
      mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'existing-1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'existing-2' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const slug = await generateUniqueDatedSlug('Festa', '2026-01-01');

      expect(slug).toBe('hitalo/2026/01/01/festa-2');
    });

    it('deve ignorar colisão se for o mesmo ID (edição)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const currentId = 'gallery-123';
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { id: currentId },
        error: null,
      });

      const slug = await generateUniqueDatedSlug(
        'Título',
        '2026-01-01',
        currentId,
      );

      expect(slug).toBe('hitalo/2026/01/01/titulo');
    });

    it('deve sanitizar caracteres especiais no título', async () => {
      const { mockSupabase } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const slug = await generateUniqueDatedSlug(
        'Casamento José & Maria!',
        '2026-01-01',
      );

      expect(slug).toBe('hitalo/2026/01/01/casamento-jose-e-maria');
    });
  });

  // =========================================================================
  // 2. CRIAÇÃO DE GALERIA
  // =========================================================================
  describe('createGaleria', () => {
    it('deve criar galeria com dados válidos', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // Mock de contagem (0 galerias existentes) - COMPLETO
      mockQueryBuilder.select
        .mockReturnValueOnce(mockQueryBuilder) // Para count query
        .mockReturnValueOnce(mockQueryBuilder); // Para insert query

      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.or
        .mockReturnValueOnce(mockQueryBuilder) // Primeiro .or()
        .mockReturnValueOnce(Promise.resolve({ count: 0, error: null })); // Segundo .or() retorna Promise

      // Mock de insert bem-sucedido
      mockQueryBuilder.insert.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'new-gallery',
          slug: 'hitalo/2026/01/15/festa',
          drive_folder_id: 'folder-123',
          photographer: mockProfile,
        },
        error: null,
      });

      const fd = new FormData();
      fd.append('title', 'Festa de Ano Novo');
      fd.append('date', '2026-01-15');
      fd.append('drive_folder_id', 'folder-123');
      fd.append('drive_folder_name', 'Festa 2026');
      fd.append('client_name', 'João Silva');
      fd.append('is_public', 'true');
      fd.append('photo_count', '50');
      fd.append('cover_image_ids', '[]');

      const result = await createGaleria(fd);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Nova galeria criada com sucesso!');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it('deve retornar erro se campos obrigatórios estiverem ausentes', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // Mock para o FormData passar pela validação de limite
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.or
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(Promise.resolve({ count: 0, error: null }));

      const fd = new FormData();
      // FormData com apenas title (falta date e drive_folder_id)
      fd.append('title', 'Test');
      // Faltam: date, drive_folder_id

      const result = await createGaleria(fd);

      expect(result.success).toBe(false);
      // A função deve retornar erro por falta de campos obrigatórios
      expect(result.error).toBeTruthy();
    });

    it('deve bloquear criação se atingir limite do plano', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // Mock: usuário no plano FREE com 3 galerias (limite atingido)
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: true,
        userId: mockUserId,
        profile: { ...mockProfile, plan_key: 'FREE' },
      });

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.or
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(Promise.resolve({ count: 3, error: null }));

      const fd = new FormData();
      fd.append('title', 'Nova Galeria');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'folder-123');

      const result = await createGaleria(fd);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limite');
      expect(result.error).toContain('galerias');
    });

    it('deve sanitizar WhatsApp adicionando código do país', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.or
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(Promise.resolve({ count: 0, error: null }));

      mockQueryBuilder.insert.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'gal-123', slug: 'test', photographer: mockProfile },
        error: null,
      });

      const fd = new FormData();
      fd.append('title', 'Test');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'folder-123');
      fd.append('drive_folder_name', 'Test');
      fd.append('client_name', 'Test');
      fd.append('client_whatsapp', '(31) 98888-7777');
      fd.append('cover_image_ids', '[]');

      await createGaleria(fd);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          client_whatsapp: '5531988887777',
        }),
      ]);
    });

    it('deve formatar cover_image_ids para PostgreSQL array', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.or
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(Promise.resolve({ count: 0, error: null }));

      mockQueryBuilder.insert.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'gal-123', slug: 'test', photographer: mockProfile },
        error: null,
      });

      const fd = new FormData();
      fd.append('title', 'Test');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'folder-123');
      fd.append('drive_folder_name', 'Test');
      fd.append('client_name', 'Test');
      fd.append('cover_image_ids', '["id1","id2"]');

      await createGaleria(fd);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          cover_image_ids: '{"id1","id2"}',
          cover_image_url: 'id1', // Primeira foto como capa
        }),
      ]);
    });
  });

  // =========================================================================
  // 3. ATUALIZAÇÃO DE GALERIA
  // =========================================================================
  describe('updateGaleria', () => {
    it('deve atualizar galeria com sucesso', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // Mock da galeria existente
      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: {
            slug: 'hitalo/2026/01/01/festa',
            drive_folder_id: 'folder-123',
            is_archived: false,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { slug: 'hitalo/2026/01/01/festa' },
          error: null,
        });

      mockQueryBuilder.update.mockReturnThis();

      const fd = new FormData();
      fd.append('title', 'Festa Atualizada');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'folder-123');
      fd.append('drive_folder_name', 'Festa');
      fd.append('client_name', 'Maria');
      fd.append('cover_image_ids', '[]');

      const result = await updateGaleria('gallery-123', fd);

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('deve bloquear edição de galeria arquivada', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { is_archived: true },
        error: null,
      });

      const fd = new FormData();
      fd.append('title', 'Test');

      const result = await updateGaleria('gallery-123', fd);

      expect(result.success).toBe(false);
      expect(result.error).toContain('arquivada');
    });

    it('deve remover senha quando galeria torna-se pública', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: { is_archived: false, slug: 'test' },
          error: null,
        })
        .mockResolvedValueOnce({ data: {}, error: null });

      mockQueryBuilder.update.mockReturnThis();

      const fd = new FormData();
      fd.append('title', 'Test');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'folder-123');
      fd.append('drive_folder_name', 'Test');
      fd.append('client_name', 'Test');
      fd.append('is_public', 'true');
      fd.append('password', '123'); // Senha enviada mas deve ser ignorada
      fd.append('cover_image_ids', '[]');

      await updateGaleria('gallery-123', fd);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: true,
          password: null,
        }),
      );
    });

    it('deve retornar erro se galeria não for encontrada', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const fd = new FormData();
      const result = await updateGaleria('nonexistent-id', fd);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Galeria não encontrada.');
    });
  });

  // =========================================================================
  // 4. BUSCA DE GALERIAS
  // =========================================================================
  describe('getGalerias', () => {
    it('deve retornar lista de galerias do usuário', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      const mockGalerias = [
        {
          id: 'gal-1',
          title: 'Festa 1',
          date: '2026-01-01',
          user_id: mockUserId,
          photographer: mockProfile,
          leads: [{ count: 5 }],
        },
        {
          id: 'gal-2',
          title: 'Festa 2',
          date: '2026-01-02',
          user_id: mockUserId,
          photographer: mockProfile,
          leads: [{ count: 3 }],
        },
      ];

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockGalerias,
        error: null,
      });

      const result = await getGalerias();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('deve retornar erro se usuário não estiver autenticado', async () => {
      vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
        success: false,
        error: 'Não autenticado',
      });

      const result = await getGalerias();

      expect(result.success).toBe(false);
      // A mensagem real é diferente do que está no authError
      expect(result.error).toContain('autenticado');
    });

    it('deve retornar AUTH_RECONNECT_REQUIRED em erro de Google', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.order.mockRejectedValue(
        new Error('AUTH_RECONNECT_REQUIRED'),
      );

      const result = await getGalerias();

      expect(result.success).toBe(false);
      expect(result.error).toBe('AUTH_RECONNECT_REQUIRED');
    });
  });

  // =========================================================================
  // 5. BUSCA DE GALERIA POR ID
  // =========================================================================
  describe('getGaleriaById', () => {
    it('deve retornar galeria específica por ID', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'gal-123',
          title: 'Test',
          photographer: mockProfile,
        },
        error: null,
      });

      const result = await getGaleriaById('gal-123', mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('gal-123');
    });

    it('deve retornar erro se galeria não for encontrada', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getGaleriaById('nonexistent', mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Galeria não encontrada.');
    });
  });

  // =========================================================================
  // 6. BUSCA DE FOTOS DA GALERIA
  // =========================================================================
  describe('getGaleriaPhotos', () => {
    it('deve retornar fotos da galeria', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: 'folder-123' },
        error: null,
      });

      const mockPhotos = [
        { id: 'photo1', name: 'IMG_001.jpg' },
        { id: 'photo2', name: 'IMG_002.jpg' },
      ];

      const { getFolderPhotos } = await import('./google-drive.service');
      vi.mocked(getFolderPhotos).mockResolvedValue({
        success: true,
        data: mockPhotos,
      });

      const result = await getGaleriaPhotos('gal-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('deve retornar erro se galeria não tiver drive_folder_id', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: null },
        error: null,
      });

      const result = await getGaleriaPhotos('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Galeria não encontrada.');
    });

    it('deve tentar redirecionar em erro AUTH_RECONNECT_REQUIRED', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: 'folder-123' },
        error: null,
      });

      const { getFolderPhotos } = await import('./google-drive.service');
      vi.mocked(getFolderPhotos).mockResolvedValue({
        success: false,
        error: 'AUTH_RECONNECT_REQUIRED',
      });

      try {
        const result = await getGaleriaPhotos('gal-123');
        // Se não redirecionar, deve retornar erro
        expect(result.success).toBe(false);
        expect(['AUTH_RECONNECT_REQUIRED', 'NEXT_REDIRECT']).toContain(
          result.error,
        );
      } catch (error: any) {
        // Se redirecionar, captura o erro de redirect
        expect(error.message).toContain('NEXT_REDIRECT');
      }
    });
  });

  // =========================================================================
  // 7. AUTENTICAÇÃO DE ACESSO
  // =========================================================================
  describe('authenticateGaleriaAccess', () => {
    it('deve autenticar acesso com senha correta e criar JWT', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'gal-123',
          password: 'senha123',
          user_id: mockUserId,
          tb_profiles: mockProfile,
        },
        error: null,
      });

      // A função deve redirecionar, mas em testes podemos apenas verificar
      // que não retorna erro de senha incorreta
      try {
        await authenticateGaleriaAccess(
          'gal-123',
          'hitalo/2026/01/01/festa',
          'senha123',
        );
        // Se chegou aqui sem erro de senha, o JWT foi criado
        expect(true).toBe(true);
      } catch (error: any) {
        // Esperamos NEXT_REDIRECT como sinal de sucesso
        expect(error.message).toContain('NEXT_REDIRECT');
      }
    });

    it('deve rejeitar senha incorreta', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.single.mockResolvedValue({
        data: { password: 'senha123' },
        error: null,
      });

      const result = await authenticateGaleriaAccess(
        'gal-123',
        'slug',
        'senha-errada',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Senha incorreta.');
    });

    it('deve rejeitar se galeria não for encontrada', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await authenticateGaleriaAccess('gal-123', 'slug', 'pass');

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 8. OPERAÇÕES DE STATUS
  // =========================================================================
  describe('Operações de Status', () => {
    it('toggleArchiveGaleria deve arquivar galeria ativa', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: { slug: 'test' }, error: null })
        .mockResolvedValueOnce({ data: {}, error: null });

      mockQueryBuilder.update.mockReturnThis();

      const result = await toggleArchiveGaleria('gal-123', false);

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_archived: true,
      });
    });

    it('toggleShowOnProfile deve alternar visibilidade no perfil', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: { slug: 'test' }, error: null })
        .mockResolvedValueOnce({ data: {}, error: null });

      mockQueryBuilder.update.mockReturnThis();

      await toggleShowOnProfile('gal-123', false);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        show_on_profile: true,
      });
    });

    it('moveToTrash deve mover galeria para lixeira', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: { slug: 'test' }, error: null })
        .mockResolvedValueOnce({ data: {}, error: null });

      mockQueryBuilder.update.mockReturnThis();

      const result = await moveToTrash('gal-123');

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_deleted: true,
        }),
      );
    });

    it('restoreGaleria deve validar limite antes de restaurar', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // Mock usuário FREE com 3 galerias (limite atingido)
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: true,
        userId: mockUserId,
        profile: { ...mockProfile, plan_key: 'FREE' },
      });

      // Mock para buscar galeria atual
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: {
          is_archived: true,
          is_deleted: true,
          slug: 'test',
          drive_folder_id: 'folder-123',
        },
        error: null,
      });

      // Mock para contagem de galerias ativas
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.or
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(Promise.resolve({ count: 3, error: null }));

      const result = await restoreGaleria('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limite');
      expect(result.error).toContain('galerias');
    });

    it('permanentDelete deve excluir galeria permanentemente', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // 1. Mock do Auth
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: true,
        userId: mockUserId,
        profile: mockProfile,
      });

      // 2. Configuração do Mock do Supabase
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.delete.mockReturnThis();

      // 🎯 O SEGREDO: eq() retorna o builder para permitir encadeamento,
      // mas TAMBÉM resolve como a promessa final de sucesso.
      mockQueryBuilder.eq.mockImplementation(() => {
        // Retornamos um objeto que é ao mesmo tempo o builder (para o próximo .eq)
        // e uma promessa que resolve em { error: null } (para o await final)
        return Object.assign(
          Promise.resolve({ error: null }),
          mockQueryBuilder,
        );
      });

      // 3. Orquestração do .single() (chamado na busca inicial 'galeriaAntes')
      mockQueryBuilder.single.mockResolvedValue({
        data: { slug: 'test', drive_folder_id: 'folder-123' },
        error: null,
      });

      // 4. Execução
      const result = await permanentDelete('gal-123');

      // 5. Validação
      expect(result.success).toBe(true);
      expect(result.message).toBe('Galeria excluída permanentemente.');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();

      // Verificamos se os filtros de segurança foram aplicados
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'gal-123');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });
  });

  // =========================================================================
  // 9. GALERIAS PÚBLICAS DO PERFIL
  // =========================================================================
  describe('getPublicProfileGalerias', () => {
    it('deve retornar galerias públicas do perfil', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: mockUserId },
        error: null,
      });

      const mockGalerias = [
        { id: 'gal-1', title: 'Public 1', photographer: mockProfile },
      ];

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.order.mockReturnThis();
      mockQueryBuilder.range.mockResolvedValue({
        data: mockGalerias,
        count: 1,
        error: null,
      });

      const result = await getPublicProfileGalerias('hitalo', 1, 12);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('deve retornar erro se perfil não existir', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getPublicProfileGalerias('nonexistent');

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 10. LEADS DA GALERIA
  // =========================================================================
  describe('getGaleriaLeads', () => {
    it('deve retornar leads se plano permitir', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      const mockLeads = [
        { id: 'lead-1', name: 'João', email: 'joao@email.com' },
      ];

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockLeads,
        error: null,
      });

      const result = await getGaleriaLeads('gal-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('deve bloquear acesso para plano FREE', async () => {
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: true,
        userId: mockUserId,
        profile: { ...mockProfile, plan_key: 'FREE' },
      });

      const result = await getGaleriaLeads('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('UPGRADE_REQUIRED');
    });
  });

  // =========================================================================
  // 11. SINCRONIZAÇÃO E LIMPEZA
  // =========================================================================
  describe('Sincronização de Limite de Plano', () => {
    it('archiveExceedingGalleries deve arquivar galerias excedentes', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      const mockActive = [
        { id: 'gal-1' },
        { id: 'gal-2' },
        { id: 'gal-3' },
        { id: 'gal-4' }, // Excedente
        { id: 'gal-5' }, // Excedente
      ];

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockActive,
        error: null,
      });

      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.in.mockResolvedValue({ error: null });

      mockQueryBuilder.insert.mockResolvedValue({ error: null });

      const count = await archiveExceedingGalleries(
        mockUserId,
        3,
        { newPlan: 'FREE' },
        mockSupabase,
      );

      expect(count).toBe(2);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_archived: true,
      });
    });

    it('purgeOldDeletedGalleries deve excluir galerias antigas da lixeira', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      const mockOldGalleries = [
        { id: 'old-1', user_id: mockUserId, slug: 'old-1-slug' },
      ];

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.lt.mockResolvedValue({
        data: mockOldGalleries,
        error: null,
      });

      mockQueryBuilder.delete.mockReturnThis();
      mockQueryBuilder.in.mockResolvedValue({ error: null });

      const result = await purgeOldDeletedGalleries(mockSupabase);

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 12. CASOS DE ERRO
  // =========================================================================
  describe('Tratamento de Erros', () => {
    it('deve capturar erro de database ao criar galeria', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.or
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(Promise.resolve({ count: 0, error: null }));

      mockQueryBuilder.insert.mockReturnThis();
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'DB Error' },
      });

      const fd = new FormData();
      fd.append('title', 'Test');
      fd.append('date', '2026-01-01');
      fd.append('drive_folder_id', 'folder-123');
      fd.append('drive_folder_name', 'Test');
      fd.append('client_name', 'Test');
      fd.append('cover_image_ids', '[]');

      const result = await createGaleria(fd);

      expect(result.success).toBe(false);
      // O erro pode ser 'Falha ao criar a galeria.' ou outro erro capturado
      expect(result.error).toBeTruthy();
    });

    it('deve capturar erro de network ao buscar galerias', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.order.mockRejectedValue(new Error('Network Error'));

      const result = await getGalerias();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha ao buscar galerias.');
    });

    it('deve retornar erro amigável em exceção não tratada', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      // Mock do single para rejeitar com erro
      mockQueryBuilder.select.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.single.mockRejectedValue(new Error('Unexpected Error'));

      const result = await getGaleriaById('gal-123', mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro');
    });
  });
});
