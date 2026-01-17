import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatGalleryData,
  fetchDrivePhotos,
  fetchGalleryBySlug,
} from './galeria-logic';
import {
  createSupabaseServerClientReadOnly,
  createSupabaseClientForCache,
} from '@/lib/supabase.server';
import { GaleriaRawResponse } from '@/core/types/galeria';
import * as googleAuth from '@/lib/google-auth';
import * as googleDrive from '@/lib/google-drive';

// 🎯 1. Mock do next/cache para suportar unstable_cache (Pass-through)
vi.mock('next/cache', async () => {
  const actual = await vi.importOriginal<typeof import('next/cache')>();
  return {
    ...actual,
    unstable_cache: vi.fn((fn) => fn), // Apenas executa a função interna nos testes
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

// 2. Mocks dos serviços e Supabase
vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClientReadOnly: vi.fn(),
  createSupabaseClientForCache: vi.fn(), // Adicionado para suportar a lógica de cache
}));
vi.mock('@/lib/google-auth');
vi.mock('@/lib/google-drive');

describe('gallery-logic - Cobertura 100%', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatGalleryData', () => {
    it('deve formatar o objeto photographer completo e tratar use_subdomain', () => {
      const mockRaw = {
        id: '123',
        title: 'Evento',
        photographer: {
          id: 'auth_1',
          full_name: 'Hitalo',
          username: 'hitalo',
          use_subdomain: true,
          profile_picture_url: 'pic.jpg',
        },
        has_contracting_client: true,
        client_whatsapp: '31999999999',
        created_at: '2026-01-01T10:00:00Z', // Campo obrigatório adicionado
        updated_at: '2026-01-01T10:00:00Z',
      } as unknown as GaleriaRawResponse;

      const res = formatGalleryData(mockRaw, 'hitalo');

      expect(res.photographer?.use_subdomain).toBe(true);
      expect(res.use_subdomain).toBe(true);
      expect(res.created_at).toBe('2026-01-01T10:00:00Z');
    });

    it('deve usar fallback "Outros" e gerar datas se omitidas', () => {
      const mockRaw = { id: '1' } as any;
      const res = formatGalleryData(mockRaw, 'user');

      expect(res.category).toBe('Outros');
      expect(res.created_at).toBeDefined(); // Garante que o fallback de data funcionou
      expect(res.photographer).toBeUndefined();
    });
  });

  describe('fetchDrivePhotos - Caminhos de Erro', () => {
    it('deve retornar array vazio se userId ou folderId forem omitidos', async () => {
      const res = await fetchDrivePhotos(undefined, undefined);
      expect(res).toEqual({
        error: 'MISSING_PARAMS',
        photos: [],
      });
    });

    it('deve capturar erro e retornar vazio no bloco catch', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token',
      );
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('Drive Crash'),
      );

      const res = await fetchDrivePhotos('u1', 'f1');
      expect(res).toEqual({
        error: 'UNKNOWN_ERROR',
        photos: [],
      });
    });
  });

  describe('fetchGalleryBySlug', () => {
    it('deve retornar null se o slug não for encontrado no banco', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Not Found' } }),
      };
      // 🎯 Ajustado para usar o cliente de cache conforme a nova lógica
      vi.mocked(createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      const res = await fetchGalleryBySlug('slug-inexistente');
      expect(res).toBeNull();
    });

    it('deve retornar os dados brutos (Caminho de Sucesso)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: '123',
            title: 'Casamento',
            slug: 'casamento-2026',
            photographer: { username: 'hitalo', use_subdomain: true },
          },
          error: null,
        }),
      };

      vi.mocked(createSupabaseClientForCache).mockReturnValue(
        mockSupabase as any,
      );

      const res = await fetchGalleryBySlug('casamento-2026');

      expect(res).not.toBeNull();
      expect(res?.title).toBe('Casamento');
      expect(res?.photographer?.username).toBe('hitalo');
    });
  });

  describe('Subdomain', () => {
    it('deve tratar hasSubdomain como falso', () => {
      const mockRaw = {
        id: '123',
        photographer: { use_subdomain: false },
        client_name: 'Maria Silva',
      } as any;

      const res = formatGalleryData(mockRaw, 'hitalo');
      expect(res.use_subdomain).toBe(false);
    });
  });
});
