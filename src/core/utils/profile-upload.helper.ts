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
 * Faz upload de um arquivo para o Supabase Storage com limpeza prévia
 */
export async function uploadFile(
  supabase: any,
  bucket: string,
  file: File,
  userId: string,
  fileType: 'avatar' | 'bg',
): Promise<UploadResult> {
  try {
    const extension = getFileExtension(file.name);
    const filePath = generateFilePath(userId, fileType, extension);

    // 1. Limpeza de Storage (Baixo custo computacional)
    // Listamos a pasta do usuário para remover arquivos obsoletos antes do novo upload
    const folderPath = userId;
    const { data: existingFiles } = await supabase.storage
      .from(bucket)
      .list(folderPath);

    if (existingFiles && existingFiles.length > 0) {
      // Filtra para apagar apenas arquivos do tipo correspondente (avatar ou bg)
      // evitando apagar o avatar se estiver subindo um bg e vice-versa
      const toDelete = existingFiles
        .filter((f: any) => f.name.startsWith(fileType))
        .map((f: any) => `${folderPath}/${f.name}`);

      if (toDelete.length > 0) {
        await supabase.storage.from(bucket).remove(toDelete);
      }
    }

    // 2. Upload com upsert habilitado
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error(`[uploadFile] Error managing ${fileType}:`, error);
    return { success: false, error };
  }
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
  if (!file || file.size === 0) return existingUrl;

  const result = await uploadFile(
    supabase,
    'profile_pictures',
    file,
    userId,
    'avatar',
  );

  return result.success && result.url ? result.url : existingUrl;
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
  const validFiles = files.filter(
    (file) => file instanceof File && file.size > 0,
  );

  if (validFiles.length === 0) return existingUrls;

  // No caso de background, se o usuário enviou NOVOS arquivos,
  // assumimos a substituição total conforme o comportamento de "sobrepor" solicitado
  const uploadPromises = validFiles.map((file) =>
    uploadFile(supabase, 'profile_pictures', file, userId, 'bg'),
  );

  const results = await Promise.all(uploadPromises);

  const newUrls = results
    .filter((res) => res.success && res.url)
    .map((res) => res.url as string);

  // Mantemos as URLs existentes que não são blobs locais (se houver lógica de persistência parcial)
  // e mesclamos com as novas URLs geradas
  const finalArray = [...new Set([...newUrls])].filter(Boolean);

  return finalArray.length > 0 ? finalArray : existingUrls;
}
