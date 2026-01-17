import { describe, it, expect, vi, beforeEach } from 'vitest';

// 🎯 Mocks do Next e Supabase (Devem ficar no topo)
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClientReadOnly: vi.fn(),
  createSupabaseClientForCache: vi.fn(),
}));

vi.mock('@/lib/google-auth');
vi.mock('@/lib/google-drive');

// Importações após os mocks
import {
  formatGalleryData,
  fetchDrivePhotos,
  fetchGalleryBySlug,
} from './galeria-logic';
import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { GaleriaRawResponse } from '@/core/types/galeria';
import * as googleAuth from '@/lib/google-auth';
import * as googleDrive from '@/lib/google-drive';

describe('gallery-logic - Cobertura 100%', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatGalleryData', () => {
    it('deve formatar o objeto completo e tratar campos obrigatórios', () => {
      const mockRaw = {
        id: '123',
        title: 'Evento',
        photographer: {
          id: 'auth_1',
          full_name: 'Hitalo',
          username: 'hitalo',
          use_subdomain: true,
        },
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:00:00Z',
      } as unknown as GaleriaRawResponse;

      const res = formatGalleryData(mockRaw, 'hitalo');
      expect(res.use_subdomain).toBe(true);
      expect(res.created_at).toBeDefined();
    });

    it('deve usar fallback "Outros" para categoria', () => {
      const mockRaw = { id: '1' } as any;
      const res = formatGalleryData(mockRaw, 'user');
      expect(res.category).toBe('Outros');
    });
  });

  describe('fetchDrivePhotos', () => {
    it('deve retornar erro se parâmetros faltarem', async () => {
      const res = await fetchDrivePhotos(undefined, undefined);
      expect(res.error).toBe('MISSING_PARAMS');
    });

    it('deve capturar erro no bloco catch', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token',
      );
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('Crash'),
      );
      const res = await fetchDrivePhotos('u1', 'f1');
      expect(res.error).toBe('UNKNOWN_ERROR');
    });
  });

  describe('fetchGalleryBySlug', () => {
    it('deve retornar null se não encontrar no banco', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: '404' } }),
      };
      vi.mocked(createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      const res = await fetchGalleryBySlug('slug-errado');
      expect(res).toBeNull();
    });

    it('deve retornar dados no caminho de sucesso', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: '123',
            title: 'Casamento',
            photographer: { username: 'hitalo' },
          },
          error: null,
        }),
      };
      vi.mocked(createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      const res = await fetchGalleryBySlug('casamento-2026');
      expect(res?.title).toBe('Casamento');
    });
  });
});
