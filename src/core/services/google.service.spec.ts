import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as googleService from './google.service';

// Mock das dependências externas
vi.mock('@/lib/google-auth', () => ({
  getDriveAccessTokenForUser: vi.fn(),
}));

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock do helper de rate limiting para evitar delays nos testes
vi.mock('@/core/utils/google-oauth-throttle', () => ({
  fetchGoogleToken: vi.fn(),
}));

import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { fetchGoogleToken } from '@/core/utils/google-oauth-throttle';

describe('Google Service', () => {
  const mockUserId = 'user-123';
  const mockFileId = 'file-456';
  const mockToken = 'google-token-789';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'client-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

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
    });

    it('deve retornar null se não conseguir obter o access token', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(null);

      const result = await googleService.getParentFolderIdServerService(
        mockFileId,
        mockUserId,
      );
      expect(result).toBeNull();
    });

    it('deve retornar null se a resposta da API não for ok', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await googleService.getParentFolderIdServerService(
        mockFileId,
        mockUserId,
      );
      expect(result).toBeNull();
    });
  });

  describe('getDriveFolderNameService', () => {
    it('deve retornar o nome da pasta com sucesso', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Minha Galeria' }),
      } as Response);

      const result = await googleService.getDriveFolderNameService(
        'folder-123',
        mockUserId,
      );
      expect(result).toBe('Minha Galeria');
    });
  });

  describe('checkFolderPublicPermissionService', () => {
    it('deve retornar true se a pasta tiver permissão "anyone" e "reader"', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      
      // Mock do Supabase para buscar o email do usuário
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { email: 'user@example.com' },
          error: null,
        }),
      };
      vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          explicitlyTrashed: false,
          permissions: [{ type: 'anyone', role: 'reader' }],
          owners: [{ emailAddress: 'user@example.com' }],
          webViewLink: 'https://drive.google.com/drive/folders/folder-123',
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        'folder-123',
        mockUserId,
      );
      expect(result.isPublic).toBe(true);
      expect(result.isOwner).toBe(true);
    });

    it('deve retornar false se a pasta estiver na lixeira', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue(mockToken);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ 
          explicitlyTrashed: true,
          webViewLink: 'https://drive.google.com/drive/folders/folder-123',
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        'folder-123',
        mockUserId,
      );
      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(false);
    });
  });

  describe('getValidGoogleTokenService', () => {
    it('deve renovar o token com sucesso', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            google_refresh_token: 'refresh_token_existente',
            google_access_token: null,
            google_token_expires_at: null,
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(), // Adicione o mock do update
      };

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // 🎯 MOCK DE SUCESSO COMPLETO - usando fetchGoogleToken
      vi.mocked(fetchGoogleToken).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'novo_access_token',
          expires_in: 3600,
          refresh_token: 'novo_refresh_token_opcional',
        }),
      } as Response);

      const token = await googleService.getValidGoogleTokenService('u');

      expect(token).toBe('novo_access_token');
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('deve lançar erro se o Google retornar erro no Refresh Token (Linhas 136-140)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { google_refresh_token: 'refresh_token_valido' },
          error: null,
        }),
      };
      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // 🎯 CORREÇÃO NO MOCK:
      // Retornamos um objeto vazio {} para "pular" o check de 'invalid_grant'
      // e cair direto no check de 'if (!data.access_token)'
      vi.mocked(fetchGoogleToken).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await expect(
        googleService.getValidGoogleTokenService('u'),
      ).rejects.toThrow('Falha ao renovar o acesso com o Google.');
    });
  });

  it('deve cobrir o erro de rede no catch do getParentFolderId (Linhas 53-56)', async () => {
    vi.mocked(getDriveAccessTokenForUser).mockResolvedValue('token');
    // Força uma rejeição de rede (erro catastrófico)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network Down'));

    const result = await googleService.getParentFolderIdServerService('f', 'u');
    expect(result).toBeNull(); // O catch retorna null
  });

  it('deve cobrir o erro response.ok false no getDriveFolderName (Linhas 73-76)', async () => {
    vi.mocked(getDriveAccessTokenForUser).mockResolvedValue('token');
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response);

    const result = await googleService.getDriveFolderNameService('f', 'u');
    expect(result).toBeNull();
  });

  it('deve cobrir falha de permissão e explicitlyTrashed (Linhas 92-97, 104-108)', async () => {
    vi.mocked(getDriveAccessTokenForUser).mockResolvedValue('token');
    // Simula pasta na lixeira
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        explicitlyTrashed: true,
        webViewLink: 'https://drive.google.com/drive/folders/f',
      }),
    } as Response);

    const result = await googleService.checkFolderPublicPermissionService(
      'f',
      'u',
    );
    expect(result.isPublic).toBe(false);
    expect(result.isOwner).toBe(false);
  });

  it('deve lançar erro se o Google retornar erro no Refresh Token (Linhas 136-140)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { google_refresh_token: 'r' },
        error: null,
      }),
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as any,
    );

    // 🎯 MUDANÇA AQUI: Retorne um objeto que NÃO seja 'invalid_grant'
    // para ele passar pela primeira validação e cair na segunda.
    vi.mocked(fetchGoogleToken).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: null }), // Simula ausência do token
    } as Response);

    // 🎯 PONTO FINAL: Adicione o ponto final para bater com o throw do seu Service
    await expect(googleService.getValidGoogleTokenService('u')).rejects.toThrow(
      'Falha ao renovar o acesso com o Google.',
    );
  });

  describe('Google Service - Cobertura de Falhas (Linhas Restantes)', () => {
    it('deve cobrir o erro de rede no catch do getParentFolderId (Linhas 53-56)', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue('token');
      // Força uma rejeição de rede (erro catastrófico)
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network Down'));

      const result = await googleService.getParentFolderIdServerService(
        'f',
        'u',
      );
      expect(result).toBeNull(); // O catch retorna null
    });

    it('deve cobrir o erro response.ok false no getDriveFolderName (Linhas 73-76)', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue('token');
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const result = await googleService.getDriveFolderNameService('f', 'u');
      expect(result).toBeNull();
    });

    it('deve cobrir falha de permissão e explicitlyTrashed (Linhas 92-97, 104-108)', async () => {
      vi.mocked(getDriveAccessTokenForUser).mockResolvedValue('token');
      // Simula pasta na lixeira
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          explicitlyTrashed: true,
          webViewLink: 'https://drive.google.com/drive/folders/f',
        }),
      } as Response);

      const result = await googleService.checkFolderPublicPermissionService(
        'f',
        'u',
      );
      expect(result.isPublic).toBe(false);
      expect(result.isOwner).toBe(false);
    });

    /*it('deve lançar erro se o Google retornar erro no Refresh Token (Linhas 136-140)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { google_refresh_token: 'r' },
          error: null,
        }),
      };
      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      // 🎯 CORREÇÃO: Simular uma resposta completa de sucesso na requisição,
      // mas que no corpo (JSON) não contenha o access_token.
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'invalid_grant' }),
      } as Response);

      await expect(
        googleService.getValidGoogleTokenService('u'),
      ).rejects.toThrow('AUTH_RECONNECT_REQUIRED');
    });*/

    it('deve capturar erro de rede real no catch do token (Linhas 142-145)', async () => {
      // Mock do helper de rate limiting para simular erro de rede
      const networkError: any = new Error('Falha de Rede');
      networkError.status = 408; // Timeout status
      vi.mocked(fetchGoogleToken).mockRejectedValueOnce(networkError);

      // Setup básico do Supabase mock
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { google_refresh_token: 'refresh-token', google_token_expires_at: new Date(Date.now() + 3600000).toISOString() },
          error: null,
        }),
      };
      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabase as any,
      );

      await expect(
        googleService.getValidGoogleTokenService('u'),
      ).rejects.toThrow('Erro de conexão com o servidor do Google (timeout).');
    }, 10000); // Timeout de 10s para evitar falhas por tempo
  });
});
