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
  // 3. Lógica de Subdomínio
  if (photographer?.use_subdomain && photographer.username) {
    // 🎯 Aqui garantimos que o protocolo detectado (http no localhost) seja aplicado
    return `${protocol}//${photographer.username}.${NEXT_PUBLIC_MAIN_DOMAIN}/${finalPath}`;
  }

  // 4. Lógica de Domínio Principal
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

/**
 * 🌐 URL EXTERNA (Client-side)
 * Usada nos componentes (img, a) para chamar o seu Proxy.
 * Garante o Cache da Vercel e evita o erro 429.
 */
export const getProxyUrl = (
  id: string | number,
  width: string | number = '1000',
) => {
  if (!id) return '';
  const cleanWidth = width.toString().replace(/[ws]/gi, '');
  return `/api/galeria/cover/${id}?w=${cleanWidth}`;
};

/**
 * 🔒 URL INTERNA (Server-side)
 * Usada APENAS dentro do seu route.ts para buscar a imagem no Google Drive.
 * @param format 'webp' para visualização nítida ou 'original' para download.
 */
export const getInternalGoogleDriveUrl = (
  photoId: string | number,
  width: string | number = '1000',
  format: 'webp' | 'original' = 'webp',
) => {
  const suffix = format === 'webp' ? '-rw' : '';
  // sz=w1000-rw solicita WebP ao Google
  return `https://drive.google.com/thumbnail?id=${photoId}&sz=w${width}${suffix}`;
};

/**
 * 🖼️ URL DE ALTA RESOLUÇÃO
 * Retorna a URL para o Lightbox com limite reduzido.
 * 1600px é seguro para a cota da Vercel e rápido para o usuário.
 */
export const getHighResImageUrl = (photoId: string | number) => {
  if (!photoId) return '';
  // Alterado de 2048 para 1600 para maior economia de banda
  return getProxyUrl(photoId, '1600');
};

/**
 * 📥 URL DE DOWNLOAD
 * Aponta para a rota de download que redimensiona para 3000px.
 */
export const getDownloadUrl = (photoId: string | number) => {
  return `/api/galeria/download/${photoId}`;
};
