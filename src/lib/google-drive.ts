import { PLAN_LIMITS } from '@/constants/plans';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

export interface DrivePhoto {
  id: string;
  name: string;
  size: string;
  thumbnailUrl: string;
  webViewUrl: string;
  width?: number;
  height?: number;
}

/**
 * 🎯 Tenta listar fotos de uma pasta pública usando apenas API key.
 * Esta função não exige que o fotógrafo tenha um refresh token válido,
 * desde que a pasta no Drive esteja como "Qualquer pessoa com o link".
 */
async function listPhotosFromPublicFolder(
  driveFolderId: string,
): Promise<DrivePhoto[] | null> {
  // Prioriza a chave do servidor, depois a pública
  const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.warn('[listPhotosFromPublicFolder] ⚠️ GOOGLE_API_KEY não encontrada no ambiente.');
    return null;
  }

  // Query simplificada para evitar erros 400 em chamadas anônimas
  const query = `'${driveFolderId}' in parents and trashed = false`;
  const fields = 'nextPageToken, files(id, name, size, mimeType, webViewLink, imageMediaMetadata(width,height))';

  let allFiles: any[] = [];
  let pageToken: string | null = null;

  try {
    do {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('fields', fields);
      params.append('key', apiKey);
      params.append('pageSize', '500');
      params.append('supportsAllDrives', 'true');
      params.append('includeItemsFromAllDrives', 'true');
      
      if (pageToken) params.append('pageToken', pageToken);
      
      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { 
          revalidate: GLOBAL_CACHE_REVALIDATE,
          tags: [`drive-photos-${driveFolderId}`] 
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[listPhotosFromPublicFolder] ❌ Erro Google:', errorData.error?.message);
        return null;
      }

      const data = await response.json();
      allFiles = [...allFiles, ...(data.files || [])];
      pageToken = data.nextPageToken || null;

    } while (pageToken);

    // Filtro manual de imagens e ordenação natural
    const imageFiles = allFiles
      .filter(f => f.mimeType?.startsWith('image/'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    if (imageFiles.length === 0) {
        console.log('[listPhotosFromPublicFolder] ℹ️ Pasta encontrada, mas sem imagens.');
        return null;
    }

    return imageFiles.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size || '0',
      thumbnailUrl: `/api/galeria/cover/${file.id}?w=600`,
      webViewUrl: file.webViewLink,
      width: file.imageMediaMetadata?.width || 1600,
      height: file.imageMediaMetadata?.height || 1200,
    }));

  } catch (error: any) {
    console.error('[listPhotosFromPublicFolder] 💥 Exceção:', error.message);
    return null;
  }
}

/**
 * 🎯 Tenta listar fotos usando OAuth (necessita de accessToken válido).
 * Usado quando a pasta é privada ou a API Key falhou.
 */
async function listPhotosWithOAuth(
  driveFolderId: string, 
  accessToken: string
): Promise<DrivePhoto[]> {
  const query = `'${driveFolderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const fields = 'nextPageToken, files(id, name, size, webViewLink, imageMediaMetadata(width,height))';

  let allFiles: any[] = [];
  let pageToken: string | null = null;

  try {
    do {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('fields', fields);
      params.append('pageSize', '500');
      params.append('orderBy', 'name');
      params.append('supportsAllDrives', 'true');
      params.append('includeItemsFromAllDrives', 'true');
      
      if (pageToken) params.append('pageToken', pageToken);
      
      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        next: {
          revalidate: GLOBAL_CACHE_REVALIDATE,
          tags: [`drive-photos-${driveFolderId}`],
        },
      });

      if (!response.ok) throw new Error(`Status API Drive: ${response.status}`);

      const data = await response.json();
      allFiles = [...allFiles, ...(data.files || [])];
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    return allFiles.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size || '0',
      thumbnailUrl: `/api/galeria/cover/${file.id}?w=600`,
      webViewUrl: file.webViewLink,
      width: file.imageMediaMetadata?.width || 1600,
      height: file.imageMediaMetadata?.height || 1200,
    }));
  } catch (error: any) {
    console.error('[listPhotosWithOAuth] ❌ Erro OAuth:', error.message);
    throw error;
  }
}

/**
 * 🚀 FUNÇÃO PRINCIPAL (Exportada)
 * Implementa a estratégia dual para máxima resiliência.
 */
export async function listPhotosFromDriveFolder(
  driveFolderId: string,
  accessToken?: string,
): Promise<DrivePhoto[]> {
  if (!driveFolderId) {
    throw new Error('ID da pasta do Google Drive não fornecido.');
  }

  // 1. TENTATIVA 1: API Key (Público)
  // Resolve o problema de galerias que "pararam de carregar" por falta de token
  const publicPhotos = await listPhotosFromPublicFolder(driveFolderId);
  if (publicPhotos && publicPhotos.length > 0) {
    console.log(`[listPhotosFromDriveFolder] ✅ Sucesso via API Key: ${publicPhotos.length} fotos.`);
    return publicPhotos;
  }

  // 2. TENTATIVA 2: OAuth (Privado)
  // Fallback para quando o fotógrafo usa pastas restritas no Drive
  if (accessToken) {
    console.log('[listPhotosFromDriveFolder] ℹ️ Tentando fallback via OAuth...');
    return await listPhotosWithOAuth(driveFolderId, accessToken);
  }

  console.warn('[listPhotosFromDriveFolder] ⚠️ Nenhum método de acesso funcionou.');
  return [];
}

/**
 * Torna a pasta pública (Leitor para Qualquer Pessoa).
 */
export async function makeFolderPublic(folderId: string, accessToken: string) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    },
  );

  if (!res.ok) {
    const errorBody = await res.json();
    console.error('ERRO AO TORNAR PASTA PÚBLICA:', JSON.stringify(errorBody, null, 2));
    return false;
  }

  return true;
}