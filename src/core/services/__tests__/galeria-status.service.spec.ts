// @/core/services/__tests__/galeria-status.service.spec.ts
import './setup-mocks';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toggleArchiveGaleria,
  toggleShowOnProfile,
  moveToTrash,
  restoreGaleria,
  permanentDelete,
} from '../galeria.service';
import * as supabaseServer from '@/lib/supabase.server';
import * as authContext from '../auth-context.service';
import * as limitHelper from '@/core/utils/galeria-limit.helper';
import {
  setupEnvironment,
  createMockSupabase,
  mockUserId,
  mockProfile,
  mockGalleryBase,
} from './galeria.test-setup';

setupEnvironment();

describe('Galeria Service - Status Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: mockUserId,
      profile: mockProfile,
    });

    // Limite liberado por padrão para operações de restauração/desarquivamento
    vi.mocked(limitHelper.checkReactivationLimit).mockResolvedValue({
      canCreate: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper: configura SELECT de busca da galeria e UPDATE encadeado.
   * O SELECT retorna dados da galeria; o UPDATE termina com .select().single().
   */
  const setupStatusMocks = (
    mockQueryBuilder: Record<string, any>,
    galleryData: Record<string, any> = {},
    updateResult: Record<string, any> = {},
  ) => {
    // Primeira chamada .single() — busca dados da galeria
    mockQueryBuilder.single
      .mockResolvedValueOnce({
        data: {
          user_id: mockUserId,
          slug: mockGalleryBase.slug,
          drive_folder_id: mockGalleryBase.drive_folder_id,
          ...galleryData,
        },
        error: null,
      })
      // Segunda chamada .single() — retorno do UPDATE com .select()
      .mockResolvedValueOnce({
        data: { id: 'gal-123', ...updateResult },
        error: null,
      });

    mockQueryBuilder.update.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.select.mockReturnThis();
  };

  // =========================================================================
  // 1. toggleArchiveGaleria
  // =========================================================================
  describe('toggleArchiveGaleria', () => {
    it('deve arquivar galeria ativa (currentStatus=false → is_archived=true)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { is_archived: false });

      const result = await toggleArchiveGaleria('gal-123', false);

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_archived: true }),
      );
    });

    it('deve desarquivar galeria arquivada (currentStatus=true → is_archived=false)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { is_archived: true });

      const result = await toggleArchiveGaleria('gal-123', true);

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_archived: false }),
      );
    });

    it('deve validar limite do plano ao desarquivar', async () => {
      // Bloqueia o desarquivamento por limite atingido
      vi.mocked(limitHelper.checkReactivationLimit).mockResolvedValue({
        canCreate: false,
        error: 'Limite de galerias ativas do plano FREE atingido.',
      });

      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { is_archived: true });

      const result = await toggleArchiveGaleria('gal-123', true);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limite');
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('não deve validar limite ao arquivar (somente ao desarquivar)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder);

      await toggleArchiveGaleria('gal-123', false); // arquivando

      expect(limitHelper.checkReactivationLimit).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando galeria não pertence ao usuário', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // SELECT retorna galeria com user_id diferente
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { user_id: 'outro-usuario', slug: 'test', drive_folder_id: 'f' },
        error: null,
      });

      const result = await toggleArchiveGaleria('gal-123', false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operação não autorizada.');
    });

    it('deve retornar erro quando galeria não existe', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await toggleArchiveGaleria('nao-existe', false);

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. toggleShowOnProfile
  // =========================================================================
  describe('toggleShowOnProfile', () => {
    it('deve ativar exibição no perfil (currentStatus=false → show_on_profile=true)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { show_on_profile: false });

      const result = await toggleShowOnProfile('gal-123', false);

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ show_on_profile: true });
    });

    it('deve desativar exibição no perfil (currentStatus=true → show_on_profile=false)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { show_on_profile: true });

      const result = await toggleShowOnProfile('gal-123', true);

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ show_on_profile: false });
    });

    it('deve retornar erro quando galeria não existe', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await toggleShowOnProfile('gal-nao-existe', true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Galeria não encontrada ou você não tem permissão.');
    });

    it('deve retornar erro quando galeria pertence a outro usuário', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { user_id: 'outro-usuario', slug: 'test', drive_folder_id: 'f' },
        error: null,
      });

      const result = await toggleShowOnProfile('gal-123', false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operação não autorizada.');
    });
  });

  // =========================================================================
  // 3. moveToTrash
  // =========================================================================
  describe('moveToTrash', () => {
    it('deve mover galeria para lixeira (is_deleted=true, deleted_at preenchido)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { is_deleted: false });

      const result = await moveToTrash('gal-123');

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_deleted: true,
          deleted_at: expect.any(String),
        }),
      );
    });

    it('deve retornar erro quando galeria pertence a outro usuário', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { user_id: 'outro-usuario', slug: 'test', drive_folder_id: 'f' },
        error: null,
      });

      const result = await moveToTrash('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operação não autorizada.');
    });

    it('deve retornar erro quando galeria não existe', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await moveToTrash('nao-existe');

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. restoreGaleria
  // =========================================================================
  describe('restoreGaleria', () => {
    it('deve restaurar galeria da lixeira com is_deleted=false e is_archived=false', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { is_deleted: true, is_archived: false });

      const result = await restoreGaleria('gal-123');

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_deleted: false,
          is_archived: false,
          deleted_at: null,
        }),
      );
    });

    it('deve bloquear restauração quando limite do plano é atingido', async () => {
      vi.mocked(limitHelper.checkReactivationLimit).mockResolvedValue({
        canCreate: false,
        error: 'Limite de galerias ativas do plano FREE atingido.',
      });

      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { is_deleted: true });

      const result = await restoreGaleria('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limite');
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('deve chamar syncUserGalleriesAction após restaurar com sucesso', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupStatusMocks(mockQueryBuilder, { is_deleted: true });

      const { syncUserGalleriesAction } = await import('@/actions/galeria.actions');

      await restoreGaleria('gal-123');

      expect(syncUserGalleriesAction).toHaveBeenCalledOnce();
    });

    it('deve retornar erro quando galeria não pertence ao usuário', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { user_id: 'outro-usuario', slug: 'test', drive_folder_id: 'f' },
        error: null,
      });

      const result = await restoreGaleria('gal-123');

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 5. permanentDelete
  // =========================================================================
  describe('permanentDelete', () => {
    it('deve excluir galeria permanentemente do banco', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // SELECT que verifica ownership
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          user_id: mockUserId,
          slug: mockGalleryBase.slug,
          drive_folder_id: mockGalleryBase.drive_folder_id,
        },
        error: null,
      });

      // DELETE encadeado deve resolver sem erro
      mockQueryBuilder.delete.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();

      // Simula resolução final do DELETE após o encadeamento
      // A última chamada de .eq() retorna uma Promise resolvida
      let callCount = 0;
      mockQueryBuilder.eq.mockImplementation(() => {
        callCount++;
        // Na segunda chamada de eq (eq('id', id)), resolve a Promise do DELETE
        if (callCount >= 2) {
          return Promise.resolve({ error: null });
        }
        return mockQueryBuilder;
      });

      const result = await permanentDelete('gal-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Galeria excluída permanentemente.');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('deve retornar erro quando galeria pertence a outro usuário', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { user_id: 'outro-usuario', slug: 'test', drive_folder_id: 'f' },
        error: null,
      });

      const result = await permanentDelete('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operação não autorizada.');
      expect(mockQueryBuilder.delete).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando galeria não existe', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await permanentDelete('nao-existe');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Galeria não encontrada.');
    });

    it('deve retornar erro quando usuário não está autenticado', async () => {
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: true,
        userId: null, // userId nulo — permanentDelete faz guard check
        profile: null,
      });

      const result = await permanentDelete('gal-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('autorizado');
    });

    it('deve retornar erro quando DELETE falha no banco', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { user_id: mockUserId, slug: 'test', drive_folder_id: 'f' },
        error: null,
      });

      mockQueryBuilder.delete.mockReturnThis();

      let callCount = 0;
      mockQueryBuilder.eq.mockImplementation(() => {
        callCount++;
        if (callCount >= 2) {
          return Promise.resolve({ error: { message: 'FK constraint' } });
        }
        return mockQueryBuilder;
      });

      const result = await permanentDelete('gal-123');

      expect(result.success).toBe(false);
    });
  });
});
