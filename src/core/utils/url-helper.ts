// src/lib/utils/url-helper.ts
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { PERMISSIONS_BY_PLAN, PlanKey, PlanPermissions } from '../config/plans';
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
  VIEW_MOBILE: '1280', // 720p - Suficiente para telas mobile Retina (~500-700KB)
  VIEW_DESKTOP: '1920', // 1080p - Suficiente para visualização Full HD (~800KB-1.2MB)

  // 🎯 LEGADO (mantido para compatibilidade, mas preferir VIEW_*)
  MOBILE_VIEW: '1280', // @deprecated - Use VIEW_MOBILE ou VIEW_DESKTOP
  DESKTOP_VIEW: '1920', // @deprecated - Use VIEW_DESKTOP ou DOWNLOAD

  // 🎯 DOWNLOAD - Alta resolução apenas para download
  DOWNLOAD: '2560', // Alta resolução para downloads (2K)
  ULTRA_VIEW: '2560', // @deprecated - Use DOWNLOAD

  // Limites de download por plano (zipSizeLimit do plans.ts)
  '500KB': '1080', // Plano FREE (Full HD leve)
  '1MB': '1600', // Plano START (HD Otimizado)
  '1.5MB': '2048', // Plano PLUS (QHD Otimizado)
  '2MB': '2560', // Plano PRO (2K Pro)
  '3MB': '4000', // Plano PREMIUM (4K Ultra)
  DEFAULT_DOWNLOAD: '2560',
  ULTRA_DOWNLOAD: '4000',
};

/**
 * 🛠️ FUNÇÃO INTERNA: Resolve a largura final baseada no input (Pixels ou Permissões)
 * Centraliza a inteligência de conversão entre os limites de peso (SaaS) e
 * as resoluções técnicas do Google (lh3).
 */
export const resolveResolutionByPlan = (
  planKeyOrWidth?: PlanKey | string | number,
): string => {
  if (!planKeyOrWidth) return RESOLUTIONS.DEFAULT_DOWNLOAD;

  // Se for uma PlanKey (PRO, PREMIUM, etc)
  if (
    typeof planKeyOrWidth === 'string' &&
    planKeyOrWidth in PERMISSIONS_BY_PLAN
  ) {
    const permissions = PERMISSIONS_BY_PLAN[planKeyOrWidth as PlanKey];
    const limitKey = permissions.zipSizeLimit; // Ex: '2MB'

    // Retorna a resolução mapeada para aquele limite de peso (ex: '2560')
    return (
      RESOLUTIONS[limitKey as keyof typeof RESOLUTIONS] ||
      RESOLUTIONS.DEFAULT_DOWNLOAD
    );
  }

  return planKeyOrWidth.toString().replace(/\D/g, '');
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

  // 4. Decide se deve usar subdomínio com base em photographer.use_subdomain
  const canUseSubdomain = photographer?.use_subdomain === true && !!username;

  if (canUseSubdomain) {
    // Ex: http://hitalo.dominio.com/galeria
    return `${protocol}//${username}.${mainDomain}/${finalPath}`;
  }

  // 5. Caminho clássico: ex: http://dominio.com/hitalo/galeria
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
  return GALLERY_MESSAGES.CARD_SHARE(galeria.title, url);
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
 * Se passar permissões, respeita a trava do plano (Estratégia de 1MB/2MB).
 */
// export const getInternalGoogleDriveUrl = (
//   photoId: string | number,
//   width: string | number = '2048', // Padrão otimizado para telas 2K
//   format: 'webp' | 'original' = 'webp',
// ) => {
//   const suffix = format === 'webp' ? '-rw' : '';

//   // Se o formato for 'original' (para download), usamos w4000 para manter alta nitidez
//   // mas sem o peso do arquivo RAW/Bruto de 25MB.
//   const finalWidth = format === 'original' ? '4000' : width;

//   // 🎯 Usamos o domínio lh3 que é mais performático e aceita redimensionamento
//   return `https://lh3.googleusercontent.com/d/${photoId}=w${finalWidth}${suffix}`;
// };

// /**
//  * 🖼️ URL DE ALTA RESOLUÇÃO (Lightbox)
//  * 1920px é o "Sweet Spot" para telas Full HD/4K sem exceder 1MB.
//  * 2560px (Qualidade profissional 2K)
//  */
// export const getHighResImageUrl = (photoId: string | number) => {
//   if (!photoId) return '';
//   return getProxyUrl(photoId, '2560');
// };

export const getInternalGoogleDriveUrl = (
  photoId: string | number,
  planOrWidth: PlanKey | string | number = '2048',
  format: 'webp' | 'original' = 'webp',
) => {
  if (!photoId) return '';
  const cleanId = photoId.toString().trim();
  const suffix = format === 'webp' ? '-rw' : '';

  // 🎯 Resolve a resolução:
  // Se for 'original', usamos w4000 apenas como teto técnico.
  // Caso contrário, resolvemos via plano ou valor numérico fornecido.
  const resolvedWidth =
    format === 'original' ? '4000' : resolveResolutionByPlan(planOrWidth);

  // 🎯 Endpoint lh3 performático com redimensionamento
  return `https://lh3.googleusercontent.com/d/${cleanId}=w${resolvedWidth}${suffix}`;
};

/**
 * 🖼️ URL DE ALTA RESOLUÇÃO (Lightbox)
 * Aplica a resolução baseada no plano ou o padrão de 2560px.
 * Sweet spot para telas Full HD/4K sem exceder o peso ideal de processamento.
 * ESTRATÉGIA: Usa o menor valor entre o teto do plano e o teto de 2560px.
 * Isso garante que usuários em planos menores não carreguem arquivos 2K/4K desnecessariamente.
 */
export const getHighResImageUrl = (
  photoId: string | number,
  planOrWidth?: PlanKey | string | number,
) => {
  if (!photoId) return '';

  // 1. Resolve a resolução baseada na chave do plano ou valor manual.
  // Fallback para RESOLUTIONS.DEFAULT_DOWNLOAD (2560) se nada for passado.
  const planResolution = resolveResolutionByPlan(
    planOrWidth || RESOLUTIONS.DEFAULT_DOWNLOAD,
  );

  // 2. Teto de Visualização: Mesmo que o plano suporte 4000px (Premium),
  // para visualização em Lightbox, limitamos a 2560px para garantir
  // que o arquivo carregue instantaneamente sem estourar 1MB.
  const finalResolution = Math.min(
    Number(planResolution),
    Number(RESOLUTIONS.DEFAULT_DOWNLOAD),
  ).toString();

  return getProxyUrl(photoId, finalResolution);
};
/**
 * 📱 Seleciona o tamanho ideal baseado no dispositivo
 * Mobile: 1280px (Equilíbrio entre peso e nitidez)
 * Desktop: 2560px (Qualidade profissional 2K)
 */
// export const getResponsiveHighResUrl = (
//   photoId: string | number,
//   isMobile: boolean,
// ) => {
//   if (!photoId) return '';

//   // Se for mobile, 1280px é mais que suficiente (mesmo para telas Pro Max)
//   // Se for desktop, subimos para 2560px para garantir a "entrega de luxo"
//   const size = isMobile ? RESOLUTIONS.VIEW_MOBILE : RESOLUTIONS.VIEW_DESKTOP;

//   return getProxyUrl(photoId, size);
// };

/**
 * 📱 Seleciona o tamanho ideal baseado no dispositivo, respeitando o teto do plano.
 * Mobile ideal: 1280px | Desktop ideal: 2560px
 */
export const getResponsiveHighResUrl = (
  photoId: string | number,
  isMobile: boolean,
  planOrWidth?: PlanKey | string | number,
) => {
  if (!photoId) return '';

  // 1. Define a resolução ideal baseada no hardware do usuário
  const deviceIdealSize = isMobile
    ? RESOLUTIONS.VIEW_MOBILE
    : RESOLUTIONS.VIEW_DESKTOP;

  // 2. Se houver permissões, resolve o teto máximo permitido pelo plano
  // Se não houver, assume o deviceIdealSize como fallback
  const planLimit = planOrWidth
    ? resolveResolutionByPlan(planOrWidth)
    : deviceIdealSize;

  // 3. Lógica de "Cap": Usamos o menor valor entre o ideal do dispositivo e o limite do plano.
  // Isso evita que um plano FREE carregue 2560px no Desktop,
  // e que um plano PREMIUM carregue 4000px desnecessariamente para visualização responsiva.
  const finalSize = Math.min(
    Number(deviceIdealSize),
    Number(planLimit),
  ).toString();

  return getProxyUrl(photoId, finalSize);
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
 *
 * VERSÃO DE ALTA PERFORMANCE (Bypass Vercel)
 */
// export const getDownloadDirectGoogleUrl = (
//   photoId: string | number,
//   width: string | number = '1000',
// ) => {
//   if (!photoId) return '';
//   // Usamos o domínio lh3.googleusercontent.com que aceita CORS e redimensionamento
//   return `https://lh3.googleusercontent.com/d/${photoId}=w${width}`;
// };

/* 📥 URL DE DOWNLOAD (INTEGRADA AO PLANO)
 * Adaptada para respeitar o zipSizeLimit do plano se as permissões forem fornecidas.
 * Se não forem passadas, mantém o comportamento padrão (2560px).
 *   Usa o servidor do Google diretamente para não gastar os 10GB da Vercel.
 */
export const getDownloadDirectGoogleUrl = (
  photoId: string | number,
  planOrWidth?: PlanKey | string | number,
) => {
  if (!photoId) return '';
  const cleanId = photoId.toString().trim();

  // Delega a decisão de resolução para o cérebro centralizador
  // Se receber o objeto PlanPermissions, resolve via zipSizeLimit.
  // Se receber PlanKey ('PRO'), resolve via mapa mestre.
  const finalWidth = resolveResolutionByPlan(planOrWidth);

  // Retorna a URL no padrão lh3 sem o sufixo -rw (mantendo fidelidade máxima para download)
  return `https://lh3.googleusercontent.com/d/${cleanId}=w${finalWidth}`;
};
/**
 * 📐 GUIA DE RESOLUÇÕES
 *
 *
 * Para documentação completa sobre resoluções recomendadas e estratégia de 2MB,
 * consulte: PERFORMANCE_GUIDE.md na raiz do projeto.
 *
 *
 * Resumo rápido:
 * - Grid: 500-600px
 * - Lightbox Mobile: 1280px
 * - Lightbox Desktop: 1920px
 * - Lightbox 4K: 2560px
 * - Download: 1920px (direto) / 2560px (proxy)
 *
 *
 * Todas as resoluções garantem arquivos < 2MB sem verificação no cliente.
 */
