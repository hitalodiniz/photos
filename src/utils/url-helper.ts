// src/lib/utils/url-helper.ts
import { GALLERY_MESSAGES } from '@/constants/messages';

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

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
    return `${protocol}//${photographer.username}.${MAIN_DOMAIN}/${finalPath}`;
  }

  const finalPath = slug.startsWith('/') ? slug.slice(1) : slug;
  return `${protocol}//${MAIN_DOMAIN}/${finalPath}`;
}

export function getWhatsAppShareLink(phone: string | null, message: string) {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
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
