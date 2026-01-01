// src/actions/google.ts (Adicionar esta função)
'use server';

import { getDriveAccessTokenForUser } from '@/lib/google-auth';

/**
 * Busca o ID da pasta-mãe (parent) de um arquivo no Google Drive
 * @param fileId O ID do arquivo selecionado no Google Picker.
 * @param userId O ID do usuário logado (fotógrafo).
 * @returns O ID da pasta-mãe ou null se houver falha.
 */
export async function getParentFolderIdServer(
  fileId: string,
  userId: string,
): Promise<string | null> {
  // 1. RENOVA O ACCESS TOKEN NO SERVIDOR
  const accessToken = await getDriveAccessTokenForUser(userId);

  if (!accessToken) {
    console.error(
      'ERRO Server: Falha ao obter Access Token para buscar pasta-mãe.',
    );
    return null;
  }

  // 2. CHAMA A API DO DRIVE NO SERVIDOR (segura contra expiração de token)
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      // Não armazenamos em cache, pois o token é sensível ao tempo.
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'ERRO Drive API (Server): Falha ao buscar metadados:',
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();

    const parents = data.parents;

    if (parents && parents.length > 0) {
      return parents[0]; // Retorna o ID da primeira pasta-mãe
    }

    return null;
  } catch (error) {
    console.error('Erro de rede ao chamar a API do Drive (Server):', error);
    return null;
  }
}

/**
 * Busca o nome de uma pasta no Google Drive
 * @param folderId O ID da pasta.
 * @param userId O ID do usuário logado (fotógrafo).
 * @returns O nome da pasta ou null em caso de falha.
 */
export async function getDriveFolderName(
  folderId: string,
  userId: string,
): Promise<string | null> {
  const accessToken = await getDriveAccessTokenForUser(userId);

  if (!accessToken) {
    console.error(
      'ERRO Server: Falha ao obter Access Token para buscar nome da pasta.',
    );
    return null;
  }

  // Buscar o campo 'name' da pasta
  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'ERRO Drive API (Server): Falha ao buscar nome da pasta:',
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();

    return data.name || null;
  } catch (error) {
    console.error(
      'Erro de rede ao chamar a API do Drive (Server) para buscar nome:',
      error,
    );
    return null;
  }
}

/**
 * Verifica se a pasta possui permissão de leitura pública (anyone + reader)
 */
export async function checkFolderPublicPermission(
  folderId: string,
  userId: string,
): Promise<boolean> {
  const accessToken = await getDriveAccessTokenForUser(userId);

  if (!accessToken) {
    console.error('ERRO Server: Token não disponível para checar permissão.');
    return false;
  }

  const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=permissions,explicitlyTrashed`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'ERRO Drive API: Falha ao checar permissões:',
        response.status,
      );
      return false;
    }

    const data = await response.json();

    // Se a pasta estiver na lixeira, tratamos como não pública/inválida
    if (data.explicitlyTrashed) return false;

    // Verifica se existe a permissão de "anyone" com papel de "reader"
    const isPublic = data.permissions?.some(
      (p: any) => p.type === 'anyone' && p.role === 'reader',
    );

    return !!isPublic;
  } catch (error) {
    console.error('Erro de rede ao checar permissões pública:', error);
    return false;
  }
}
