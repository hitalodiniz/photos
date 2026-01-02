// src/lib/utils/url-helper.ts

import { GALLERY_MESSAGES } from '@/constants/messages';

interface PhotographerInfo {
  username?: string;
  use_subdomain?: boolean;
}

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

export function getPublicGalleryUrl(
  photographer: PhotographerInfo | undefined,
  slug: string,
) {
  // 1. Define o protocolo (Sempre https em produção, http em local)
  const isProd = process.env.NODE_ENV === 'production';
  const protocol = isProd ? 'https:' : 'http:';

  // 2. Fallback caso não tenhamos os dados do fotógrafo
  if (!photographer || !photographer.username) {
    return `${protocol}//${MAIN_DOMAIN}/${slug.startsWith('/') ? slug.slice(1) : slug}`;
  }

  const { username, use_subdomain } = photographer;

  // 3. Lógica para Subdomínio (Pro)
  if (use_subdomain) {
    // Remove o "username/" do início do slug para a URL do subdomínio ficar limpa
    const cleanSlug = slug.startsWith(`${username}/`)
      ? slug.replace(`${username}/`, '')
      : slug;

    // Remove barra inicial se houver para evitar "//"
    const finalPath = cleanSlug.startsWith('/')
      ? cleanSlug.slice(1)
      : cleanSlug;

    return `${protocol}//${username}.${MAIN_DOMAIN}/${finalPath}`;
  }

  // 4. Lógica para URL padrão (Gratuito)
  const finalPath = slug.startsWith('/') ? slug.slice(1) : slug;
  return `${protocol}//${MAIN_DOMAIN}/${finalPath}`;
}

export function getWhatsAppShareLink(phone: string | null, message: string) {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Centraliza a geração do link de compartilhamento de luxo
 */
export function getLuxuryWhatsAppLink(galeria: any, url: string) {
  const date = galeria.date
    ? new Date(galeria.date).toLocaleDateString('pt-BR')
    : '';

  const message = GALLERY_MESSAGES.LUXURY_SHARE(
    galeria.client_name,
    galeria.title,
    date,
    url,
  );

  return getWhatsAppShareLink(galeria.client_whatsapp, message);
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Erro ao copiar:', err);
    return false;
  }
}
