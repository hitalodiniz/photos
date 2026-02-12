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
  // 1. Filtro rigoroso: garante que temos apenas objetos File válidos
  const validFiles = files.filter(
    (file) => file instanceof File && file.size > 0,
  );

  // 2. Early return se não houver novos uploads
  if (validFiles.length === 0) return existingUrls;

  // 3. Execução Paralela (Promise.all)
  // Otimiza o tempo de resposta, disparando todos os uploads simultaneamente
  const uploadPromises = validFiles.map((file) =>
    uploadFile(supabase, 'profile_pictures', file, userId, 'bg'),
  );

  const results = await Promise.all(uploadPromises);

  // 4. Extração de URLs com filtro de sucesso
  const newUrls = results
    .filter((res) => res.success && res.url)
    .map((res) => res.url as string);

  // 5. Mesclagem e Sanitização
  // Usamos Set para evitar duplicatas acidentais e filtramos strings vazias
  const finalArray = [...new Set([...existingUrls, ...newUrls])].filter(
    Boolean,
  );

  // 6. Fallback de integridade
  return finalArray.length > 0 ? finalArray : existingUrls;
}
