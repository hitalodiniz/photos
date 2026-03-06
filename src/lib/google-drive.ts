import { PERMISSIONS_BY_PLAN, PlanKey } from '@/core/config/plans';
import { getPlanKeyForDriveRequest } from '@/core/utils/plan-resolver';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

/** Contexto para resolver plano por userId ou galleryId (sem usuário logado). */
export type DrivePlanContext = { userId?: string; galleryId?: string };

/** Tamanho máximo de vídeo em bytes a partir de MB */
const mbToBytes = (mb: number) => mb * 1024 * 1024;

/**
 * Aplica regras de vídeo do plano: só entram vídeos com size <= maxVideoSizeMB
 * e no máximo maxVideoCount. Fotos ilimitadas até o totalLimit; ordem natural por nome.
 */
function applyVideoRules(
  files: Array<{ name: string; size?: string; mimeType?: string }>,
  planKey: PlanKey,
  totalLimit: number,
): typeof files {
  const perms = PERMISSIONS_BY_PLAN[planKey] ?? PERMISSIONS_BY_PLAN.FREE;
  const maxVideoCount = perms.maxVideoCount ?? 1;
  const maxVideoSizeMB = perms.maxVideoSizeMB ?? 15;
  const maxVideoSizeBytes = mbToBytes(maxVideoSizeMB);

  const photos = files.filter((f) => f.mimeType?.startsWith('image/'));
  const videos = files.filter((f) => f.mimeType?.startsWith('video/'));
  const videosWithinSize = videos.filter(
    (f) => Number(f.size || 0) <= maxVideoSizeBytes,
  );
  const videosSorted = [...videosWithinSize].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
  const allowedVideos = videosSorted.slice(0, maxVideoCount);
  const combined = [...photos, ...allowedVideos].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
  return combined.slice(0, totalLimit);
}

/**
 * 🛠️ RESOLVE LIMITE DE FOTOS
 * Recebe apenas a chave do plano (ex: 'FREE') e retorna o número de fotos permitido.
 *
 * FIX: fallback seguro para FREE quando planKey é undefined, null, string vazia
 * ou uma chave que não existe no dicionário PERMISSIONS_BY_PLAN.
 */
export const resolvePhotoLimitByPlan = (planKey?: PlanKey | number): number => {
  // 1. Caso receba um número direto (fallback para uso manual)
  if (typeof planKey === 'number') return planKey;

  // 2. Busca no mapa mestre usando a chave (ex: 'PRO')
  // FIX: verifica se planKey existe E se a entrada está no dicionário antes de acessar
  // Sem isso, PERMISSIONS_BY_PLAN['INVALID'] retorna undefined e `.maxPhotosPerGallery` crasha
  const permissions =
    planKey && PERMISSIONS_BY_PLAN[planKey]
      ? PERMISSIONS_BY_PLAN[planKey]
      : PERMISSIONS_BY_PLAN.FREE;

  return permissions.maxPhotosPerGallery; // FREE=200, START=450, PLUS=800, PRO=1500, PREMIUM=3000
};

export interface DrivePhoto {
  id: string;
  name: string;
  size: string;
  thumbnailUrl: string;
  webViewUrl: string;
  width?: number;
  height?: number;
  /** image/* ou video/* — permite exibir vídeos na galeria */
  mimeType?: string;
}

/**
 * 🎯 Tenta listar fotos de uma pasta pública usando apenas API key.
 * Esta função não exige que o fotógrafo tenha um refresh token válido,
 * desde que a pasta no Drive esteja como "Qualquer pessoa com o link".
 */
export async function listPhotosFromPublicFolder(
  driveFolderId: string,
  limit?: number, // 🎯 Adicionado limite para planos
  planKey?: PlanKey, // regras de vídeo (max count + max size MB)
): Promise<DrivePhoto[] | null> {
  // Prioriza a chave do servidor, depois a pública
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn(
      '[listPhotosFromPublicFolder] ⚠️ GOOGLE_API_KEY não encontrada no ambiente.',
    );
    return null;
  }

  // Query: imagens e vídeos (pasta pública)
  const query = `'${driveFolderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`;
  const fields =
    'nextPageToken, files(id, name, size, mimeType, webViewLink, imageMediaMetadata(width,height), videoMediaMetadata(width,height))';

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
      // PERFORMANCE: Se já coletamos mídias suficientes para o limite do plano, paramos
      const mediaCount = allFiles.filter(
        (f) =>
          f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/'),
      ).length;
      if (limit && mediaCount >= limit) break;
    } while (pageToken);

    // Filtro: imagens e vídeos; ordenação natural
    const mediaFiles = allFiles
      .filter(
        (f) =>
          f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/'),
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

    // APLICA REGRAS DO PLANO: limite total + regras de vídeo (máx. N vídeos, máx. Y MB cada)
    const limitedFiles =
      limit && planKey
        ? applyVideoRules(mediaFiles, planKey, limit)
        : limit
          ? mediaFiles.slice(0, limit)
          : mediaFiles;

    if (limitedFiles.length === 0) {
      return null;
    }

    return limitedFiles.map((file) => {
      const meta = file.imageMediaMetadata || file.videoMediaMetadata || {};
      return {
        id: file.id,
        name: file.name,
        size: file.size || '0',
        thumbnailUrl: `/api/galeria/cover/${file.id}?w=600`,
        webViewUrl: file.webViewLink,
        width: meta.width || 1600,
        height: meta.height || 1200,
        mimeType: file.mimeType,
      };
    });
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
  limit?: number, // Adicionado limite do plano
  isAdmin: boolean = false,
  planKey?: PlanKey, // regras de vídeo (max count + max size MB)
): Promise<DrivePhoto[]> {
  const query = `'${driveFolderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`;
  const fields =
    'nextPageToken, files(id, name, size, mimeType, webViewLink, imageMediaMetadata(width,height), videoMediaMetadata(width,height))';

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

    // Aplica regras do plano: limite total + regras de vídeo (máx. N vídeos, máx. Y MB cada)
    const limitedFiles =
      limit && planKey
        ? applyVideoRules(sortedFiles, planKey, limit)
        : limit
          ? sortedFiles.slice(0, limit)
          : sortedFiles;

    return limitedFiles.map((file) => {
      const meta = file.imageMediaMetadata || file.videoMediaMetadata || {};
      return {
        id: file.id,
        name: file.name,
        size: file.size || '0',
        thumbnailUrl: `/api/galeria/cover/${file.id}?w=600`,
        webViewUrl: file.webViewLink,
        width: meta.width || 1600,
        height: meta.height || 1200,
        mimeType: file.mimeType,
      };
    });
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
 * O plano pode ser passado direto (PlanKey/número) ou via contexto ({ userId } ou { galleryId });
 * quando contexto é passado, o plano é resolvido internamente (tb_profiles / galeria).
 */
export async function listPhotosFromDriveFolder(
  driveFolderId: string,
  accessToken?: string,
  planOrLimitOrContext?: PlanKey | number | DrivePlanContext,
): Promise<DrivePhoto[]> {
  if (!driveFolderId) {
    throw new Error('ID da pasta do Google Drive não fornecido.');
  }

  // Resolve plano: contexto (userId/galleryId) → busca no DB; senão usa PlanKey ou número
  let planKeyForVideo: PlanKey = 'FREE';
  if (planOrLimitOrContext !== undefined && planOrLimitOrContext !== null) {
    if (
      typeof planOrLimitOrContext === 'object' &&
      ('userId' in planOrLimitOrContext || 'galleryId' in planOrLimitOrContext)
    ) {
      planKeyForVideo = await getPlanKeyForDriveRequest(planOrLimitOrContext);
    } else if (
      typeof planOrLimitOrContext === 'string' &&
      PERMISSIONS_BY_PLAN[planOrLimitOrContext]
    ) {
      planKeyForVideo = planOrLimitOrContext;
    }
  }
  const limit = resolvePhotoLimitByPlan(
    typeof planOrLimitOrContext === 'number'
      ? planOrLimitOrContext
      : planKeyForVideo,
  );

  // 1. TENTATIVA 1: OAuth (Privado) - PRIORITÁRIO
  if (accessToken) {
    try {
      return await listPhotosWithOAuth(
        driveFolderId,
        accessToken,
        limit,
        true,
        planKeyForVideo,
      );
    } catch (error) {
      console.warn(
        '[listPhotosFromDriveFolder] ⚠️ OAuth falhou, tentando API Key...',
      );
      // Continua para tentar API Key
    }
  }

  // 2. TENTATIVA 2: API Key (Público) - FALLBACK
  try {
    const publicPhotos = await listPhotosFromPublicFolder(
      driveFolderId,
      limit,
      planKeyForVideo,
    );
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

export async function getSelectionMetadataAction(
  driveFolderId: string,
  selectionIds: string[],
  accessToken?: string,
): Promise<{ id: string; name: string }[]> {
  // 🎯 Se a lista vier vazia (limpeza), retorna array vazio imediatamente
  if (!selectionIds || selectionIds.length === 0) return [];

  const allPhotos = await listPhotosFromDriveFolder(driveFolderId, accessToken);
  if (!allPhotos) return [];

  const idSet = new Set(selectionIds);

  return allPhotos
    .filter((photo) => idSet.has(photo.id))
    .map((photo) => ({
      id: photo.id,
      name: photo.name,
    }));
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
