'use server';

import { 
  getValidGoogleTokenService,
  getParentFolderIdServerService,
  getDriveFolderNameService,
  checkFolderPublicPermissionService
} from '@/core/services/google.service';

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
 * Action para verificar a quantidade fotos na pasta do Google Drive
 */

export async function checkFolderLimits(
  folderId: string,
  userId: string,
  planLimit: number,
) {
  const accessToken = await getValidGoogleToken(userId);

  // Se não houver token, retorna valores padrão (sistema tentará usar API Key)
  if (!accessToken) {
    // console.log('[checkFolderLimits] Token não disponível. Retornando valores padrão.');
    return {
      count: 0,
      hasMore: false,
      totalInDrive: 0,
    };
  }

  // Buscamos apenas o necessário para contar, com pageSize ligeiramente maior que o limite
  // para identificar se "sobrou" foto (hasMore)
  const fetchLimit = planLimit + 1;

  const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=${fetchLimit}&fields=files(id),nextPageToken`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  const count = data.files?.length || 0;

  return {
    count: Math.min(count, planLimit),
    hasMore: !!data.nextPageToken || count > planLimit,
    totalInDrive: count, // Apenas para debug ou aviso
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
