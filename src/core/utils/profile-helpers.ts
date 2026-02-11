/**
 * 🛠️ HELPERS DO PROFILE SERVICE
 * Funções auxiliares para processamento de dados do perfil
 */

import { PlanKey } from '../config/plans';

/**
 * Normaliza o telefone adicionando prefixo 55 para números brasileiros
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';

  const cleanPhone = phone.replace(/\D/g, '');

  // Adiciona prefixo 55 para números brasileiros (10 ou 11 dígitos sem prefixo)
  if (
    cleanPhone &&
    (cleanPhone.length === 10 || cleanPhone.length === 11) &&
    !cleanPhone.startsWith('55')
  ) {
    return `55${cleanPhone}`;
  }

  return cleanPhone;
}

/**
 * Parse seguro de JSON para operating_cities
 */
export function parseOperatingCities(
  json: string | null | undefined,
): string[] {
  if (!json) return [];

  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Parse seguro de JSON para background URLs
 */
export function parseBackgroundUrls(json: string | null | undefined): string[] {
  if (!json) return [];

  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Extrai extensão do arquivo com fallback para webp
 */
export function getFileExtension(fileName: string | null | undefined): string {
  if (!fileName) return 'webp';

  const hasExtension = fileName.includes('.');
  if (!hasExtension) return 'webp';

  const extension = fileName.split('.').pop();
  return extension || 'webp';
}

/**
 * Gera path único para upload de arquivo
 */
export function generateFilePath(
  userId: string,
  fileType: 'avatar' | 'bg',
  extension: string,
): string {
  const timestamp = Date.now();

  if (fileType === 'avatar') {
    return `${userId}/avatar-${timestamp}.${extension}`;
  }

  // Para backgrounds, adiciona random para evitar colisões em uploads simultâneos
  const random = Math.random().toString(36).substring(2, 7);
  return `${userId}/bg-${timestamp}-${random}.${extension}`;
}

/**
 * Calcula data de expiração do trial
 */
export function calculateTrialExpiration(days: number = 14): string {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate.toISOString();
}

/**
 * Monta dados de trial para primeiro setup
 */
export function buildTrialData(trialDays: number = 14): {
  plan_key: PlanKey;
  plan_trial_expires: string;
  is_trial: boolean;
} {
  return {
    plan_key: 'PRO' as PlanKey,
    plan_trial_expires: calculateTrialExpiration(trialDays),
    is_trial: true,
  };
}

/**
 * Valida se FormData tem campos obrigatórios
 */
export function validateRequiredFields(formData: FormData): {
  isValid: boolean;
  error?: string;
} {
  const username = (formData.get('username') as string)?.toLowerCase().trim();
  const full_name = (formData.get('full_name') as string)?.trim();

  if (!username || !full_name) {
    return {
      isValid: false,
      error: 'Nome e Username são obrigatórios.',
    };
  }

  return { isValid: true };
}

/**
 * Extrai e normaliza dados do FormData
 */
export function extractFormData(formData: FormData) {
  // Pegamos as URLs que o usuário decidiu manter no carrossel (que já estavam lá)
  const existingUrls = JSON.parse(
    (formData.get('background_urls_existing') as string) || '[]',
  );

  return {
    username: (formData.get('username') as string)?.toLowerCase().trim(),
    full_name: (formData.get('full_name') as string)?.trim(),
    mini_bio: formData.get('mini_bio') as string,
    phone_contact: formData.get('phone_contact') as string,
    instagram_link: formData.get('instagram_link') as string,
    website: formData.get('website') as string,
    operating_cities_json: formData.get('operating_cities') as string,
    background_url: formData.get('background_url_existing') as string,
    profile_picture_url_existing: formData.get(
      'profile_picture_url_existing',
    ) as string,

    background_urls_existing: formData.get('background_urls_existing') as
      | string
      | null,

    background_images: [] as File[], // Será preenchido abaixo

    profile_picture: formData.get('profile_picture') as File,

    accepted_terms: formData.get('accepted_terms') === 'true',
    accepted_at: new Date().toISOString(),
  };
}

/**
 * Filtra arquivos válidos (não vazios)
 */
export function filterValidFiles(files: File[]): File[] {
  return files.filter((file) => file && file.size > 0);
}

/**
 * Verifica se há arquivos para upload
 */
export function hasFilesToUpload(files: File[]): boolean {
  return files.length > 0 && files[0].size > 0;
}
