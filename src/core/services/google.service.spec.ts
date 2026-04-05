import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import * as googleService from './google.service';

// =========================================================================
// MOCKS
// =========================================================================

vi.mock('@/lib/google-auth', () => ({
  getDriveAccessTokenForUser: vi.fn(),
}));

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/core/utils/google-oauth-throttle', () => ({
  fetchGoogleToken: vi.fn(),
}));

import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { fetchGoogleToken } from '@/core/utils/google-oauth-throttle';

describe('Google Service - Suite Completa de Testes', () => {
  const mockUserId = 'user-123';
  const mockFileId = 'file-456';
  const mockFolderId = 'folder-789';
  const mockToken = 'google-token-xyz';

  // Helper para criar mock do Supabase
  const createMockSupabase = (data: any = {}, error: any = null) => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    update: vi.fn().mockReturnThis(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('GOOGLE_CLIENT_ID', 'mock-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'mock-client-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // =========================================================================
  // 1. getParentFolderIdServerService
  // =========================================================================
  describe('getParentFolderIdServerService', () => {
    it('deve retornar o ID da pasta pai com sucesso', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ parents: ['parent-abc'] }),
      } as Response);

      const result = await googleService.getParentFolderIdServerService(
        mockFileId,
        mockUserId,
      );

      expect(result).toBe('parent-abc');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(mockFileId),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });

    it('deve retornar null se não conseguir obter access token', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(null);

      const result = await googleService.getParentFolderIdServerService(
        mockFileId,
        mockUserId,
      );

      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('deve retornar null se API retornar status não-ok', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'File not found',
      } as Response);

      const result = await googleService.getParentFolderIdServerService(
        mockFileId,
        mockUserId,
      );

      expect(result).toBeNull();
    });

    it('deve retornar null se parents estiver vazio', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ parents: [] }),
      } as Response);

      const result = await googleService.getParentFolderIdServerService(
        mockFileId,
        mockUserId,
      );

      expect(result).toBeNull();
    });

    it('deve retornar null se parents for undefined', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await googleService.getParentFolderIdServerService(
        mockFileId,
        mockUserId,
      );

      expect(result).toBeNull();
    });

    it('deve capturar erro de rede e retornar null', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

      const result = await googleService.getParentFolderIdServerService(
        mockFileId,
        mockUserId,
      );

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // 2. getDriveFolderNameService
  // =========================================================================
  describe('getDriveFolderNameService', () => {
    it('deve retornar o nome da pasta com sucesso', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Minha Galeria' }),
      } as Response);

      const result = await googleService.getDriveFolderNameService(
        mockFolderId,
        mockUserId,
      );

      expect(result).toBe('Minha Galeria');
    });

    it('deve retornar null se não conseguir obter access token', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(null);

      const result = await googleService.getDriveFolderNameService(
        mockFolderId,
        mockUserId,
      );

      expect(result).toBeNull();
    });

    it('deve retornar null se API retornar status não-ok', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const result = await googleService.getDriveFolderNameService(
        mockFolderId,
        mockUserId,
      );

      expect(result).toBeNull();
    });

    it('deve retornar null se name não estiver presente', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await googleService.getDriveFolderNameService(
        mockFolderId,
        mockUserId,
      );

      expect(result).toBeNull();
    });

    it('deve capturar erro de rede e retornar null', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await googleService.getDriveFolderNameService(
        mockFolderId,
        mockUserId,
      );

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // 3. checkFolderPublicPermissionService
  // =========================================================================
  describe('checkFolderPublicPermissionService', () => {
    it('deve retornar isPublic=true e isOwner=true quando condições atendidas', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);

      const mockSupabase = createMockSupabase({ email: 'user@example.com' });
      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          explicitlyTrashed: false,
          permissions: [{ type: 'anyone', role: 'reader' }],
          owners: [{ emailAddress: 'user@example.com' }],
          webViewLink: 'https://drive.google.com/drive/folders/folder-789',
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.isPublic).toBe(true);
      expect(result.isOwner).toBe(true);
      expect(result.folderLink).toContain(mockFolderId);
    });

    it('deve retornar isPublic=false se não tiver permissão anyone', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);

      const mockSupabase = createMockSupabase({ email: 'user@example.com' });
      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          explicitlyTrashed: false,
          permissions: [{ type: 'user', role: 'reader' }],
          owners: [{ emailAddress: 'user@example.com' }],
          webViewLink: 'https://drive.google.com/drive/folders/folder-789',
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(true);
    });

    it('deve retornar isOwner=false se email não corresponder', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);

      const mockSupabase = createMockSupabase({ email: 'user@example.com' });
      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          explicitlyTrashed: false,
          permissions: [{ type: 'anyone', role: 'reader' }],
          owners: [{ emailAddress: 'other@example.com' }],
          webViewLink: 'https://drive.google.com/drive/folders/folder-789',
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.isPublic).toBe(true);
      expect(result.isOwner).toBe(false);
    });

    it('deve retornar false para pasta na lixeira', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          explicitlyTrashed: true,
          webViewLink: 'https://drive.google.com/drive/folders/folder-789',
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(false);
    });

    it('deve retornar false se não conseguir obter access token', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(null);

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.folderLink).toContain(mockFolderId);
    });

    it('deve retornar false se API retornar erro', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(false);
    });

    it('deve usar webViewLink da resposta quando disponível', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);

      const mockSupabase = createMockSupabase({ email: 'user@example.com' });
      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const customLink = 'https://drive.google.com/custom/link';
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          explicitlyTrashed: false,
          permissions: [],
          owners: [],
          webViewLink: customLink,
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.folderLink).toBe(customLink);
    });

    it('deve capturar erro de rede e retornar valores padrão', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.folderLink).toContain(mockFolderId);
    });
  });

  // =========================================================================
  // 4. getValidGoogleTokenService - CASOS DE SUCESSO
  // =========================================================================
  describe('getValidGoogleTokenService - Casos de Sucesso', () => {
    it('deve retornar token em cache se ainda válido', async () => {
      const futureTime = new Date(nowFn().getTime() + 10 * 60 * 1000).toISOString(); // 10 min no futuro
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
        google_access_token: 'cached-token',
        google_token_expires_at: futureTime,
        google_auth_status: 'active',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBe('cached-token');
      expect(fetchGoogleToken).not.toHaveBeenCalled();
    });

    it('deve renovar token se expirado e salvar no banco', async () => {
      const pastTime = new Date(nowFn().getTime() - 1000).toISOString(); // Expirado
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
        google_access_token: 'old-token',
        google_token_expires_at: pastTime,
        google_auth_status: 'active',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      } as Response);

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBe('new-token');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          google_access_token: 'new-token',
          google_auth_status: 'active',
        }),
      );
    });

    it('deve salvar novo refresh_token se Google rotacionar', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'old-refresh',
        google_access_token: null,
        google_token_expires_at: null,
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          expires_in: 3600,
          refresh_token: 'new-refresh', // Google rotacionou
        }),
      } as Response);

      await googleService.getValidGoogleTokenService(mockUserId);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          google_refresh_token: 'new-refresh',
        }),
      );
    });
  });

  // =========================================================================
  // 5. getValidGoogleTokenService - VALIDAÇÕES
  // =========================================================================
  describe('getValidGoogleTokenService - Validações', () => {
    it('deve retornar null se erro ao buscar profile', async () => {
      const mockSupabase = createMockSupabase(null, {
        message: 'Database error',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
    });

    it('deve retornar null se refresh_token não existir', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: null,
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
    });

    it('deve retornar null se status for "revoked"', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
        google_auth_status: 'revoked',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
    });

    it('deve retornar null se status for "expired"', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
        google_auth_status: 'expired',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
    });

    it('deve lidar com data de expiração inválida', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
        google_access_token: 'cached-token',
        google_token_expires_at: 'invalid-date',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      } as Response);

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      // Deve renovar o token por segurança
      expect(result).toBe('new-token');
    });
  });

  // =========================================================================
  // 6. getValidGoogleTokenService - ERROS DO GOOGLE
  // =========================================================================
  describe('getValidGoogleTokenService - Erros do Google', () => {
    it('deve limpar token e retornar null em invalid_grant', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'invalid-refresh',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'invalid_grant' }),
      } as Response);

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          google_refresh_token: null,
          google_access_token: null,
          google_auth_status: 'expired',
        }),
      );
    });

    it('deve limpar token em invalid_request', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'invalid_request' }),
      } as Response);

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
    });

    it('deve limpar token em refresh_token_already_used', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'refresh_token_already_used' }),
      } as Response);

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
    });

    it('deve lançar erro se access_token não vier na resposta', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        json: async () => ({}), // Sem access_token
      } as Response);

      await expect(
        googleService.getValidGoogleTokenService(mockUserId),
      ).rejects.toThrow('Falha ao renovar o acesso com o Google.');
    });
  });

  // =========================================================================
  // 7. getValidGoogleTokenService - ERROS DE REDE
  // =========================================================================
  describe('getValidGoogleTokenService - Erros de Rede', () => {
    it('deve lançar erro específico para timeout (408)', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const timeoutError: any = new Error('Request timeout');
      timeoutError.status = 408;
      vi.mocked(fetchGoogleToken).mockRejectedValue(timeoutError);

      await expect(
        googleService.getValidGoogleTokenService(mockUserId),
      ).rejects.toThrow('Erro de conexão com o servidor do Google (timeout).');
    });

    it('deve lançar erro para rate limit (429)', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const rateLimitError: any = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      vi.mocked(fetchGoogleToken).mockRejectedValue(rateLimitError);

      await expect(
        googleService.getValidGoogleTokenService(mockUserId),
      ).rejects.toThrow('Muitas requisições ao Google');
    });

    it('deve detectar timeout pela mensagem de erro', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockRejectedValue(
        new Error('Request timeout occurred'),
      );

      await expect(
        googleService.getValidGoogleTokenService(mockUserId),
      ).rejects.toThrow('timeout');
    });

    it('deve lançar erro para erro de rede genérico', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockRejectedValue(
        new Error('Failed to fetch'),
      );

      await expect(
        googleService.getValidGoogleTokenService(mockUserId),
      ).rejects.toThrow('Erro de conexão com o servidor do Google.');
    });

    it('deve lançar erro para Network failure', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockRejectedValue(
        new Error('Network failure detected'),
      );

      await expect(
        googleService.getValidGoogleTokenService(mockUserId),
      ).rejects.toThrow('Erro de conexão com o servidor do Google.');
    });

    it('deve retornar null para erro desconhecido', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockRejectedValue(
        new Error('Unknown error type'),
      );

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
    });

    it('deve relançar erro se for "Falha ao renovar o acesso"', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      const specificError = new Error(
        'Falha ao renovar o acesso com o Google.',
      );
      vi.mocked(fetchGoogleToken).mockRejectedValue(specificError);

      await expect(
        googleService.getValidGoogleTokenService(mockUserId),
      ).rejects.toThrow('Falha ao renovar o acesso com o Google.');
    });
  });

  // =========================================================================
  // 8. EDGE CASES E COBERTURA COMPLETA
  // =========================================================================
  describe('Edge Cases', () => {
    it('deve lidar com expires_in padrão se não especificado', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'refresh-token',
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          // expires_in ausente
        }),
      } as Response);

      await googleService.getValidGoogleTokenService(mockUserId);

      // Deve usar 3600 como padrão
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          google_access_token: 'new-token',
        }),
      );
    });

    it('deve lidar com permissions array vazio', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);

      const mockSupabase = createMockSupabase({ email: 'user@example.com' });
      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          explicitlyTrashed: false,
          permissions: [],
          owners: [],
          webViewLink: 'https://drive.google.com/drive/folders/f',
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        mockFolderId,
        mockUserId,
      );

      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(false);
    });

    it('deve lidar com erro ao limpar token no banco', async () => {
      const mockSupabase = createMockSupabase({
        google_refresh_token: 'invalid-refresh',
      });

      // 🎯 CORREÇÃO: Mantendo a fluidez do mock
      mockSupabase.update = vi.fn().mockReturnThis();
      mockSupabase.eq = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn().mockResolvedValue({
        error: { message: 'DB error' },
        data: null,
      });

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      vi.mocked(fetchGoogleToken).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'invalid_grant' }),
      } as Response);

      const result = await googleService.getValidGoogleTokenService(mockUserId);

      expect(result).toBeNull();
    });
  });
});
