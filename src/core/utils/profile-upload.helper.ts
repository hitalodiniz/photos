/**
 * 🗂️ FILE UPLOAD HELPER
 * Gerenciamento de uploads para o profile service
 */

import { getFileExtension, generateFilePath } from './profile-helpers';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: any;
}

/**
 * Faz upload de um arquivo para o Supabase Storage
 */
export async function uploadFile(
  supabase: any,
  bucket: string,
  file: File,
  userId: string,
  fileType: 'avatar' | 'bg',
): Promise<UploadResult> {
  const extension = getFileExtension(file.name);
  const filePath = generateFilePath(userId, fileType, extension);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error(`[uploadFile] Error uploading ${fileType}:`, uploadError);
    return { success: false, error: uploadError };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return { success: true, url: publicUrl };
}

/**
 * Processa upload de foto de perfil
 */
export async function uploadProfilePicture(
  supabase: any,
  file: File | null | undefined,
  userId: string,
  existingUrl: string,
): Promise<string> {
  // Se não há arquivo novo, retorna a URL existente
  if (!file || file.size === 0) {
    return existingUrl;
  }

  const result = await uploadFile(
    supabase,
    'profile_pictures',
    file,
    userId,
    'avatar',
  );

  // Se upload falhou, retorna URL existente
  if (!result.success || !result.url) {
    return existingUrl;
  }

  return result.url;
}

/**
 * Processa upload de múltiplas imagens de background
 */
export async function uploadBackgroundImages(
  supabase: any,
  files: File[],
  userId: string,
  existingUrls: string[],
): Promise<string[]> {
  // Se não há arquivos novos, retorna URLs existentes
  if (files.length === 0 || files[0].size === 0) {
    return existingUrls;
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    if (file.size === 0) continue;

    const result = await uploadFile(
      supabase,
      'profile_pictures',
      file,
      userId,
      'bg',
    );

    if (result.success && result.url) {
      uploadedUrls.push(result.url);
    }
  }

  // Se nenhum upload teve sucesso, retorna URLs existentes
  if (uploadedUrls.length === 0) {
    return existingUrls;
  }

  // Se houve sucesso, substitui as antigas pelas novas
  return uploadedUrls;
}
