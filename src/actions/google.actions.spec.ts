import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getParentFolderIdServer,
  getDriveFolderName,
  checkFolderLimits,
  checkFolderPublicPermission,
  getValidGoogleToken,
  getGoogleClientId,
} from './google.actions';

// Mock dos services
vi.mock('@/core/services/google.service', () => ({
  getValidGoogleTokenService: vi.fn(),
  getParentFolderIdServerService: vi.fn(),
  getDriveFolderNameService: vi.fn(),
  checkFolderPublicPermissionService: vi.fn(),
}));

// Mock do fetch global
global.fetch = vi.fn();

describe('Google Actions - Testes Completos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getParentFolderIdServer', () => {
    it('deve retornar o ID da pasta mãe quando encontrado', async () => {
      const { getParentFolderIdServerService } =
        await import('@/core/services/google.service');

      vi.mocked(getParentFolderIdServerService).mockResolvedValue(
        'parent-folder-123',
      );

      const result = await getParentFolderIdServer('file-456', 'user-789');

      expect(result).toBe('parent-folder-123');
      expect(getParentFolderIdServerService).toHaveBeenCalledWith(
        'file-456',
        'user-789',
      );
      expect(getParentFolderIdServerService).toHaveBeenCalledTimes(1);
    });

    it('deve retornar null quando pasta mãe não existe', async () => {
      const { getParentFolderIdServerService } =
        await import('@/core/services/google.service');

      vi.mocked(getParentFolderIdServerService).mockResolvedValue(null);

      const result = await getParentFolderIdServer('file-orphan', 'user-123');

      expect(result).toBeNull();
    });

    it('deve propagar erro do service', async () => {
      const { getParentFolderIdServerService } =
        await import('@/core/services/google.service');

      vi.mocked(getParentFolderIdServerService).mockRejectedValue(
        new Error('Google API error'),
      );

      await expect(
        getParentFolderIdServer('file-error', 'user-123'),
      ).rejects.toThrow('Google API error');
    });
  });

  describe('getDriveFolderName', () => {
    it('deve retornar o nome da pasta quando encontrada', async () => {
      const { getDriveFolderNameService } =
        await import('@/core/services/google.service');

      vi.mocked(getDriveFolderNameService).mockResolvedValue(
        'My Photos Folder',
      );

      const result = await getDriveFolderName('folder-123', 'user-456');

      expect(result).toBe('My Photos Folder');
      expect(getDriveFolderNameService).toHaveBeenCalledWith(
        'folder-123',
        'user-456',
      );
    });

    it('deve retornar null quando pasta não existe', async () => {
      const { getDriveFolderNameService } =
        await import('@/core/services/google.service');

      vi.mocked(getDriveFolderNameService).mockResolvedValue(null);

      const result = await getDriveFolderName('folder-notfound', 'user-123');

      expect(result).toBeNull();
    });

    it('deve lidar com nomes de pastas especiais', async () => {
      const { getDriveFolderNameService } =
        await import('@/core/services/google.service');

      const specialNames = [
        'Pasta com Espaços',
        'Pasta-com-Hífens',
        'Pasta_com_Underscores',
        'Pasta.com.Pontos',
        '文件夹', // Unicode (chinês)
        'Папка', // Cirílico
      ];

      for (const name of specialNames) {
        vi.mocked(getDriveFolderNameService).mockResolvedValue(name);

        const result = await getDriveFolderName('folder-special', 'user-123');

        expect(result).toBe(name);
      }
    });
  });

  describe('checkFolderLimits', () => {
    describe('✅ Com Token Válido', () => {
      it('deve retornar contagem correta quando abaixo do limite', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue(
          'valid-token-123',
        );

        vi.mocked(fetch).mockResolvedValue({
          json: async () => ({
            files: [{ id: 'photo-1' }, { id: 'photo-2' }, { id: 'photo-3' }],
            nextPageToken: null,
          }),
        } as Response);

        const result = await checkFolderLimits('folder-123', 'user-456', 10);

        expect(result).toEqual({
          count: 3,
          hasMore: false,
          totalInDrive: 3,
        });
      });

      it('deve indicar hasMore quando há nextPageToken', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue('valid-token');

        vi.mocked(fetch).mockResolvedValue({
          json: async () => ({
            files: Array(10).fill({ id: 'photo' }),
            nextPageToken: 'next-page-token',
          }),
        } as Response);

        const result = await checkFolderLimits('folder-large', 'user-123', 10);

        expect(result).toEqual({
          count: 10,
          hasMore: true,
          totalInDrive: 10,
        });
      });

      it('deve limitar count ao planLimit quando excede', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue('valid-token');

        // Retorna 11 fotos, mas limit é 10
        vi.mocked(fetch).mockResolvedValue({
          json: async () => ({
            files: Array(11)
              .fill(null)
              .map((_, i) => ({ id: `photo-${i}` })),
            nextPageToken: null,
          }),
        } as Response);

        const result = await checkFolderLimits('folder-over', 'user-123', 10);

        expect(result).toEqual({
          count: 10, // Limitado ao planLimit
          hasMore: true, // Porque count > planLimit
          totalInDrive: 11, // Total real
        });
      });

      it('deve usar query correta para buscar apenas imagens', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue('token');

        vi.mocked(fetch).mockResolvedValue({
          json: async () => ({ files: [], nextPageToken: null }),
        } as Response);

        await checkFolderLimits('folder-123', 'user-456', 20);

        const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
        const decodedFetchCall = decodeURIComponent(fetchCall);

        expect(decodedFetchCall).toContain("mimeType contains 'image/'");
        expect(decodedFetchCall).toContain('trashed = false');
        expect(decodedFetchCall).toContain('pageSize=21'); // planLimit + 1
      });

      it('deve incluir Authorization header com token', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue(
          'my-access-token',
        );

        vi.mocked(fetch).mockResolvedValue({
          json: async () => ({ files: [], nextPageToken: null }),
        } as Response);

        await checkFolderLimits('folder-123', 'user-456', 10);

        const fetchCall = vi.mocked(fetch).mock.calls[0];
        const headers = fetchCall[1]?.headers as Record<string, string>;

        expect(headers.Authorization).toBe('Bearer my-access-token');
      });

      it('deve retornar 0 quando pasta está vazia', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue('token');

        vi.mocked(fetch).mockResolvedValue({
          json: async () => ({
            files: [],
            nextPageToken: null,
          }),
        } as Response);

        const result = await checkFolderLimits('folder-empty', 'user-123', 10);

        expect(result).toEqual({
          count: 0,
          hasMore: false,
          totalInDrive: 0,
        });
      });
    });

    describe('❌ Sem Token (Fallback)', () => {
      it('deve retornar valores padrão quando token não existe', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue(null);

        const result = await checkFolderLimits('folder-123', 'user-456', 10);

        expect(result).toEqual({
          count: 0,
          hasMore: false,
          totalInDrive: 0,
        });

        // Não deve fazer chamada ao fetch
        expect(fetch).not.toHaveBeenCalled();
      });

      it('deve retornar valores padrão quando token é string vazia', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue('');

        const result = await checkFolderLimits('folder-123', 'user-456', 10);

        expect(result).toEqual({
          count: 0,
          hasMore: false,
          totalInDrive: 0,
        });
      });
    });

    describe('🔒 Casos de Borda', () => {
      it('deve lidar com resposta sem files array', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue('token');

        vi.mocked(fetch).mockResolvedValue({
          json: async () => ({
            // Sem 'files'
            nextPageToken: null,
          }),
        } as Response);

        const result = await checkFolderLimits(
          'folder-malformed',
          'user-123',
          10,
        );

        expect(result.count).toBe(0);
        expect(result.totalInDrive).toBe(0);
      });

      it('deve funcionar com diferentes limites de plano', async () => {
        const { getValidGoogleTokenService } =
          await import('@/core/services/google.service');

        vi.mocked(getValidGoogleTokenService).mockResolvedValue('token');

        const planLimits = [2, 10, 20, 50, 100, 500, 1000];

        for (const limit of planLimits) {
          vi.mocked(fetch).mockResolvedValue({
            json: async () => ({
              files: Array(5).fill({ id: 'photo' }),
              nextPageToken: null,
            }),
          } as Response);

          const result = await checkFolderLimits('folder', 'user', limit);

          expect(result.count).toBeLessThanOrEqual(limit);
        }
      });
    });
  });

  describe('checkFolderPublicPermission', () => {
    it('deve retornar permissões quando pasta é pública e do usuário', async () => {
      const { checkFolderPublicPermissionService } =
        await import('@/core/services/google.service');

      vi.mocked(checkFolderPublicPermissionService).mockResolvedValue({
        isPublic: true,
        isOwner: true,
        folderLink: 'https://drive.google.com/drive/folders/folder-123',
      });

      const result = await checkFolderPublicPermission(
        'folder-123',
        'user-456',
      );

      expect(result).toEqual({
        isPublic: true,
        isOwner: true,
        folderLink: 'https://drive.google.com/drive/folders/folder-123',
      });
    });

    it('deve indicar quando pasta é privada', async () => {
      const { checkFolderPublicPermissionService } =
        await import('@/core/services/google.service');

      vi.mocked(checkFolderPublicPermissionService).mockResolvedValue({
        isPublic: false,
        isOwner: true,
        folderLink: 'https://drive.google.com/drive/folders/private-folder',
      });

      const result = await checkFolderPublicPermission(
        'private-folder',
        'user-123',
      );

      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(true);
    });

    it('deve indicar quando pasta não pertence ao usuário', async () => {
      const { checkFolderPublicPermissionService } =
        await import('@/core/services/google.service');

      vi.mocked(checkFolderPublicPermissionService).mockResolvedValue({
        isPublic: true,
        isOwner: false,
        folderLink: 'https://drive.google.com/drive/folders/shared-folder',
      });

      const result = await checkFolderPublicPermission(
        'shared-folder',
        'user-123',
      );

      expect(result.isPublic).toBe(true);
      expect(result.isOwner).toBe(false);
    });

    it('deve retornar folderLink correto', async () => {
      const { checkFolderPublicPermissionService } =
        await import('@/core/services/google.service');

      const folderId = 'abc123def456';
      const expectedLink = `https://drive.google.com/drive/folders/${folderId}`;

      vi.mocked(checkFolderPublicPermissionService).mockResolvedValue({
        isPublic: true,
        isOwner: true,
        folderLink: expectedLink,
      });

      const result = await checkFolderPublicPermission(folderId, 'user-123');

      expect(result.folderLink).toBe(expectedLink);
    });
  });

  describe('getValidGoogleToken', () => {
    it('deve retornar token válido quando disponível', async () => {
      const { getValidGoogleTokenService } =
        await import('@/core/services/google.service');

      vi.mocked(getValidGoogleTokenService).mockResolvedValue(
        'ya29.a0AfH6SMC...',
      );

      const result = await getValidGoogleToken('user-123');

      expect(result).toBe('ya29.a0AfH6SMC...');
      expect(getValidGoogleTokenService).toHaveBeenCalledWith('user-123');
    });

    it('deve retornar null quando token não está disponível', async () => {
      const { getValidGoogleTokenService } =
        await import('@/core/services/google.service');

      vi.mocked(getValidGoogleTokenService).mockResolvedValue(null);

      const result = await getValidGoogleToken('user-no-token');

      expect(result).toBeNull();
    });

    it('deve renovar token expirado', async () => {
      const { getValidGoogleTokenService } =
        await import('@/core/services/google.service');

      // Simula renovação: primeira chamada retorna token renovado
      vi.mocked(getValidGoogleTokenService).mockResolvedValue('new-token-123');

      const result = await getValidGoogleToken('user-expired');

      expect(result).toBe('new-token-123');
    });
  });

  describe('getGoogleClientId', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Salva env original
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      // Restaura env original
      process.env = originalEnv;
    });

    it('deve retornar NEXT_PUBLIC_GOOGLE_CLIENT_ID quando disponível', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'public-client-id-123';

      const result = await getGoogleClientId();

      expect(result).toBe('public-client-id-123');
    });

    it('deve fazer fallback para GOOGLE_CLIENT_ID quando NEXT_PUBLIC não existe', async () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'server-client-id-456';

      const result = await getGoogleClientId();

      expect(result).toBe('server-client-id-456');
    });

    it('deve priorizar NEXT_PUBLIC sobre GOOGLE_CLIENT_ID', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'public-id';
      process.env.GOOGLE_CLIENT_ID = 'server-id';

      const result = await getGoogleClientId();

      expect(result).toBe('public-id');
    });

    it('deve retornar null quando nenhuma variável está definida', async () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      const result = await getGoogleClientId();

      expect(result).toBeNull();
    });

    it('deve retornar null quando variáveis estão vazias', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = '';
      process.env.GOOGLE_CLIENT_ID = '';

      const result = await getGoogleClientId();

      expect(result).toBeNull();
    });

    it('deve lidar com valores undefined', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = undefined;
      process.env.GOOGLE_CLIENT_ID = undefined;

      const result = await getGoogleClientId();

      expect(result).toBeNull();
    });
  });

  describe('🔄 Integração entre Actions', () => {
    it('checkFolderLimits deve usar getValidGoogleToken internamente', async () => {
      const { getValidGoogleTokenService } =
        await import('@/core/services/google.service');

      vi.mocked(getValidGoogleTokenService).mockResolvedValue(
        'integration-token',
      );

      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ files: [], nextPageToken: null }),
      } as Response);

      await checkFolderLimits('folder-123', 'user-456', 10);

      expect(getValidGoogleTokenService).toHaveBeenCalledWith('user-456');
    });

    it('deve lidar com erro na renovação de token em checkFolderLimits', async () => {
      const { getValidGoogleTokenService } =
        await import('@/core/services/google.service');

      vi.mocked(getValidGoogleTokenService).mockRejectedValue(
        new Error('Token refresh failed'),
      );

      await expect(
        checkFolderLimits('folder-123', 'user-456', 10),
      ).rejects.toThrow('Token refresh failed');
    });
  });

  describe('📊 Validação de Parâmetros', () => {
    it('deve funcionar com IDs de pasta válidos do Google Drive', async () => {
      const { getDriveFolderNameService } =
        await import('@/core/services/google.service');

      const validFolderIds = [
        '1AbC2DeF3GhI4JkL5MnO6PqR7StU8VwX',
        '0B1C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q',
        'folder-with-hyphens',
        'folder_with_underscores',
      ];

      for (const folderId of validFolderIds) {
        vi.mocked(getDriveFolderNameService).mockResolvedValue('Test Folder');

        const result = await getDriveFolderName(folderId, 'user-123');

        expect(result).toBe('Test Folder');
        expect(getDriveFolderNameService).toHaveBeenCalledWith(
          folderId,
          'user-123',
        );
      }
    });

    it('deve funcionar com diferentes userIds', async () => {
      const { getValidGoogleTokenService } =
        await import('@/core/services/google.service');

      const userIds = ['user-1', 'user-abc-123', 'uuid-format-user'];

      for (const userId of userIds) {
        vi.mocked(getValidGoogleTokenService).mockResolvedValue('token');

        await getValidGoogleToken(userId);

        expect(getValidGoogleTokenService).toHaveBeenCalledWith(userId);
      }
    });
  });
});
