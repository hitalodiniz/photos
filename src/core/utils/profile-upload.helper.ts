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
  // 1. Filtra arquivos válidos (remove arquivos vazios ou mofados)
  const validFiles = files.filter((file) => file && file.size > 0);

  // 2. Se não há arquivos novos para subir, retorna apenas o que já existe
  if (validFiles.length === 0) {
    return existingUrls;
  }

  const uploadedUrls: string[] = [];

  // 3. Loop de Upload
  for (const file of validFiles) {
    const result = await uploadFile(
      supabase,
      'profile_pictures', // 💡 Dica: Considere mudar o bucket para 'backgrounds' no futuro
      file,
      userId,
      'bg',
    );

    if (result.success && result.url) {
      uploadedUrls.push(result.url);
    }
  }

  // 4. MESCLAGEM (O ponto crucial para o Carrossel)
  // Retornamos as URLs que já estavam lá + as novas URLs que acabamos de subir
  const finalArray = [...existingUrls, ...uploadedUrls];

  // 5. Fallback de Segurança
  // Se por algum erro bizarro o array final ficar vazio, mas existiam URLs antes, preserva as antigas
  if (finalArray.length === 0 && existingUrls.length > 0) {
    return existingUrls;
  }

  return finalArray;
}
