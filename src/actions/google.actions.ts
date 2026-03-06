'use server';

import {
  getValidGoogleTokenService,
  getParentFolderIdServerService,
  getDriveFolderNameService,
  checkFolderPublicPermissionService,
} from '@/core/services/google.service';
import {
  PERMISSIONS_BY_PLAN,
  type PlanKey,
} from '@/core/config/plans';

const mbToBytes = (mb: number) => mb * 1024 * 1024;

/**
 * Action para buscar o ID da pasta-mãe (parent)
 */
export async function getParentFolderIdServer(
  fileId: string,
  userId: string,
): Promise<string | null> {
  return getParentFolderIdServerService(fileId, userId);
}

/**
 * Action para buscar o nome de uma pasta no Drive
 */
export async function getDriveFolderName(
  folderId: string,
  userId: string,
): Promise<string | null> {
  return getDriveFolderNameService(folderId, userId);
}

/**
 * Verifica a quantidade de arquivos na pasta do Google Drive aplicando regras do plano:
 * - Total de mídias (fotos + vídeos) limitado por planLimit.
 * - Vídeos: no máximo maxVideoCount e cada um com tamanho <= maxVideoSizeMB (performance).
 * A contagem não inclui vídeos que excedem essas regras.
 */
export async function checkFolderLimits(
  folderId: string,
  userId: string,
  planLimit: number,
  planKey?: PlanKey,
) {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    return {
      count: 0,
      hasMore: false,
      totalInDrive: 0,
    };
  }

  const perms = planKey && PERMISSIONS_BY_PLAN[planKey]
    ? PERMISSIONS_BY_PLAN[planKey]
    : PERMISSIONS_BY_PLAN.FREE;
  const maxVideoCount = perms.maxVideoCount ?? 1;
  const maxVideoSizeBytes = mbToBytes(perms.maxVideoSizeMB ?? 15);

  const query = `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`;
  const pageSize = Math.min(planLimit * 2, 1000);
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=nextPageToken,files(id,size,mimeType)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  const files: Array<{ id: string; size?: string; mimeType?: string }> =
    data.files || [];
  const nextPageToken = data.nextPageToken || null;

  const photos = files.filter((f) => f.mimeType?.startsWith('image/'));
  const videos = files.filter((f) => f.mimeType?.startsWith('video/'));
  const videosWithinSize = videos.filter(
    (f) => Number(f.size || 0) <= maxVideoSizeBytes,
  );
  const allowedVideosCount = Math.min(videosWithinSize.length, maxVideoCount);
  const photoSlots = Math.max(0, planLimit - allowedVideosCount);
  const count = Math.min(photos.length, photoSlots) + allowedVideosCount;

  const totalInDrive = count;
  const hasMore =
    !!nextPageToken ||
    photos.length > photoSlots ||
    videosWithinSize.length > maxVideoCount;

  return {
    count: totalInDrive,
    hasMore,
    totalInDrive,
  };
}
/**
 * Action para verificar se a pasta é pública e se pertence ao usuário
 */
export async function checkFolderPublicPermission(
  folderId: string,
  userId: string,
): Promise<{
  isPublic: boolean;
  isOwner: boolean;
  folderLink: string;
}> {
  return checkFolderPublicPermissionService(folderId, userId);
}

/**
 * Action para renovar o token do Google
 * Retorna null se o token não estiver disponível (sistema tentará usar API Key)
 */
export async function getValidGoogleToken(userId: string): Promise<string | null> {
  return getValidGoogleTokenService(userId);
}

/**
 * 🎯 Action para obter o Google Client ID de forma segura
 * Retorna o Client ID do servidor para uso no cliente
 */
export async function getGoogleClientId(): Promise<string | null> {
  // Tenta NEXT_PUBLIC primeiro, depois a variável do servidor
  return (
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    null
  );
}
