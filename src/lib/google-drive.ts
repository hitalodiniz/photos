import {
  PERMISSIONS_BY_PLAN,
  PlanKey,
  PlanPermissions,
} from '@/core/config/plans';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';
import next from 'next';

/**
 * 🛠️ RESOLVE LIMITE DE FOTOS
 * Recebe apenas a chave do plano (ex: 'FREE') e retorna o número de fotos permitido.
 */
export const resolvePhotoLimitByPlan = (planKey?: PlanKey | number): number => {
  // 1. Caso receba um número direto (fallback para uso manual)
  if (typeof planKey === 'number') return planKey;

  // 2. Busca no mapa mestre usando a chave (ex: 'PRO')
  // Se a chave não existir ou não for passada, assume o limite do plano FREE (80)
  const permissions = planKey
    ? PERMISSIONS_BY_PLAN[planKey]
    : PERMISSIONS_BY_PLAN.FREE;

  return permissions?.maxPhotosPerGallery || 10000;
};

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
export async function listPhotosFromPublicFolder(
  driveFolderId: string,
  limit?: number, // 🎯 Adicionado limite para planos
): Promise<DrivePhoto[] | null> {
  // Prioriza a chave do servidor, depois a pública
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn(
      '[listPhotosFromPublicFolder] ⚠️ GOOGLE_API_KEY não encontrada no ambiente.',
    );
    return null;
  }

  // Query simplificada para evitar erros 400 em chamadas anônimas
  const query = `'${driveFolderId}' in parents and trashed = false`;
  const fields =
    'nextPageToken, files(id, name, size, mimeType, webViewLink, imageMediaMetadata(width,height))';

  let allFiles: any[] = [];
  let pageToken: string | null = null;

  try {
    do {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('fields', fields);
      params.append('key', apiKey);
      params.append(
        'pageSize',
        limit ? Math.min(limit * 2, 1000).toString() : '1000',
      );
      params.append('supportsAllDrives', 'true');
      params.append('includeItemsFromAllDrives', 'true');

      if (pageToken) params.append('pageToken', pageToken);

      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: {
          revalidate: GLOBAL_CACHE_REVALIDATE,
          tags: [`drive-${driveFolderId}`],
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          '[listPhotosFromPublicFolder] ❌ Erro Google:',
          errorData.error?.message,
        );
        return null;
      }

      const data = await response.json();
      allFiles = [...allFiles, ...(data.files || [])];
      pageToken = data.nextPageToken || null;
      // PERFORMANCE: Se já coletamos arquivos suficientes para o limite do plano, paramos o do-while
      if (
        limit &&
        allFiles.filter((f) => f.mimeType?.startsWith('image/')).length >= limit
      ) {
        break;
      }
    } while (pageToken);

    // Filtro manual de imagens e ordenação natural
    const imageFiles = allFiles
      .filter((f) => f.mimeType?.startsWith('image/'))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

    // APLICA O LIMITE DO PLANO:
    const limitedFiles = limit ? imageFiles.slice(0, limit) : imageFiles;

    if (limitedFiles.length === 0) {
      return null;
    }

    return limitedFiles.map((file) => ({
      // ✅ CORRETO
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
export async function listPhotosWithOAuth(
  driveFolderId: string,
  accessToken: string,
  limit?: number, //Adicionado limite do plano
  isAdmin: boolean = false,
): Promise<DrivePhoto[]> {
  const query = `'${driveFolderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const fields =
    'nextPageToken, files(id, name, size, webViewLink, imageMediaMetadata(width,height))';

  let allFiles: any[] = [];
  let pageToken: string | null = null;

  try {
    do {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('fields', fields);
      // 🎯 Se temos um limite baixo (ex: 80 fotos), não pedimos 1000 para o Google
      const pageSize = limit ? Math.min(limit, 1000) : 1000;
      params.append('pageSize', pageSize.toString());
      params.append('supportsAllDrives', 'true');
      params.append('includeItemsFromAllDrives', 'true');

      if (pageToken) params.append('pageToken', pageToken);

      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Cache-Control': 'no-cache',
        },
        ...(isAdmin
          ? { cache: 'no-store' }
          : {
              next: {
                revalidate: GLOBAL_CACHE_REVALIDATE,
                tags: [`drive-${driveFolderId}`],
              },
            }),
      });

      if (!response.ok) {
        // Captura o erro real para o catch do listPhotosFromDriveFolder
        const errorBody = await response.json().catch(() => ({}));
        const error: any = new Error(`Status API Drive: ${response.status}`);
        error.status = response.status; // 🎯 Facilita a verificação no seu fallback
        error.details = errorBody;
        throw error;
      }
      const data = await response.json();
      allFiles = [...allFiles, ...(data.files || [])];
      pageToken = data.nextPageToken || null;

      //Parar se atingir o limite do plano
      if (limit && allFiles.length >= limit) break;
    } while (pageToken);

    // 🎯 Ordenação natural (mais rápida que orderBy do Drive API)
    const sortedFiles = allFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );

    // Aplica o limite do plano
    const limitedFiles = limit ? sortedFiles.slice(0, limit) : sortedFiles;

    return limitedFiles.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size || '0',
      thumbnailUrl: `/api/galeria/cover/${file.id}?w=600`,
      webViewUrl: file.webViewLink,
      width: file.imageMediaMetadata?.width || 1600,
      height: file.imageMediaMetadata?.height || 1200,
    }));
  } catch (error: any) {
    // Log detalhado para o servidor
    console.error('[listPhotosWithOAuth] ❌ Erro na requisição:', {
      message: error.message,
      status: error.status,
      folder: driveFolderId,
    });
    throw error; // Re-lança para acionar o fallback de API Key se necessário
  }
}

/**
 * 🚀 FUNÇÃO PRINCIPAL (Exportada)
 * Implementa a estratégia dual para máxima resiliência.
 */
export async function listPhotosFromDriveFolder(
  driveFolderId: string,
  accessToken?: string,
  planOrLimit?: PlanKey | number, // 🎯 Aceita a chave 'PRO' ou o número direto
): Promise<DrivePhoto[]> {
  if (!driveFolderId) {
    throw new Error('ID da pasta do Google Drive não fornecido.');
  }

  // O Helper resolve se é 'FREE' -> 80, 'PRO' -> 600 ou se já é um número
  const limit = 10000; //resolvePhotoLimitByPlan(planOrLimit);

  // 1. TENTATIVA 1: OAuth (Privado) - PRIORITÁRIO
  if (accessToken) {
    try {
      //console.log('buscou o accessToken');
      return await listPhotosWithOAuth(driveFolderId, accessToken, limit, true);
    } catch (error) {
      console.warn(
        '[listPhotosFromDriveFolder] ⚠️ OAuth falhou, tentando API Key...',
      );
      // Continua para tentar API Key
    }
  }

  // 2. TENTATIVA 2: API Key (Público) - FALLBACK
  try {
    const publicPhotos = await listPhotosFromPublicFolder(driveFolderId, limit);
    if (publicPhotos && publicPhotos.length > 0) {
      return publicPhotos;
    }
  } catch (publicError) {
    console.error(
      '[listPhotosFromDriveFolder] ❌ Erro no acesso público:',
      publicError,
    );
  }

  console.warn(
    '[listPhotosFromDriveFolder] ⚠️ Nenhum método de acesso funcionou.',
  );
  return [];
}

/**
 * Torna a pasta pública (Leitor para Qualquer Pessoa).
 */
// export async function makeFolderPublic(folderId: string, accessToken: string) {
//   const res = await fetch(
//     `https://www.googleapis.com/drive/v3/files/${folderId}/permissions`,
//     {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         role: 'reader',
//         type: 'anyone',
//       }),
//     },
//   );

//   if (!res.ok) {
//     const errorBody = await res.json();
//     console.error(
//       'ERRO AO TORNAR PASTA PÚBLICA:',
//       JSON.stringify(errorBody, null, 2),
//     );
//     return false;
//   }

//   return true;
// }
