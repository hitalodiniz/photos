import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforcePhotoQuotaByArchivingOldest } from './quota-enforcement';

type GalleryRow = {
  id: string;
  photo_count: number | null;
  created_at: string;
};

function makeSupabaseMock(galleries: GalleryRow[], archiveError: unknown = null) {
  const updateIn = vi.fn().mockResolvedValue({ error: archiveError });
  const update = vi.fn(() => ({ in: updateIn }));

  const order = vi.fn().mockResolvedValue({ data: galleries, error: null });
  const eq = vi.fn(() => ({
    eq,
    order,
  }));
  const select = vi.fn(() => ({
    eq,
  }));

  const profileMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: { plan_key: 'FREE' }, error: null });
  const profileEq = vi.fn(() => ({
    maybeSingle: profileMaybeSingle,
  }));
  const profileSelect = vi.fn(() => ({
    eq: profileEq,
  }));

  const from = vi.fn((table: string) => {
    if (table === 'tb_profiles') {
      return { select: profileSelect };
    }
    if (table === 'tb_galerias') {
      return { select, update };
    }
    return { select, update };
  });

  return {
    supabase: { from },
    spies: {
      from,
      select,
      eq,
      order,
      update,
      updateIn,
      profileSelect,
      profileEq,
      profileMaybeSingle,
    },
  };
}

describe('enforcePhotoQuotaByArchivingOldest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('arquiva as galerias mais antigas quando soma ultrapassa a cota do plano', async () => {
    // FREE (produção) = 450.
    // Mantém as mais novas (created_at DESC): g_new(200) + g_mid(180) = 380.
    // g_old(170) excede (550) e deve ser arquivada.
    const { supabase, spies } = makeSupabaseMock([
      { id: 'g_new', photo_count: 200, created_at: '2026-03-10T10:00:00Z' },
      { id: 'g_mid', photo_count: 180, created_at: '2026-03-09T10:00:00Z' },
      { id: 'g_old', photo_count: 170, created_at: '2026-03-08T10:00:00Z' },
    ]);

    const result = await enforcePhotoQuotaByArchivingOldest(
      supabase,
      'user-1',
      'FREE',
    );

    expect(result.archivedCount).toBe(1);
    expect(result.remainingTotal).toBe(380);
    expect(result.quota).toBe(450);

    expect(spies.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_archived: true,
        is_public: false,
        auto_archived: true,
      }),
    );
    expect(spies.updateIn).toHaveBeenCalledWith('id', ['g_old']);
  });

  it('não arquiva quando a soma já está dentro da cota', async () => {
    const { supabase, spies } = makeSupabaseMock([
      { id: 'g1', photo_count: 120, created_at: '2026-03-10T10:00:00Z' },
      { id: 'g2', photo_count: 130, created_at: '2026-03-09T10:00:00Z' },
      { id: 'g3', photo_count: 140, created_at: '2026-03-08T10:00:00Z' },
    ]);

    const result = await enforcePhotoQuotaByArchivingOldest(
      supabase,
      'user-2',
      'FREE',
    );

    expect(result.archivedCount).toBe(0);
    expect(result.remainingTotal).toBe(390);
    expect(spies.update).not.toHaveBeenCalled();
  });

  it('retorna archivedCount=0 quando update falha', async () => {
    const { supabase } = makeSupabaseMock(
      [
        { id: 'g1', photo_count: 300, created_at: '2026-03-10T10:00:00Z' },
        { id: 'g2', photo_count: 300, created_at: '2026-03-09T10:00:00Z' },
      ],
      { message: 'db error' },
    );

    const result = await enforcePhotoQuotaByArchivingOldest(
      supabase,
      'user-3',
      'FREE',
    );

    expect(result.archivedCount).toBe(0);
    expect(result.remainingTotal).toBe(300);
    expect(result.quota).toBe(450);
  });

  it('auto-arquiva por cota de arquivos mesmo sem exceder quantidade de galerias', async () => {
    // Apenas 2 galerias ativas (contagem baixa), mas soma de arquivos estoura a cota FREE.
    // Deve arquivar a mais antiga somente por cota de arquivos.
    const { supabase, spies } = makeSupabaseMock([
      { id: 'g_new', photo_count: 260, created_at: '2026-03-10T10:00:00Z' },
      { id: 'g_old', photo_count: 240, created_at: '2026-03-09T10:00:00Z' },
    ]);

    const result = await enforcePhotoQuotaByArchivingOldest(
      supabase,
      'user-4',
      'FREE',
    );

    expect(result.archivedCount).toBe(1);
    expect(result.remainingTotal).toBe(260);
    expect(spies.updateIn).toHaveBeenCalledWith('id', ['g_old']);
  });
});
