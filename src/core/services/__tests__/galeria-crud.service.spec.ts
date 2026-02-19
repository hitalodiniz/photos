// @/core/services/__tests__/galeria-crud.service.spec.ts
import './setup-mocks';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateUniqueDatedSlug,
  createGaleria,
  updateGaleria,
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

describe('Galeria Service - CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: mockUserId,
      profile: mockProfile,
    });

    // Limite liberado por padrão — sobrescreva nos testes de bloqueio
    vi.mocked(limitHelper.checkGalleryLimit).mockResolvedValue({
      canCreate: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. GERAÇÃO DE SLUG
  // =========================================================================
  describe('generateUniqueDatedSlug', () => {
    /**
     * generateUniqueDatedSlug faz duas queries via Supabase:
     *   1. supabase.auth.getUser()           → retorna o userId (já mockado no mockSupabase)
     *   2. .from('tb_profiles').single()     → retorna o { username }
     *   3. .from('tb_galerias').maybeSingle() → verifica unicidade do slug
     *
     * O mockQueryBuilder.single é compartilhado, então a primeira chamada deve
     * retornar o profile e as subsequentes ficam livres para cada teste configurar.
     */
    const setupSlugMocks = (mockQueryBuilder: Record<string, any>) => {
      // Primeira chamada de .single() = busca do profile no tb_profiles
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { username: 'hitalo' },
        error: null,
      });
    };

    it('deve gerar slug no formato correto: username/YYYY/MM/DD/titulo', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupSlugMocks(mockQueryBuilder);

      const slug = await generateUniqueDatedSlug(
        'Ensaio Gestante',
        '2026-01-15',
      );

      expect(slug).toBe('hitalo/2026/01/15/ensaio-gestante');
    });

    it('deve truncar títulos muito longos para no máximo 60 caracteres', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupSlugMocks(mockQueryBuilder);

      const slug = await generateUniqueDatedSlug('a'.repeat(100), '2026-01-01');
      const titlePart = slug.split('/').pop()!;

      expect(titlePart.length).toBeLessThanOrEqual(60);
      // Garante que não termina com hífen residual após truncagem
      expect(titlePart).not.toMatch(/-$/);
    });

    it('deve adicionar sufixo incremental em caso de colisão', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupSlugMocks(mockQueryBuilder);

      // Simula dois slugs existentes antes de encontrar um livre
      mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'existing-1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'existing-2' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const slug = await generateUniqueDatedSlug('Festa', '2026-01-01');

      expect(slug).toBe('hitalo/2026/01/01/festa-2');
    });

    it('deve ignorar colisão com o próprio ID ao editar', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupSlugMocks(mockQueryBuilder);

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

    it('deve sanitizar caracteres especiais e acentos no título', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupSlugMocks(mockQueryBuilder);

      const slug = await generateUniqueDatedSlug(
        'Casamento José & Maria!',
        '2026-01-01',
      );

      expect(slug).toBe('hitalo/2026/01/01/casamento-jose-e-maria');
    });

    it('deve quebrar o loop e retornar slug base em erro de banco', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupSlugMocks(mockQueryBuilder);

      // Erro no banco — o while(true) faz break e retorna o slug base
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'DB connection error' },
      });

      const slug = await generateUniqueDatedSlug('Festa', '2026-01-01');

      // Deve retornar o slug base sem sufixo, sem travar
      expect(slug).toBe('hitalo/2026/01/01/festa');
    });
  });

  // =========================================================================
  // 2. CRIAÇÃO DE GALERIA
  // =========================================================================
  describe('createGaleria', () => {
    /**
     * Helper para montar um FormData mínimo válido para criação.
     */
    const buildValidFormData = (overrides: Record<string, string> = {}) => {
      const fd = new FormData();
      fd.append('title', overrides.title ?? 'Festa de Ano Novo');
      fd.append('date', overrides.date ?? '2026-01-15');
      fd.append('drive_folder_id', overrides.drive_folder_id ?? 'folder-123');
      fd.append(
        'drive_folder_name',
        overrides.drive_folder_name ?? 'Festa 2026',
      );
      fd.append('client_name', overrides.client_name ?? 'João Silva');
      fd.append('is_public', overrides.is_public ?? 'true');
      fd.append('photo_count', overrides.photo_count ?? '50');
      fd.append('cover_image_ids', overrides.cover_image_ids ?? '[]');
      return fd;
    };

    it('deve criar galeria com dados válidos', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: {
          id: 'new-gallery',
          slug: 'hitalo/2026/01/15/festa-de-ano-novo',
          drive_folder_id: 'folder-123',
          photographer: mockProfile,
        },
        error: null,
      });

      const result = await createGaleria(buildValidFormData());

      expect(result.success).toBe(true);
      expect(result.message).toBe('Nova galeria criada com sucesso!');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it('deve retornar erro se usuário não estiver autenticado', async () => {
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: false,
        userId: null,
        profile: null,
      });

      const result = await createGaleria(buildValidFormData());

      expect(result.success).toBe(false);
      expect(result.error).toContain('autorizado');
    });

    it('deve retornar erro de validação se campos obrigatórios estiverem ausentes', async () => {
      const fd = new FormData();
      fd.append('title', 'Título sem data nem pasta');
      // Faltam: date, drive_folder_id, etc.

      const result = await createGaleria(fd);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('deve bloquear criação se o limite do plano for atingido', async () => {
      // CORRETO: mockamos o helper diretamente, não a query raw
      vi.mocked(limitHelper.checkGalleryLimit).mockResolvedValue({
        canCreate: false,
        error: 'Limite de galerias do plano FREE atingido.',
      });

      const result = await createGaleria(buildValidFormData());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limite');
    });

    it('deve retornar erro se o insert no banco falhar', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'unique constraint violation' },
      });

      const result = await createGaleria(buildValidFormData());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Falha ao criar');
    });

    it('deve sanitizar WhatsApp adicionando código do país (55 + DDD + número)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'gal-123', slug: 'test', photographer: mockProfile },
        error: null,
      });

      const fd = buildValidFormData();
      fd.append('client_whatsapp', '(31) 98888-7777');

      await createGaleria(fd);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          client_whatsapp: '5531988887777',
        }),
      ]);
    });

    it('deve formatar cover_image_ids de JSON array para formato PostgreSQL', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'gal-123', slug: 'test', photographer: mockProfile },
        error: null,
      });

      const fd = buildValidFormData({ cover_image_ids: '["id1","id2"]' });

      await createGaleria(fd);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          cover_image_ids: '{"id1","id2"}',
          cover_image_url: 'id1',
        }),
      ]);
    });

    it('deve definir cover_image_url como null quando cover_image_ids estiver vazio', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'gal-123', slug: 'test', photographer: mockProfile },
        error: null,
      });

      await createGaleria(buildValidFormData({ cover_image_ids: '[]' }));

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          cover_image_url: null,
        }),
      ]);
    });
  });

  // =========================================================================
  // 3. ATUALIZAÇÃO DE GALERIA
  // =========================================================================
  describe('updateGaleria', () => {
    /**
     * Helper para montar um FormData mínimo válido para atualização.
     */
    const buildUpdateFormData = (overrides: Record<string, string> = {}) => {
      const fd = new FormData();
      fd.append('title', overrides.title ?? 'Festa Atualizada');
      fd.append('date', overrides.date ?? '2026-01-01');
      fd.append('drive_folder_id', overrides.drive_folder_id ?? 'folder-123');
      fd.append('drive_folder_name', overrides.drive_folder_name ?? 'Festa');
      fd.append('client_name', overrides.client_name ?? 'Maria');
      fd.append('cover_image_ids', overrides.cover_image_ids ?? '[]');
      return fd;
    };

    /**
     * Configura o mock do SELECT inicial (busca dados da galeria) e
     * do UPDATE posterior de forma reutilizável.
     */
    const setupUpdateMocks = (
      mockQueryBuilder: Record<string, any>,
      galleryOverrides: Record<string, any> = {},
    ) => {
      mockQueryBuilder.single
        .mockResolvedValueOnce({
          data: {
            slug: 'hitalo/2026/01/01/festa',
            drive_folder_id: 'folder-123',
            is_archived: false,
            user_id: mockUserId,
            ...galleryOverrides,
          },
          error: null,
        })
        // Segunda chamada — retorno do .select().single() após UPDATE
        .mockResolvedValueOnce({
          data: { id: 'gallery-123', slug: 'hitalo/2026/01/01/festa' },
          error: null,
        });

      // UPDATE encadeado: .update().eq('id').eq('user_id') deve resolver sem erro
      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
    };

    it('deve atualizar galeria com dados válidos', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupUpdateMocks(mockQueryBuilder);

      const result = await updateGaleria('gallery-123', buildUpdateFormData());

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('deve retornar erro se usuário não estiver autenticado', async () => {
      vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
        success: false,
        userId: null,
        profile: null,
      });

      const result = await updateGaleria('gallery-123', buildUpdateFormData());

      expect(result.success).toBe(false);
      expect(result.error).toContain('autorizado');
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

      const result = await updateGaleria(
        'nonexistent-id',
        buildUpdateFormData(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Galeria não encontrada.');
    });

    it('deve bloquear edição de galeria arquivada', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: {
          slug: 'test',
          drive_folder_id: 'folder-123',
          is_archived: true,
          user_id: mockUserId,
        },
        error: null,
      });

      const result = await updateGaleria('gallery-123', buildUpdateFormData());

      expect(result.success).toBe(false);
      expect(result.error).toContain('arquivada');
      // Garante que não tentou fazer update
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('deve remover a senha ao tornar a galeria pública', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );
      setupUpdateMocks(mockQueryBuilder);

      const fd = buildUpdateFormData({ is_public: 'true' });
      fd.append('is_public', 'true');
      fd.append('password', 'senha-antiga');

      await updateGaleria('gallery-123', fd);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: true,
          password: null,
        }),
      );
    });

    it('deve retornar erro de validação se campos obrigatórios estiverem ausentes', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();
      vi.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: {
          slug: 'test',
          drive_folder_id: 'folder-123',
          is_archived: false,
          user_id: mockUserId,
        },
        error: null,
      });

      const fd = new FormData();
      fd.append('title', ''); // título vazio — deve falhar na validação

      const result = await updateGaleria('gallery-123', fd);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
