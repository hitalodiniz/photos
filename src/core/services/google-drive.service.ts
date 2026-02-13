'use server';

import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import {
  getAuthAndStudioIds,
  getAuthenticatedUser,
} from './auth-context.service';
import type { DrivePhoto } from '@/lib/google-drive';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Service unificado para operações do Google Drive
 * Centraliza lógica de autenticação e listagem de fotos
 *
 * Nota: Funções exportadas (não classe) para compatibilidade com 'use server'
 */

/**
 * Busca fotos de uma pasta do Google Drive
 * Centraliza autenticação, obtenção de token e listagem
 */
export async function getFolderPhotos(
  driveFolderId: string,
): Promise<ActionResult<DrivePhoto[]>> {
  try {
    const { userId } = await getAuthenticatedUser();

    // 2. VALIDAÇÃO
    if (!driveFolderId) {
      return {
        success: false,
        error: 'ID da pasta do Google Drive não foi configurado.',
        data: [],
      };
    }

    // 3. RENOVAR O ACCESS TOKEN
    const accessToken = await getDriveAccessTokenForUser(userId);

    if (!accessToken) {
      return {
        success: false,
        error: 'Falha na integração Google Drive. Refaça o login/integração.',
        data: [],
      };
    }

    // 4. LISTAR FOTOS DO DRIVE
    const photos = await listPhotosFromDriveFolder(driveFolderId, accessToken);

    // 5. ORDENAÇÃO: Data (mais recente) > Nome (alfabético)
    photos.sort((a, b) => {
      const pA = a as {
        createdTime?: string;
        imageMediaMetadata?: { time?: string };
      };
      const pB = b as {
        createdTime?: string;
        imageMediaMetadata?: { time?: string };
      };

      const dateAStr = pA.createdTime || pA.imageMediaMetadata?.time;
      const dateBStr = pB.createdTime || pB.imageMediaMetadata?.time;

      const dateA = dateAStr ? new Date(dateAStr).getTime() : 0;
      const dateB = dateBStr ? new Date(dateBStr).getTime() : 0;

      if (dateA !== dateB) return dateB - dateA; // Data: Decrescente
      return a.name.localeCompare(b.name, undefined, { numeric: true }); // Nome: Crescente
    });

    return { success: true, data: photos };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao buscar fotos do Google Drive:', errorMessage);

    // Tratamento de erros específicos
    if (errorMessage.includes('Sua sessão expirou')) {
      return {
        success: false,
        error: 'AUTH_RECONNECT_REQUIRED',
        data: [],
      };
    }

    return {
      success: false,
      error: errorMessage || 'Não foi possível carregar as fotos.',
      data: [],
    };
  }
}

/**
 * Verifica se o usuário tem acesso válido ao Google Drive
 */
export async function checkDriveAccess(
  userId?: string,
): Promise<ActionResult<boolean>> {
  try {
    let finalUserId = userId;
    if (!finalUserId) {
      const authResult = await getAuthAndStudioIds();
      if (!authResult.success || !authResult.userId) {
        return {
          success: false,
          error: authResult.error || 'Usuário não autenticado.',
          data: false,
        };
      }
      finalUserId = authResult.userId;
    }

    const accessToken = await getDriveAccessTokenForUser(finalUserId);
    return {
      success: true,
      data: !!accessToken,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Erro ao verificar acesso ao Google Drive';
    return {
      success: false,
      error: errorMessage,
      data: false,
    };
  }
}
