// src/lib/utils/url-helper.ts
import { GALLERY_MESSAGES } from '@/constants/messages';

const NEXT_PUBLIC_MAIN_DOMAIN =
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

export function getPublicGalleryUrl(photographer: any, slug: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const protocol = isProd ? 'https:' : 'http:';

  if (photographer?.use_subdomain && photographer.username) {
    // 🎯 REMOVE O USERNAME DO SLUG: Essencial para subdomínios
    const cleanSlug = slug.startsWith(`${photographer.username}/`)
      ? slug.replace(`${photographer.username}/`, '')
      : slug;

    const finalPath = cleanSlug.startsWith('/')
      ? cleanSlug.slice(1)
      : cleanSlug;
    return `${protocol}//${photographer.username}.${NEXT_PUBLIC_MAIN_DOMAIN}/${finalPath}`;
  }

  const finalPath = slug.startsWith('/') ? slug.slice(1) : slug;
  return `${protocol}//${NEXT_PUBLIC_MAIN_DOMAIN}/${finalPath}`;
}

export function getWhatsAppShareLink(phone: string | null, message: string) {
  // 1. Limpa o telefone para garantir que só tenha números
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

  // 2. Transforma emojis e quebras de linha em códigos seguros (UTF-8)
  // Isso evita que o navegador tente "adivinhar" o caractere e gere o erro ὏8
  const encodedText = encodeURIComponent(message);

  // 3. Retorna o link usando o padrão universal do WhatsApp
  if (!cleanPhone) {
    return `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function getLuxuryMessageData(galeria: any, url: string) {
  const date = galeria.date
    ? new Date(galeria.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : '';

  return GALLERY_MESSAGES.LUXURY_SHARE(
    galeria.client_name,
    galeria.title,
    date,
    url,
  );
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
}
/**
 * Utilitários para tratamento de URLs de imagens do Google Drive
 */

// Retorna a URL da imagem com um sufixo de tamanho específico (padrão w1000)
/**
 * Gera a URL da imagem com parâmetros de tamanho e qualidade.
 * @param photoId ID da foto no Google Drive
 * @param suffix Tamanho da imagem (ex: w800, w1000, s1600)
 * @param quality Nível de compressão (1-100)
 */
export const getImageUrl = (
  photoId: string | number,
  suffix: string = 'w1000',
) => {
  if (!photoId) return '';
  return `https://lh3.googleusercontent.com/d/${photoId}=${suffix}`;
};

// Retorna a URL da imagem em resolução máxima (Original)
export const getHighResImageUrl = (photoId: string | number) => {
  if (!photoId) return '';
  // "s0" indica o tamanho original sem compressão
  return `https://lh3.googleusercontent.com/d/${photoId}=s0`;
};
