import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFolderPhotos, checkDriveAccess } from './google-drive.service';
import * as googleAuth from '@/lib/google-auth';
import * as googleDrive from '@/lib/google-drive';
import * as authContext from './auth-context.service';

// =========================================================================
// MOCKS
// =========================================================================

vi.mock('@/lib/google-auth');
vi.mock('@/lib/google-drive');
vi.mock('./auth-context.service');

describe('Google Drive Service - Suite Completa de Testes', () => {
  const mockUserId = 'user-123';
  const mockFolderId = 'folder-abc';
  const mockAccessToken = 'access-token-xyz';

  const mockPhotos = [
    {
      id: 'photo-1',
      name: 'IMG_003.jpg',
      createdTime: '2026-01-03T10:00:00Z',
      mimeType: 'image/jpeg',
    },
    {
      id: 'photo-2',
      name: 'IMG_001.jpg',
      createdTime: '2026-01-01T10:00:00Z',
      mimeType: 'image/jpeg',
    },
    {
      id: 'photo-3',
      name: 'IMG_002.jpg',
      createdTime: '2026-01-02T10:00:00Z',
      mimeType: 'image/jpeg',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock padrão: autenticação bem-sucedida
    vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
      success: true,
      userId: mockUserId,
      studioId: 'studio-123',
    });

    // Mock padrão: token válido
    vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
      mockAccessToken,
    );

    // Mock padrão: fotos do drive
    vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
      mockPhotos,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. TESTES DE getFolderPhotos - CASOS DE SUCESSO
  // =========================================================================
  describe('getFolderPhotos - Casos de Sucesso', () => {
    it('deve retornar fotos ordenadas por data decrescente', async () => {
      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);

      // Verifica ordenação: mais recente primeiro
      expect(result.data![0].name).toBe('IMG_003.jpg'); // 2026-01-03
      expect(result.data![1].name).toBe('IMG_002.jpg'); // 2026-01-02
      expect(result.data![2].name).toBe('IMG_001.jpg'); // 2026-01-01
    });

    it('deve usar userId fornecido como parâmetro', async () => {
      const customUserId = 'custom-user-456';

      await getFolderPhotos(mockFolderId, customUserId);

      expect(googleAuth.getDriveAccessTokenForUser).toHaveBeenCalledWith(
        customUserId,
      );
      expect(authContext.getAuthAndStudioIds).not.toHaveBeenCalled();
    });

    it('deve buscar userId automaticamente se não fornecido', async () => {
      await getFolderPhotos(mockFolderId);

      expect(authContext.getAuthAndStudioIds).toHaveBeenCalled();
      expect(googleAuth.getDriveAccessTokenForUser).toHaveBeenCalledWith(
        mockUserId,
      );
    });

    it('deve retornar array vazio se pasta não tiver fotos', async () => {
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue([]);

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('deve ordenar por nome alfabético quando datas forem iguais', async () => {
      const photosWithSameDate = [
        {
          id: 'photo-1',
          name: 'IMG_003.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
        {
          id: 'photo-2',
          name: 'IMG_001.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
        {
          id: 'photo-3',
          name: 'IMG_002.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
      ];

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        photosWithSameDate,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      expect(result.data![0].name).toBe('IMG_001.jpg');
      expect(result.data![1].name).toBe('IMG_002.jpg');
      expect(result.data![2].name).toBe('IMG_003.jpg');
    });

    it('deve usar imageMediaMetadata.time como fallback para data', async () => {
      const photosWithMetadata = [
        {
          id: 'photo-1',
          name: 'IMG_001.jpg',
          mimeType: 'image/jpeg',
          imageMediaMetadata: { time: '2026-01-02T10:00:00Z' },
        },
        {
          id: 'photo-2',
          name: 'IMG_002.jpg',
          mimeType: 'image/jpeg',
          imageMediaMetadata: { time: '2026-01-01T10:00:00Z' },
        },
      ];

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        photosWithMetadata as any,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      // Deve ordenar por metadata time
      expect(result.data![0].name).toBe('IMG_001.jpg'); // 2026-01-02
      expect(result.data![1].name).toBe('IMG_002.jpg'); // 2026-01-01
    });
  });

  // =========================================================================
  // 2. TESTES DE getFolderPhotos - VALIDAÇÕES
  // =========================================================================
  describe('getFolderPhotos - Validações', () => {
    it('deve retornar erro se driveFolderId não for fornecido', async () => {
      const result = await getFolderPhotos('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ID da pasta do Google Drive');
      expect(result.data).toEqual([]);
    });

    it('deve retornar erro se driveFolderId for null', async () => {
      const result = await getFolderPhotos(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ID da pasta do Google Drive');
      expect(result.data).toEqual([]);
    });

    it('deve retornar erro se driveFolderId for undefined', async () => {
      const result = await getFolderPhotos(undefined as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ID da pasta do Google Drive');
      expect(result.data).toEqual([]);
    });
  });

  // =========================================================================
  // 3. TESTES DE getFolderPhotos - AUTENTICAÇÃO
  // =========================================================================
  describe('getFolderPhotos - Autenticação', () => {
    it('deve retornar erro se usuário não estiver autenticado', async () => {
      vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
        success: false,
        error: 'Não autenticado',
      });

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('autenticado');
      expect(result.data).toEqual([]);
    });

    it('deve retornar erro se getAuthAndStudioIds retornar sem userId', async () => {
      vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
        success: true,
        userId: undefined,
      });

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('autenticado');
      expect(result.data).toEqual([]);
    });

    it('deve retornar erro se access token for null', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(null);

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Falha na integração Google Drive');
      expect(result.data).toEqual([]);
    });

    it('deve retornar erro se access token for undefined', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(
        undefined as any,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Falha na integração Google Drive');
      expect(result.data).toEqual([]);
    });

    it('deve retornar erro se access token for string vazia', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue('');

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Falha na integração Google Drive');
      expect(result.data).toEqual([]);
    });
  });

  // =========================================================================
  // 4. TESTES DE getFolderPhotos - ERROS DO GOOGLE DRIVE
  // =========================================================================
  describe('getFolderPhotos - Erros do Google Drive', () => {
    it('deve retornar AUTH_RECONNECT_REQUIRED em erro de sessão expirada', async () => {
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('Sua sessão expirou. Por favor, faça login novamente.'),
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('AUTH_RECONNECT_REQUIRED');
      expect(result.data).toEqual([]);
    });

    it('deve capturar erro genérico da API do Drive', async () => {
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('API quota exceeded'),
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API quota exceeded');
      expect(result.data).toEqual([]);
    });

    it('deve tratar erro de pasta não encontrada', async () => {
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error(
          'A pasta selecionada não foi encontrada no seu Google Drive.',
        ),
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('não foi encontrada');
      expect(result.data).toEqual([]);
    });

    it('deve tratar erro de permissão negada', async () => {
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('Permission denied'),
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(result.data).toEqual([]);
    });

    it('deve tratar erro de rede', async () => {
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        new Error('Network request failed'),
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network request failed');
      expect(result.data).toEqual([]);
    });

    it('deve tratar erro não-Error (throw de string)', async () => {
      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        'Erro inesperado',
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro desconhecido');
      expect(result.data).toEqual([]);
    });

    it('deve tratar erro sem mensagem', async () => {
      const errorSemMensagem = new Error();
      errorSemMensagem.message = '';

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockRejectedValue(
        errorSemMensagem,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('carregar as fotos');
      expect(result.data).toEqual([]);
    });
  });

  // =========================================================================
  // 5. TESTES DE getFolderPhotos - ORDENAÇÃO COMPLEXA
  // =========================================================================
  describe('getFolderPhotos - Ordenação Complexa', () => {
    it('deve ordenar corretamente fotos sem data (considerar como 0)', async () => {
      const photosWithMissingDates = [
        {
          id: 'photo-1',
          name: 'IMG_002.jpg',
          mimeType: 'image/jpeg',
        },
        {
          id: 'photo-2',
          name: 'IMG_001.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
      ];

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        photosWithMissingDates as any,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      // Foto com data deve vir primeiro (maior timestamp)
      expect(result.data![0].name).toBe('IMG_001.jpg');
      expect(result.data![1].name).toBe('IMG_002.jpg');
    });

    it('deve ordenar numericamente nomes com números', async () => {
      const photosWithNumbers = [
        {
          id: 'photo-1',
          name: 'IMG_10.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
        {
          id: 'photo-2',
          name: 'IMG_2.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
        {
          id: 'photo-3',
          name: 'IMG_1.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
      ];

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        photosWithNumbers,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      // Ordenação numérica: 1, 2, 10 (não 1, 10, 2)
      expect(result.data![0].name).toBe('IMG_1.jpg');
      expect(result.data![1].name).toBe('IMG_2.jpg');
      expect(result.data![2].name).toBe('IMG_10.jpg');
    });

    it('deve manter ordem estável para fotos idênticas', async () => {
      const identicalPhotos = [
        {
          id: 'photo-1',
          name: 'IMG_001.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
        {
          id: 'photo-2',
          name: 'IMG_001.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
      ];

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        identicalPhotos,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      // Ordem original mantida (estável)
      expect(result.data![0].id).toBe('photo-1');
      expect(result.data![1].id).toBe('photo-2');
    });
  });

  // =========================================================================
  // 6. TESTES DE checkDriveAccess - CASOS DE SUCESSO
  // =========================================================================
  describe('checkDriveAccess - Casos de Sucesso', () => {
    it('deve retornar true se token for válido', async () => {
      const result = await checkDriveAccess();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('deve retornar false se token for null', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockResolvedValue(null);

      const result = await checkDriveAccess();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('deve usar userId fornecido como parâmetro', async () => {
      const customUserId = 'custom-user-789';

      await checkDriveAccess(customUserId);

      expect(googleAuth.getDriveAccessTokenForUser).toHaveBeenCalledWith(
        customUserId,
      );
      expect(authContext.getAuthAndStudioIds).not.toHaveBeenCalled();
    });

    it('deve buscar userId automaticamente se não fornecido', async () => {
      await checkDriveAccess();

      expect(authContext.getAuthAndStudioIds).toHaveBeenCalled();
      expect(googleAuth.getDriveAccessTokenForUser).toHaveBeenCalledWith(
        mockUserId,
      );
    });
  });

  // =========================================================================
  // 7. TESTES DE checkDriveAccess - ERROS
  // =========================================================================
  describe('checkDriveAccess - Erros', () => {
    it('deve retornar erro se usuário não estiver autenticado', async () => {
      vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
        success: false,
        error: 'Não autenticado',
      });

      const result = await checkDriveAccess();

      expect(result.success).toBe(false);
      expect(result.error).toContain('autenticado');
      expect(result.data).toBe(false);
    });

    it('deve retornar erro se getDriveAccessTokenForUser lançar exceção', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockRejectedValue(
        new Error('Token refresh failed'),
      );

      const result = await checkDriveAccess();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token refresh failed');
      expect(result.data).toBe(false);
    });

    it('deve tratar erro genérico sem mensagem', async () => {
      vi.mocked(googleAuth.getDriveAccessTokenForUser).mockRejectedValue(
        'Erro genérico',
      );

      const result = await checkDriveAccess();

      expect(result.success).toBe(false);
      expect(result.error).toContain('verificar acesso');
      expect(result.data).toBe(false);
    });
  });

  // =========================================================================
  // 8. TESTES DE INTEGRAÇÃO (Fluxo Completo)
  // =========================================================================
  describe('Integração - Fluxo Completo', () => {
    it('deve executar fluxo completo de sucesso: auth → token → fotos → ordenação', async () => {
      const result = await getFolderPhotos(mockFolderId);

      // 1. Verificar autenticação
      expect(authContext.getAuthAndStudioIds).toHaveBeenCalled();

      // 2. Verificar obtenção de token
      expect(googleAuth.getDriveAccessTokenForUser).toHaveBeenCalledWith(
        mockUserId,
      );

      // 3. Verificar listagem de fotos
      expect(googleDrive.listPhotosFromDriveFolder).toHaveBeenCalledWith(
        mockFolderId,
        mockAccessToken,
      );

      // 4. Verificar resultado final
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data![0].name).toBe('IMG_003.jpg'); // Mais recente
    });

    it('deve executar verificação de acesso completa', async () => {
      const result = await checkDriveAccess(mockUserId);

      expect(googleAuth.getDriveAccessTokenForUser).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('deve falhar graciosamente em cada etapa do fluxo', async () => {
      // Simula falha na autenticação
      vi.mocked(authContext.getAuthAndStudioIds).mockResolvedValue({
        success: false,
        error: 'Auth failed',
      });

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      // Não deve tentar buscar token se auth falhar
      expect(googleAuth.getDriveAccessTokenForUser).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. TESTES DE EDGE CASES
  // =========================================================================
  describe('Edge Cases', () => {
    it('deve lidar com array muito grande de fotos (1000+)', async () => {
      const manyPhotos = Array.from({ length: 1500 }, (_, i) => ({
        id: `photo-${i}`,
        name: `IMG_${String(i).padStart(4, '0')}.jpg`,
        createdTime: new Date(2026, 0, 1 + i).toISOString(),
        mimeType: 'image/jpeg',
      }));

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        manyPhotos,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1500);
      // Última foto criada deve vir primeiro
      expect(result.data![0].name).toContain('1499');
    });

    it('deve lidar com caracteres especiais em nomes de arquivo', async () => {
      const specialPhotos = [
        {
          id: 'photo-1',
          name: 'Café & Açúcar.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
        {
          id: 'photo-2',
          name: 'Ação.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
      ];

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        specialPhotos,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      // Ordenação deve funcionar com caracteres especiais
      expect(result.data![0].name).toBe('Ação.jpg');
      expect(result.data![1].name).toBe('Café & Açúcar.jpg');
    });

    it('deve lidar com datas inválidas graciosamente', async () => {
      const invalidDatePhotos = [
        {
          id: 'photo-1',
          name: 'IMG_001.jpg',
          createdTime: 'invalid-date',
          mimeType: 'image/jpeg',
        },
        {
          id: 'photo-2',
          name: 'IMG_002.jpg',
          createdTime: '2026-01-01T10:00:00Z',
          mimeType: 'image/jpeg',
        },
      ];

      vi.mocked(googleDrive.listPhotosFromDriveFolder).mockResolvedValue(
        invalidDatePhotos as any,
      );

      const result = await getFolderPhotos(mockFolderId);

      expect(result.success).toBe(true);
      // Data inválida vira NaN, que deve ser tratada como 0
      expect(result.data).toHaveLength(2);
    });
  });
});
