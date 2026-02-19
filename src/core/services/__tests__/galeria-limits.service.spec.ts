// @/core/services/__tests__/galeria-limits.service.spec.ts
import './setup-mocks';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  archiveExceedingGalleries,
  purgeOldDeletedGalleries,
} from '../galeria.service';
import * as authContext from '../auth-context.service';
import {
  setupEnvironment,
  createMockSupabase,
  mockUserId,
  mockProfile,
} from './galeria.test-setup';

setupEnvironment();

describe('Galeria Service - Limits & Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContext.getAuthenticatedUser).mockResolvedValue({
      success: true,
      userId: mockUserId,
      profile: mockProfile,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. archiveExceedingGalleries
  // =========================================================================
  describe('archiveExceedingGalleries', () => {
    /**
     * Helper: configura mocks para busca de galerias ativas + update + audit log.
     * O código real faz: select().eq().eq().eq().order() → depois update().in() → insert()
     */
    const setupArchiveMocks = (
      mockQueryBuilder: Record<string, any>,
      activeGalleries: { id: string; date?: string }[],
    ) => {
      // SELECT de galerias ativas: termina com .order()
      mockQueryBuilder.order.mockResolvedValueOnce({
        data: activeGalleries,
        error: null,
      });

      // UPDATE em galerias excedentes: .update().in()
      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.in.mockResolvedValue({ error: null });

      // INSERT do log de auditoria em tb_plan_sync_logs
      mockQueryBuilder.insert.mockResolvedValue({ error: null });
    };

    it('deve arquivar galerias excedentes e retornar a contagem correta', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      const active = [
        { id: 'gal-1' }, { id: 'gal-2' }, { id: 'gal-3' },
        { id: 'gal-4' }, { id: 'gal-5' }, // excedentes (limite=3)
      ];

      setupArchiveMocks(mockQueryBuilder, active);

      const count = await archiveExceedingGalleries(
        mockUserId, 3, { newPlan: 'FREE' }, mockSupabase,
      );

      expect(count).toBe(2);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ is_archived: true });
      expect(mockQueryBuilder.in).toHaveBeenCalledWith(
        'id',
        expect.arrayContaining(['gal-4', 'gal-5']),
      );
    });

    it('deve retornar 0 e não fazer update quando limite não é excedido', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      setupArchiveMocks(mockQueryBuilder, [{ id: 'gal-1' }, { id: 'gal-2' }]);

      const count = await archiveExceedingGalleries(
        mockUserId, 3, { newPlan: 'FREE' }, mockSupabase,
      );

      expect(count).toBe(0);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('deve sempre inserir log de auditoria, mesmo sem arquivar', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      setupArchiveMocks(mockQueryBuilder, [{ id: 'gal-1' }]);

      await archiveExceedingGalleries(
        mockUserId, 5, { oldPlan: 'PRO', newPlan: 'FREE' }, mockSupabase,
      );

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          new_plan: 'FREE',
          old_plan: 'PRO',
          archived_count: 0,
        }),
      );
    });

    it('deve inserir log com archived_count correto quando arquiva', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      const active = [
        { id: 'gal-1' }, { id: 'gal-2' }, { id: 'gal-3' }, { id: 'gal-4' },
      ];
      setupArchiveMocks(mockQueryBuilder, active);

      await archiveExceedingGalleries(
        mockUserId, 2, { newPlan: 'FREE' }, mockSupabase,
      );

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ archived_count: 2 }),
      );
    });

    it('deve lançar exceção quando SELECT de galerias falhar', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      mockQueryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: 'DB connection error' },
      });

      await expect(
        archiveExceedingGalleries(mockUserId, 3, { newPlan: 'FREE' }, mockSupabase),
      ).rejects.toBeDefined();
    });

    it('deve buscar galerias ordenadas por data decrescente (mais antigas por último)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      setupArchiveMocks(mockQueryBuilder, [{ id: 'gal-1' }]);

      await archiveExceedingGalleries(
        mockUserId, 5, { newPlan: 'FREE' }, mockSupabase,
      );

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('date', { ascending: false });
    });

    it('deve arquivar somente os itens após o índice do limite (tail do array)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      // Array já ordenado por data desc: gal-1 é mais recente, gal-3 mais antiga
      const active = [
        { id: 'gal-1', date: '2026-01-30' },
        { id: 'gal-2', date: '2026-01-15' },
        { id: 'gal-3', date: '2026-01-01' }, // excedente
      ];
      setupArchiveMocks(mockQueryBuilder, active);

      await archiveExceedingGalleries(
        mockUserId, 2, { newPlan: 'FREE' }, mockSupabase,
      );

      expect(mockQueryBuilder.in).toHaveBeenCalledWith('id', ['gal-3']);
    });

    it('deve respeitar limite PRO (10) — arquivando os excedentes certos', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      const active = Array.from({ length: 15 }, (_, i) => ({ id: `gal-${i + 1}` }));
      setupArchiveMocks(mockQueryBuilder, active);

      const count = await archiveExceedingGalleries(
        mockUserId, 10, { newPlan: 'PRO' }, mockSupabase,
      );

      expect(count).toBe(5);
    });
  });

  // =========================================================================
  // 2. purgeOldDeletedGalleries
  // =========================================================================
  describe('purgeOldDeletedGalleries', () => {
    /**
     * Helper: configura mocks para SELECT de galerias antigas + DELETE.
     */
    const setupPurgeMocks = (
      mockQueryBuilder: Record<string, any>,
      oldGalleries: { id: string; user_id: string; slug: string }[],
    ) => {
      mockQueryBuilder.lt.mockResolvedValueOnce({
        data: oldGalleries,
        error: null,
      });

      if (oldGalleries.length > 0) {
        mockQueryBuilder.delete.mockReturnThis();
        mockQueryBuilder.in.mockResolvedValue({ count: oldGalleries.length, error: null });
      }
    };

    it('deve excluir galerias com mais de 30 dias na lixeira e retornar seus metadados', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      const oldGalleries = [
        { id: 'old-1', user_id: mockUserId, slug: 'hitalo/2025/01/01/old' },
      ];
      setupPurgeMocks(mockQueryBuilder, oldGalleries);

      const result = await purgeOldDeletedGalleries(mockSupabase);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('old-1');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('deve retornar array vazio e não chamar DELETE quando não há galerias expiradas', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      mockQueryBuilder.lt.mockResolvedValue({ data: [], error: null });

      const result = await purgeOldDeletedGalleries(mockSupabase);

      expect(result).toEqual([]);
      expect(mockQueryBuilder.delete).not.toHaveBeenCalled();
    });

    it('deve filtrar por is_deleted=true e deleted_at antes do corte de 30 dias', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      mockQueryBuilder.lt.mockResolvedValue({ data: [], error: null });

      await purgeOldDeletedGalleries(mockSupabase);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_deleted', true);
      expect(mockQueryBuilder.lt).toHaveBeenCalledWith(
        'deleted_at',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO date string
      );
    });

    it('deve usar data de corte de exatamente 30 dias atrás', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      mockQueryBuilder.lt.mockResolvedValue({ data: [], error: null });

      const before = new Date();
      before.setDate(before.getDate() - 30);

      await purgeOldDeletedGalleries(mockSupabase);

      const ltCall = mockQueryBuilder.lt.mock.calls[0];
      const cutoffArg = new Date(ltCall[1]);
      const after = new Date();
      after.setDate(after.getDate() - 30);

      // Margem de 5 segundos para evitar flakiness por timing
      expect(Math.abs(cutoffArg.getTime() - before.getTime())).toBeLessThan(5000);
    });

    it('deve lançar exceção quando SELECT falhar', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      mockQueryBuilder.lt.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(purgeOldDeletedGalleries(mockSupabase)).rejects.toBeDefined();
    });

    it('deve lançar exceção quando DELETE falhar', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      const oldGalleries = [
        { id: 'old-1', user_id: mockUserId, slug: 'test' },
      ];

      mockQueryBuilder.lt.mockResolvedValue({ data: oldGalleries, error: null });
      mockQueryBuilder.delete.mockReturnThis();
      mockQueryBuilder.in.mockResolvedValue({
        count: null,
        error: { message: 'FK constraint violation' },
      });

      await expect(purgeOldDeletedGalleries(mockSupabase)).rejects.toBeDefined();
    });

    it('deve excluir múltiplas galerias em batch (um único DELETE com .in)', async () => {
      const { mockSupabase, mockQueryBuilder } = createMockSupabase();

      const oldGalleries = [
        { id: 'old-1', user_id: mockUserId, slug: 'slug-1' },
        { id: 'old-2', user_id: mockUserId, slug: 'slug-2' },
        { id: 'old-3', user_id: mockUserId, slug: 'slug-3' },
      ];
      setupPurgeMocks(mockQueryBuilder, oldGalleries);

      const result = await purgeOldDeletedGalleries(mockSupabase);

      expect(result).toHaveLength(3);
      expect(mockQueryBuilder.in).toHaveBeenCalledWith(
        'id',
        expect.arrayContaining(['old-1', 'old-2', 'old-3']),
      );
      // Garante que foi um único DELETE, não um loop
      expect(mockQueryBuilder.delete).toHaveBeenCalledTimes(1);
    });
  });
});
