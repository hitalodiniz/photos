'use server';

import * as googleService from '@/core/services/google.service';

/**
 * Action para buscar o ID da pasta-mãe (parent)
 */
export async function getParentFolderIdServer(
  fileId: string,
  userId: string,
): Promise<string | null> {
  return googleService.getParentFolderIdServerService(fileId, userId);
}

/**
 * Action para buscar o nome de uma pasta no Drive
 */
export async function getDriveFolderName(
  folderId: string,
  userId: string,
): Promise<string | null> {
  return googleService.getDriveFolderNameService(folderId, userId);
}

/**
 * Action para verificar se a pasta é pública
 */
export async function checkFolderPublicPermission(
  folderId: string,
  userId: string,
): Promise<boolean> {
  return googleService.checkFolderPublicPermissionService(folderId, userId);
}

/**
 * Action para renovar o token do Google
 */
export async function getValidGoogleToken(userId: string): Promise<string> {
  return googleService.getValidGoogleTokenService(userId);
}
