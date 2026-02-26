import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listPhotosFromDriveFolder,
  listPhotosWithOAuth,
  listPhotosFromPublicFolder,
  resolvePhotoLimitByPlan,
  DrivePhoto,
} from '@/lib/google-drive';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

// =========================================================================
// MOCKS
// =========================================================================

global.fetch = vi.fn();

describe('Google Drive Library - Suite Completa de Testes', () => {
  const mockFolderId = 'folder-abc123';
  const mockAccessToken = 'oauth-token-xyz';

  const mockDriveFiles = [
    {
      id: 'photo-1',
      name: 'IMG_001.jpg',
      size: '2048000',
      mimeType: 'image/jpeg',
      webViewLink: 'https://drive.google.com/file/d/photo-1',
      imageMediaMetadata: { width: 1920, height: 1080 },
    },
    {
      id: 'photo-2',
      name: 'IMG_002.jpg',
      size: '1024000',
      mimeType: 'image/jpeg',
      webViewLink: 'https://drive.google.com/file/d/photo-2',
      imageMediaMetadata: { width: 1600, height: 1200 },
    },
    {
      id: 'photo-3',
      name: 'IMG_003.jpg',
      size: '3072000',
      mimeType: 'image/jpeg',
      webViewLink: 'https://drive.google.com/file/d/photo-3',
      imageMediaMetadata: { width: 2048, height: 1536 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GOOGLE_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // =========================================================================
  // 1. TESTES DE resolvePhotoLimitByPlan
  // =========================================================================
  describe('resolvePhotoLimitByPlan', () => {
    // FIX 1: resolvePhotoLimitByPlan usa MAX_PHOTOS_PER_GALLERY_BY_PLAN internamente.
    // Os valores reais são: FREE=150, START=300, PLUS=400, PRO=600, PREMIUM=1000
    it('deve retornar limite para plano FREE', () => {
      const limit = resolvePhotoLimitByPlan('FREE');
      expect(limit).toBe(150);
    });

    it('deve retornar limite para plano PRO', () => {
      const limit = resolvePhotoLimitByPlan('PRO');
      expect(limit).toBe(600);
    });

    it('deve retornar número direto quando fornecido', () => {
      const limit = resolvePhotoLimitByPlan(150);
      expect(limit).toBe(150);
    });

    // FIX 2: Plano inválido → fallback para FREE = 150
    it('deve retornar limite FREE quando plano não existe', () => {
      const limit = resolvePhotoLimitByPlan('INVALID_PLAN' as any);
      expect(limit).toBe(150);
    });

    // FIX 3: undefined → fallback para FREE = 150
    it('deve retornar limite FREE quando plano é undefined', () => {
      const limit = resolvePhotoLimitByPlan(undefined);
      expect(limit).toBe(150);
    });
  });

  // =========================================================================
  // 2. TESTES DE listPhotosWithOAuth - CASOS DE SUCESSO
  // =========================================================================
  describe('listPhotosWithOAuth - Casos de Sucesso', () => {
    it('deve listar fotos com OAuth com sucesso', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('photo-1');
      expect(result[0].name).toBe('IMG_001.jpg');
      expect(result[0].thumbnailUrl).toContain('/api/galeria/cover/photo-1');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com/drive/v3/files'),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Cache-Control': 'no-cache',
          },
          next: {
            revalidate: GLOBAL_CACHE_REVALIDATE,
            tags: [`drive-${mockFolderId}`],
          },
        }),
      );
    });

    it('deve aplicar limite de fotos do plano', async () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) => ({
        id: `photo-${i}`,
        name: `IMG_${String(i).padStart(3, '0')}.jpg`,
        size: '1024000',
        mimeType: 'image/jpeg',
        webViewLink: `https://drive.google.com/file/d/photo-${i}`,
        imageMediaMetadata: { width: 1920, height: 1080 },
      }));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: manyFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosWithOAuth(
        mockFolderId,
        mockAccessToken,
        50,
      );

      expect(result.length).toBeLessThanOrEqual(50);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=50'),
        expect.any(Object),
      );
    });

    it('deve ordenar fotos numericamente (natural sort)', async () => {
      const unorderedFiles = [
        {
          id: 'photo-10',
          name: 'IMG_10.jpg',
          size: '1024000',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-10',
          imageMediaMetadata: { width: 1920, height: 1080 },
        },
        {
          id: 'photo-2',
          name: 'IMG_2.jpg',
          size: '1024000',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-2',
          imageMediaMetadata: { width: 1920, height: 1080 },
        },
        {
          id: 'photo-1',
          name: 'IMG_1.jpg',
          size: '1024000',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-1',
          imageMediaMetadata: { width: 1920, height: 1080 },
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: unorderedFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result[0].name).toBe('IMG_1.jpg');
      expect(result[1].name).toBe('IMG_2.jpg');
      expect(result[2].name).toBe('IMG_10.jpg');
    });

    it('deve usar valores padrão para dimensões ausentes', async () => {
      const filesWithoutMetadata = [
        {
          id: 'photo-1',
          name: 'IMG_001.jpg',
          size: '1024000',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-1',
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: filesWithoutMetadata,
          nextPageToken: null,
        }),
      } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result[0].width).toBe(1600);
      expect(result[0].height).toBe(1200);
    });

    it('deve lidar com paginação múltipla', async () => {
      const page1 = mockDriveFiles.slice(0, 2);
      const page2 = mockDriveFiles.slice(2);

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: page1, nextPageToken: 'token-page-2' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: page2, nextPageToken: null }),
        } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('deve parar paginação ao atingir limite do plano', async () => {
      const page1 = Array.from({ length: 50 }, (_, i) => ({
        id: `photo-${i}`,
        name: `IMG_${i}.jpg`,
        size: '1024000',
        mimeType: 'image/jpeg',
        webViewLink: `https://drive.google.com/file/d/photo-${i}`,
      }));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: page1, nextPageToken: 'has-more' }),
      } as Response);

      const result = await listPhotosWithOAuth(
        mockFolderId,
        mockAccessToken,
        50,
      );

      expect(result).toHaveLength(50);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 3. TESTES DE listPhotosWithOAuth - ERROS
  // =========================================================================
  describe('listPhotosWithOAuth - Erros', () => {
    it('deve lançar erro se API retornar status não-ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ error: { message: 'Forbidden' } }),
      } as Response);

      await expect(
        listPhotosWithOAuth(mockFolderId, mockAccessToken),
      ).rejects.toThrow('Status API Drive: 403');
    });

    it('deve lançar erro se API retornar 401 (token inválido)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: { message: 'Unauthorized' } }),
      } as Response);

      await expect(
        listPhotosWithOAuth(mockFolderId, mockAccessToken),
      ).rejects.toThrow('Status API Drive: 401');
    });

    it('deve lançar erro se API retornar 404 (pasta não encontrada)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: { message: 'Not Found' } }),
      } as Response);

      await expect(
        listPhotosWithOAuth(mockFolderId, mockAccessToken),
      ).rejects.toThrow('Status API Drive: 404');
    });

    it('deve capturar erro de rede', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        listPhotosWithOAuth(mockFolderId, mockAccessToken),
      ).rejects.toThrow('Network failure');
    });
  });

  // =========================================================================
  // 4. TESTES DE listPhotosFromPublicFolder - CASOS DE SUCESSO
  // =========================================================================
  describe('listPhotosFromPublicFolder - Casos de Sucesso', () => {
    it('deve listar fotos de pasta pública com API Key', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromPublicFolder(mockFolderId);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('key=test-api-key'),
        expect.any(Object),
      );
    });

    it('deve retornar null se GOOGLE_API_KEY não estiver configurada', async () => {
      vi.unstubAllEnvs();

      const result = await listPhotosFromPublicFolder(mockFolderId);

      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    // FIX 4: limite passado explicitamente como 150 (valor FREE real)
    it('deve aplicar limite de fotos do plano', async () => {
      const manyFiles = Array.from({ length: 200 }, (_, i) => ({
        id: `photo-${i}`,
        name: `IMG_${i}.jpg`,
        size: '1024000',
        mimeType: 'image/jpeg',
        webViewLink: `https://drive.google.com/file/d/photo-${i}`,
      }));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: manyFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromPublicFolder(mockFolderId, 150);

      expect(result).not.toBeNull();
      expect(result!.length).toBeLessThanOrEqual(150);
    });

    it('deve filtrar apenas arquivos de imagem', async () => {
      const mixedFiles = [
        ...mockDriveFiles,
        {
          id: 'doc-1',
          name: 'documento.pdf',
          size: '512000',
          mimeType: 'application/pdf',
          webViewLink: 'https://drive.google.com/file/d/doc-1',
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mixedFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromPublicFolder(mockFolderId);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      expect(result!.every((photo) => photo.name.endsWith('.jpg'))).toBe(true);
    });

    it('deve retornar null se pasta não tiver imagens', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [], nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromPublicFolder(mockFolderId);

      expect(result).toBeNull();
    });

    it('deve ordenar fotos alfabeticamente com ordenação natural', async () => {
      const unorderedFiles = [
        {
          id: 'photo-10',
          name: 'IMG_10.jpg',
          size: '1024000',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-10',
        },
        {
          id: 'photo-2',
          name: 'IMG_2.jpg',
          size: '1024000',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-2',
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: unorderedFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromPublicFolder(mockFolderId);

      expect(result).not.toBeNull();
      expect(result![0].name).toBe('IMG_2.jpg');
      expect(result![1].name).toBe('IMG_10.jpg');
    });

    // FIX 5: limite = 150 (FREE real)
    it('deve parar paginação ao atingir limite', async () => {
      const page1Files = Array.from({ length: 150 }, (_, i) => ({
        id: `photo-${i}`,
        name: `IMG_${i}.jpg`,
        size: '1024000',
        mimeType: 'image/jpeg',
        webViewLink: `https://drive.google.com/file/d/photo-${i}`,
      }));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: page1Files, nextPageToken: 'has-more' }),
      } as Response);

      const result = await listPhotosFromPublicFolder(mockFolderId, 150);

      expect(result).not.toBeNull();
      expect(result!.length).toBeLessThanOrEqual(150);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 5. TESTES DE listPhotosFromPublicFolder - ERROS
  // =========================================================================
  describe('listPhotosFromPublicFolder - Erros', () => {
    it('deve retornar null em erro da API', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Permission denied' } }),
      } as Response);

      const result = await listPhotosFromPublicFolder(mockFolderId);

      expect(result).toBeNull();
    });

    it('deve retornar null em erro de rede', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await listPhotosFromPublicFolder(mockFolderId);

      expect(result).toBeNull();
    });

    it('deve retornar null se resposta JSON for inválida', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      const result = await listPhotosFromPublicFolder(mockFolderId);

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // 6. TESTES DE listPhotosFromDriveFolder - ESTRATÉGIA OAUTH PRIORITÁRIA
  // =========================================================================
  describe('listPhotosFromDriveFolder - OAuth Prioritário', () => {
    it('deve usar OAuth quando accessToken é fornecido', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromDriveFolder(
        mockFolderId,
        mockAccessToken,
      );

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com/drive/v3/files'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            'Cache-Control': 'no-cache',
          }),
          cache: 'no-store',
        }),
      );
    });

    it('deve usar OAuth com limite do plano PRO', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromDriveFolder(
        mockFolderId,
        mockAccessToken,
        'PRO',
      );

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=600'),
        expect.any(Object),
      );
    });

    it('deve usar OAuth com limite numérico direto', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromDriveFolder(
        mockFolderId,
        mockAccessToken,
        150,
      );

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=150'),
        expect.any(Object),
      );
    });

    it('deve fazer fallback para API Key se OAuth falhar', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
        } as Response);

      const result = await listPhotosFromDriveFolder(
        mockFolderId,
        mockAccessToken,
      );

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('deve tentar API Key se accessToken não for fornecido', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromDriveFolder(mockFolderId);

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('key=test-api-key'),
        expect.any(Object),
      );
    });

    it('deve retornar array vazio se ambos os métodos falharem', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: async () => ({ error: { message: 'Forbidden' } }),
        } as Response);

      const result = await listPhotosFromDriveFolder(
        mockFolderId,
        mockAccessToken,
      );

      expect(result).toEqual([]);
    });

    it('deve lançar erro se driveFolderId não for fornecido', async () => {
      await expect(
        listPhotosFromDriveFolder('', mockAccessToken),
      ).rejects.toThrow('ID da pasta do Google Drive não fornecido');
    });

    // FIX 6: Limite FREE padrão = 150 (não 80)
    it('deve aplicar limite do plano FREE por padrão', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosFromDriveFolder(
        mockFolderId,
        mockAccessToken,
      );

      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=150'),
        expect.any(Object),
      );
    });
  });

  // =========================================================================
  // 7. TESTES DE EDGE CASES
  // =========================================================================
  describe('Edge Cases', () => {
    it('deve lidar com fotos sem dimensões', async () => {
      const filesWithoutDimensions = [
        {
          id: 'photo-1',
          name: 'IMG_001.jpg',
          size: '1024000',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-1',
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: filesWithoutDimensions,
          nextPageToken: null,
        }),
      } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result[0].width).toBe(1600);
      expect(result[0].height).toBe(1200);
    });

    it('deve lidar com caracteres especiais em nomes', async () => {
      const specialFiles = [
        {
          id: 'photo-1',
          name: 'Café & Açúcar.jpg',
          size: '1024000',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-1',
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: specialFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result[0].name).toBe('Café & Açúcar.jpg');
    });

    it('deve lidar com size ausente', async () => {
      const filesWithoutSize = [
        {
          id: 'photo-1',
          name: 'IMG_001.jpg',
          mimeType: 'image/jpeg',
          webViewLink: 'https://drive.google.com/file/d/photo-1',
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: filesWithoutSize, nextPageToken: null }),
      } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result[0].size).toBe('0');
    });

    it('deve lidar com resposta sem campo files', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nextPageToken: null }),
      } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // 8. TESTES DE PERFORMANCE E LIMITES
  // =========================================================================
  describe('Performance e Limites', () => {
    it('deve limitar pageSize ao máximo de 1000', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      await listPhotosWithOAuth(mockFolderId, mockAccessToken, 5000);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=1000'),
        expect.any(Object),
      );
    });

    // FIX 7: pageSize dobrado para API Key: 100 * 2 = 200 — lógica não mudou, apenas
    // o limite de referência FREE mudou. O teste em si continua válido com 100.
    it('deve usar pageSize * 2 para API Key para compensar não-imagens', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockDriveFiles, nextPageToken: null }),
      } as Response);

      await listPhotosFromPublicFolder(mockFolderId, 100);

      // 100 * 2 = 200, mas limitado a 1000
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=200'),
        expect.any(Object),
      );
    });

    it('deve processar 1500+ fotos sem erro', async () => {
      const manyFiles = Array.from({ length: 1500 }, (_, i) => ({
        id: `photo-${i}`,
        name: `IMG_${String(i).padStart(4, '0')}.jpg`,
        size: '1024000',
        mimeType: 'image/jpeg',
        webViewLink: `https://drive.google.com/file/d/photo-${i}`,
      }));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: manyFiles, nextPageToken: null }),
      } as Response);

      const result = await listPhotosWithOAuth(mockFolderId, mockAccessToken);

      expect(result).toHaveLength(1500);
    });
  });
});
