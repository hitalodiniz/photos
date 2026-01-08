import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatGalleryData,
  fetchDrivePhotos,
  fetchGalleryBySlug,
} from './galeria-logic';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { GaleriaRawResponse } from '@/core/types/galeria';
import * as googleAuth from '@/lib/google-auth';
import * as googleDrive from '@/lib/google-drive';

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClientReadOnly: vi.fn(),
}));
vi.mock('@/lib/google-auth');
vi.mock('@/lib/google-drive');

describe('gallery-logic - Cobertura 100%', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatGalleryData', () => {
    it('deve formatar o objeto photographer completo e tratar use_subdomain (Linhas 11-33)', () => {
      const mockRaw = {
        id: '123',
        title: 'Evento',
        photographer: {
          id: 'auth_1',
          full_name: 'Hitalo',
          username: 'hitalo',
          use_subdomain: true, // Força hasSubdomain = true
          profile_picture_url: 'pic.jpg',
        },
        has_contracting_client: true,
        client_whatsapp: '31999999999',
      } as unknown as GaleriaRawResponse;

      const res = formatGalleryData(mockRaw, 'hitalo');

      // Validações que cobrem as propriedades internas do mapeamento (Linhas 11-33)
      expect(res.photographer?.use_subdomain).toBe(true);
      expect(res.use_subdomain).toBe(true);
      expect(res.has_contracting_client).toBe(true);
      expect(res.client_whatsapp).toBe('31999999999');
    });

    it('deve usar fallback "Outros" para categoria e nulo para campos ausentes', () => {
      const mockRaw = { id: '1' } as any;
      const res = formatGalleryData(mockRaw, 'user');

      expect(res.category).toBe('Outros');
      expect(res.drive_folder_name).toBeNull();
      expect(res.photographer).toBeUndefined();
    });
  });

  describe('fetchDrivePhotos - Caminhos de Erro (Linhas 94-107)', () => {
    it('deve retornar array vazio se userId ou folderId forem omitidos', async () => {
      const res = await fetchDrivePhotos(undefined, undefined);
      expect(res).toEqual([]);
    });

    it('deve capturar erro e retornar vazio no bloco catch (Linha 104)', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        'token',
      );
      // Força um erro na listagem para entrar no catch
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('Drive Crash'),
      );

      const res = await fetchDrivePhotos('u1', 'f1');

      expect(res).toEqual([]);
      // Verifica se o erro foi logado no console (opcional)
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
      vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
        mockSupabase as any,
      );

      const res = await fetchGalleryBySlug('slug-inexistente');
      expect(res).toBeNull();
    });
    it('deve retornar os dados brutos da galeria e do fotógrafo (Caminho de Sucesso)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: '123',
            title: 'Casamento',
            slug: 'casamento-2026',
            user_id: 'u1',
            photographer: {
              id: 'u1',
              full_name: 'Hitalo',
              username: 'hitalo',
              use_subdomain: true,
            },
          },
          error: null,
        }),
      };

      vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue(
        mockSupabase as any,
      );

      const res = await fetchGalleryBySlug('casamento-2026');

      // Validações corretas para esta função específica
      expect(res).not.toBeNull();
      expect(res?.id).toBe('123');
      expect(res?.title).toBe('Casamento');

      // Aqui validamos se o join funcionou no mock
      expect(res?.photographer).toBeDefined();
      expect(res?.photographer?.username).toBe('hitalo');
    });
  });

  describe('Subdomain', () => {
    it('deve tratar hasSubdomain como falso e client_name como fallback nulo', () => {
      const mockRaw = {
        id: '123',
        photographer: { use_subdomain: false }, // Testa o outro lado do IF
        client_name: 'Maria Silva',
      } as any;

      const res = formatGalleryData(mockRaw, 'hitalo');

      expect(res.use_subdomain).toBe(false);
      expect(res.client_name).toBe('Maria Silva');
    });
  });
});
