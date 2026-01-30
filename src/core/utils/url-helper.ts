// src/lib/utils/url-helper.ts
import { GALLERY_MESSAGES } from '@/core/config/messages';
const NEXT_PUBLIC_MAIN_DOMAIN =
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

// Tempo de cache centralizado: 30 dias (em segundos)
// 60s * 60m * 24h * 30d = 2.592.000
export const GLOBAL_CACHE_REVALIDATE = 2592000;

// Tempo de cache para galerias e fotos: 30 minutos (em segundos)
// 60s * 30m = 1800
export const GALLERY_CACHE_REVALIDATE = 1800;

export const TAMANHO_MAXIMO_FOTO_SEM_COMPACTAR = 2 * 1024 * 1024; // 1.5MB em bytes;

export const RESOLUTIONS = {
  // 🎯 MINIATURAS E GRIDS
  THUMB: '400', // Miniaturas em grids (cards, masonry)

  // 🎯 VISUALIZAÇÃO (VIEW) - Otimizado para qualidade visual sem excesso de peso
  // Usado em: Lightbox, visualização de fotos individuais
  VIEW_MOBILE: '720', // 720p - Suficiente para telas mobile Retina (~500-700KB)
  VIEW_DESKTOP: '1080', // 1080p - Suficiente para visualização Full HD (~800KB-1.2MB)

  // 🎯 LEGADO (mantido para compatibilidade, mas preferir VIEW_*)
  MOBILE_VIEW: '1280', // @deprecated - Use VIEW_MOBILE ou VIEW_DESKTOP
  DESKTOP_VIEW: '1920', // @deprecated - Use VIEW_DESKTOP ou DOWNLOAD

  // 🎯 DOWNLOAD - Alta resolução apenas para download
  DOWNLOAD: '2560', // Alta resolução para downloads (2K)
  ULTRA_VIEW: '2560', // @deprecated - Use DOWNLOAD

  ULTRA_DOWNLOAD: '4000',
};

export function getPublicGalleryUrl(photographer: any, slug: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const protocol = isProd ? 'https:' : 'http:';

  // 1. Fallback de segurança para evitar o "undefined"
  const username = photographer?.username || 'autor';
  const mainDomain = NEXT_PUBLIC_MAIN_DOMAIN;

  // 2. Limpa o slug: remove o username se ele estiver no início
  let cleanPath = slug || '';
  if (username && cleanPath.startsWith(`${username}/`)) {
    cleanPath = cleanPath.replace(`${username}/`, '');
  }

  // 3. Remove barras extras no início ou fim
  const finalPath = cleanPath.replace(/^\/+|\/+$/g, '');

  // 4. Lógica de Subdomínio (Ex: hitalo.suagaleria.com.br/minha-galeria)
  if (photographer?.use_subdomain && username) {
    return `${protocol}//${username}.${mainDomain}/${finalPath}`;
  }

  // 5. Lógica de Domínio Principal (Ex: suagaleria.com.br/hitalo/minha-galeria)
  // 🎯 Aqui incluímos o username no path para o roteamento padrão funcionar
  return `${protocol}//${mainDomain}/${username}/${finalPath}`;
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
  } catch {
    return false;
  }
}

// src/core/utils/url-helper.ts

export function resolveGalleryUrl(
  username: string,
  slug: string,
  use_subdomain: boolean,
  mainDomain: string,
  protocol: string = 'https',
): string {
  const u = username.toLowerCase().trim();

  // Se receber "https://teste.site.com/", vira "teste.site.com"
  const cleanMainDomain = mainDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  // 1. Normaliza o slug: remove barras das extremidades
  let cleanPath = slug.replace(/^\/+|\/+$/g, '').trim();

  // 2. Remove o username se ele for o primeiro segmento do path
  // O Regex /^username(\/|$)/i garante que remova "hitalo" mas não "hitalo-eventos"
  const usernameRegex = new RegExp(`^${u}(\/|$)`, 'i');
  if (usernameRegex.test(cleanPath)) {
    cleanPath = cleanPath.replace(usernameRegex, '').replace(/^\/+/, '');
  }

  if (use_subdomain) {
    // 🎯 URL LIMPA: http://hitalo.localhost:3000/galeria
    return `${protocol}://${u}.${cleanMainDomain}${cleanPath ? `/${cleanPath}` : ''}`;
  }

  // URL CLÁSSICA: http://localhost:3000/hitalo/galeria
  return `${protocol}://${cleanMainDomain}/${u}${cleanPath ? `/${cleanPath}` : ''}`;
}
/**
 * Converte links de visualização do Google Drive em links de download direto.
 * Suporta formatos: /file/d/[ID]/view, /open?id=[ID], etc.
 */
export function convertToDirectDownloadUrl(url: string): string {
  // 🎯 TRAVA DE SEGURANÇA: Se não for Google Drive, retorna o link original intacto
  if (!url || !url.includes('drive.google.com')) return url;

  const regExp = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
  const matches = url.match(regExp);

  if (matches) {
    const fileId = matches[1] || matches[2];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
}

/**
 * 🎯 NOVO: Função para obter a URL do Perfil do Criativo
 * Resolve o problema do "undefined" nos links de avatar
 */
export function getCreatorProfileUrl(photographer: any) {
  const isProd = process.env.NODE_ENV === 'production';
  const protocol = isProd ? 'https:' : 'http:';
  const username = photographer?.username;
  const mainDomain = NEXT_PUBLIC_MAIN_DOMAIN;

  if (!username) return '#'; // Evita gerar URL se não houver username carregado

  if (photographer?.use_subdomain) {
    return `${protocol}//${username}.${mainDomain}`;
  }

  return `${protocol}//${mainDomain}/${username}`;
}

/**
 * Utilitários para tratamento de URLs de imagens do Google Drive
 */

/**
 * 🌐 URL EXTERNA (Client-side)
 * Para o PhotoGrid, usamos larguras menores para economizar banda.
 * O teto aqui é para exibição rápida.
 *
 * ⚠️ DEPRECATED: Use `useGoogleDriveImage` hook em componentes React
 * ou `getImageUrlWithFallback` para server-side.
 * Este método sempre retorna proxy, sem tentar direto primeiro.
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
 * 🎯 ESTRATÉGIA DE 1MB:
 * Mesmo para 'original', solicitamos uma largura máxima (ex: 4000px).
 * Isso força o Google a processar o arquivo de 25MB em um JPEG/WebP otimizado,
 * garantindo que o arquivo final fique próximo ou abaixo de 1MB.
 */
export const getInternalGoogleDriveUrl = (
  photoId: string | number,
  width: string | number = '2048', // Padrão otimizado para telas 2K
  format: 'webp' | 'original' = 'webp',
) => {
  const suffix = format === 'webp' ? '-rw' : '';

  // Se o formato for 'original' (para download), usamos w4000 para manter alta nitidez
  // mas sem o peso do arquivo RAW/Bruto de 25MB.
  const finalWidth = format === 'original' ? '4000' : width;

  // 🎯 Usamos o domínio lh3 que é mais performático e aceita redimensionamento
  return `https://lh3.googleusercontent.com/d/${photoId}=w${finalWidth}${suffix}`;
};

/**
 * 🖼️ URL DE ALTA RESOLUÇÃO (Lightbox)
 * 1920px é o "Sweet Spot" para telas Full HD/4K sem exceder 1MB.
 * 2560px (Qualidade profissional 2K)
 */
export const getHighResImageUrl = (photoId: string | number) => {
  if (!photoId) return '';
  return getProxyUrl(photoId, '2560');
};

/**
 * 📱 Seleciona o tamanho ideal baseado no dispositivo
 * Mobile: 1280px (Equilíbrio entre peso e nitidez)
 * Desktop: 2560px (Qualidade profissional 2K)
 */
export const getResponsiveHighResUrl = (
  photoId: string | number,
  isMobile: boolean,
) => {
  if (!photoId) return '';

  // Se for mobile, 1280px é mais que suficiente (mesmo para telas Pro Max)
  // Se for desktop, subimos para 2560px para garantir a "entrega de luxo"
  const size = isMobile ? RESOLUTIONS.MOBILE_VIEW : RESOLUTIONS.DESKTOP_VIEW;

  return getProxyUrl(photoId, size);
};

/**
 * 📥 URL DE DOWNLOAD
 * Agora aponta para a rota que entrega o "Original Otimizado" (Teto de 2MB).
 */
export const getDownloadUrl = (photoId: string | number) => {
  return getDownloadDirectGoogleUrl(photoId, RESOLUTIONS.DOWNLOAD);
};

/**
 * 🚀 VERSÃO DE ALTA PERFORMANCE (Bypass Vercel)
 * Usa o servidor do Google diretamente para não gastar os 10GB da Vercel.
 */
export const getDirectGoogleUrl = (
  photoId: string | number,
  width: string | number = '1000',
) => {
  if (!photoId) return '';

  // 🎯 Removendo qualquer prefixo de ID caso exista
  const cleanId = photoId.toString().trim();
  // 🎯 O domínio correto para renderizar arquivos do Drive é lh3.googleusercontent.com/d/
  // Parâmetros:
  // =w{width} -> define a largura
  // -rw -> força o formato WebP (mais leve)
  const url = `https://lh3.googleusercontent.com/d/${cleanId}=w${width}-rw`;

  // Log para você copiar e colar no navegador para testar
  // console.log(`[getDirectGoogleUrl] 🖼️ Gerada URL direta:`, {
  //   id: cleanId,
  //   resolution: width,
  //   fullUrl: url
  // });

  return url;
};

/**
 * 🚀 VERSÃO DE ALTA PERFORMANCE (Bypass Vercel)
 * Usa o servidor do Google diretamente para não gastar os 10GB da Vercel.
 */
export const getDownloadDirectGoogleUrl = (
  photoId: string | number,
  width: string | number = '1000',
) => {
  if (!photoId) return '';
  // Usamos o domínio lh3.googleusercontent.com que aceita CORS e redimensionamento
  return `https://lh3.googleusercontent.com/d/${photoId}=w${width}`;
};

/**
 * 📐 GUIA DE RESOLUÇÕES
 *
 * Para documentação completa sobre resoluções recomendadas e estratégia de 2MB,
 * consulte: PERFORMANCE_GUIDE.md na raiz do projeto.
 *
 * Resumo rápido:
 * - Grid: 500-600px
 * - Lightbox Mobile: 1280px
 * - Lightbox Desktop: 1920px
 * - Lightbox 4K: 2560px
 * - Download: 1920px (direto) / 2560px (proxy)
 *
 * Todas as resoluções garantem arquivos < 2MB sem verificação no cliente.
 */
