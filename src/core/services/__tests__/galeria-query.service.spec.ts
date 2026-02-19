// @/core/services/__tests__/galeria-query.service.spec.ts
import './setup-mocks';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGalerias,
  getGaleriaById,
  getGaleriaPhotos,
  getPublicProfileGalerias,
  getGaleriaLeads,
} from '../galeria.service';
import * as supabaseServer from '@/lib/supabase.server';
import * as authContext from '../auth-context.service';
import * as googleDriveService from '../google-drive.service';
import {
  setupEnvironment,
  createMockSupabase,
  mockUserId,
  mockProfile,
  mockGalleryBase,
} from './galeria.test-setup';

setupEnvironment();

describe('Galeria Service - Query Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: mockUserId,
      profile: mockProfile,
    });
    vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
      success: true,
      userId: mockUserId,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. getGalerias
  // =========================================================================
  describe('getGalerias', () => {
    it('deve retornar lista formatada de galerias do usuário', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      const mockRawGalerias = [
        {
          ...mockGalleryBase,
          id: 'gal-1',
          photographer: mockProfile,
          leads: [{ count: 5 }],
        },
        {
          ...mockGalleryBase,
          id: 'gal-2',
          photographer: mockProfile,
          leads: [{ count: 0 }],
        },
      ];

      mockQueryBuilder.order.mockResolvedValue({
        data: mockRawGalerias,
        error: null,
      });

      const result = await getGalerias();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('deve retornar erro quando usuário não está autenticado', async () => {
      vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
        success: false,
        error: 'Não autenticado',
      });

      const result = await getGalerias();

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.error).toContain('autenticado');
    });

    it('deve retornar AUTH_RECONNECT_REQUIRED em erro de sessão Google', async () => {
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

    it('deve retornar erro genérico em falha de rede', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.order.mockRejectedValue(new Error('Network Error'));

      const result = await getGalerias();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha ao buscar galerias.');
    });

    it('deve retornar array vazio quando usuário não tem galerias', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const result = await getGalerias();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // =========================================================================
  // 2. getGaleriaById
  // =========================================================================
  describe('getGaleriaById', () => {
    it('deve retornar galeria específica por ID', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.single.mockResolvedValue({
        data: { ...mockGalleryBase, photographer: mockProfile },
        error: null,
      });

      const result = await getGaleriaById('gal-123', mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('gal-123');
    });

    it('deve retornar erro quando galeria não existe', async () => {
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
      expect(result.data).toBeNull();
      expect(result.error).toBe('Galeria não encontrada.');
    });

    it('deve retornar erro amigável em exceção inesperada', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.single.mockRejectedValue(new Error('Unexpected crash'));

      const result = await getGaleriaById('gal-123', mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro');
    });

    it('deve isolar acesso por user_id (não retorna galeria de outro usuário)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      // Banco retorna null porque o RLS filtra por user_id
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

      const result = await getGaleriaById('gal-123', 'outro-user');

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. getGaleriaPhotos
  // =========================================================================
  describe('getGaleriaPhotos', () => {
    it('deve retornar fotos da galeria com drive_folder_id válido', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: 'folder-123' },
        error: null,
      });

      vi.mocked(googleDriveService.getFolderPhotos).mockResolvedValue({
        success: true,
        data: [
          { id: 'photo1', name: 'IMG_001.jpg' },
          { id: 'photo2', name: 'IMG_002.jpg' },
        ],
      });

      const result = await getGaleriaPhotos('gal-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('deve retornar array vazio quando pasta não tem fotos', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: 'folder-vazia' },
        error: null,
      });

      vi.mocked(googleDriveService.getFolderPhotos).mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await getGaleriaPhotos('gal-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('deve retornar erro quando drive_folder_id é nulo', async () => {
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

    it('deve retornar erro quando galeria não existe no banco', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getGaleriaPhotos('gal-inexistente');

      expect(result.success).toBe(false);
    });

    it('deve retornar erro NEXT_REDIRECT quando Drive retorna AUTH_RECONNECT_REQUIRED', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: 'folder-123' },
        error: null,
      });

      vi.mocked(googleDriveService.getFolderPhotos).mockResolvedValue({
        success: false,
        error: 'AUTH_RECONNECT_REQUIRED',
      });

      // O redirect() dentro do service lança um erro, mas o try/catch externo
      // de getGaleriaPhotos captura e retorna { success: false, error: error.message }
      // Portanto a promise resolve (não rejeita) com error: 'NEXT_REDIRECT'
      const result = await getGaleriaPhotos('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('NEXT_REDIRECT');
    });

    it('deve retornar erro de serviço quando getFolderPhotos falha com outro motivo', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { drive_folder_id: 'folder-123' },
        error: null,
      });

      vi.mocked(googleDriveService.getFolderPhotos).mockResolvedValue({
        success: false,
        error: 'Quota exceeded',
      });

      const result = await getGaleriaPhotos('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quota exceeded');
    });

    it('deve retornar erro se usuário não estiver autenticado', async () => {
      vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
        success: false,
        error: 'Não autenticado',
      });

      const result = await getGaleriaPhotos('gal-123');

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. getPublicProfileGalerias
  // =========================================================================
  describe('getPublicProfileGalerias', () => {
    it('deve retornar galerias públicas paginadas do perfil', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      // Primeira query: buscar profile ID pelo username
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: mockUserId },
        error: null,
      });

      // Segunda query: buscar galerias com paginação
      mockQueryBuilder.range.mockResolvedValue({
        data: [
          {
            ...mockGalleryBase,
            show_on_profile: true,
            photographer: mockProfile,
          },
        ],
        count: 1,
        error: null,
      });

      const result = await getPublicProfileGalerias('hitalo', 1, 12);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('deve retornar hasMore true quando há mais páginas', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: mockUserId },
        error: null,
      });

      const mockData = Array.from({ length: 12 }, (_, i) => ({
        ...mockGalleryBase,
        id: `gal-${i}`,
        photographer: mockProfile,
      }));

      mockQueryBuilder.range.mockResolvedValue({
        data: mockData,
        count: 30, // total > pageSize → hasMore = true
        error: null,
      });

      const result = await getPublicProfileGalerias('hitalo', 1, 12);

      expect(result.hasMore).toBe(true);
    });

    it('deve retornar falha quando perfil não existe', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });

      const result = await getPublicProfileGalerias('usuario-inexistente');

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
    });

    it('deve retornar falha em erro de banco na busca de galerias', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: mockUserId },
        error: null,
      });

      mockQueryBuilder.range.mockResolvedValue({
        data: null,
        count: null,
        error: { message: 'DB error' },
      });

      const result = await getPublicProfileGalerias('hitalo');

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 5. getGaleriaLeads
  // =========================================================================
  describe('getGaleriaLeads', () => {
    it('deve retornar leads para plano com permissão (PRO)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.order.mockResolvedValue({
        data: [
          {
            id: 'lead-1',
            name: 'João',
            email: 'joao@email.com',
            galeria_id: 'gal-123',
          },
        ],
        error: null,
      });

      const result = await getGaleriaLeads('gal-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('deve retornar UPGRADE_REQUIRED para plano FREE', async () => {
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: true,
        userId: mockUserId,
        profile: { ...mockProfile, plan_key: 'FREE' },
      });

      const result = await getGaleriaLeads('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('UPGRADE_REQUIRED');
    });

    it('deve retornar UPGRADE_REQUIRED para plano BASIC', async () => {
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: true,
        userId: mockUserId,
        profile: { ...mockProfile, plan_key: 'BASIC' },
      });

      const result = await getGaleriaLeads('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('UPGRADE_REQUIRED');
    });

    it('deve retornar erro quando usuário não está autenticado', async () => {
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: false,
        userId: null,
        profile: null,
      });

      const result = await getGaleriaLeads('gal-123');

      expect(result.success).toBe(false);
    });

    it('deve retornar lista vazia quando não há leads', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const result = await getGaleriaLeads('gal-sem-leads');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('deve retornar erro em falha de banco', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(
        supabaseServer.createSupabaseServerClientReadOnly,
      ).mockResolvedValue(mockSupabase as any);

      mockQueryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      const result = await getGaleriaLeads('gal-123');

      expect(result.success).toBe(false);
    });
  });
});
