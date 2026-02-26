// src/core/utils/metadata-helper.ts
import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getPublicProfile } from '@/core/services/profile.service';
import { SegmentType } from '../config/plans';
import { SEGMENT_DICTIONARY } from '../config/segments';

type GalleryMetadata = Metadata & { fullname?: string };

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://suagaleria.com.br';
const segment =
  (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';
const terms = SEGMENT_DICTIONARY[segment];

/**
 * 🎯 HELPER: Extrai Google Drive ID de qualquer formato de URL
 */
function extractGoogleDriveId(url: string): string | null {
  if (!url) return null;

  // Padrões suportados:
  // - https://lh3.googleusercontent.com/d/ABC123=w1000-rw
  // - https://drive.google.com/file/d/ABC123/view
  // - ABC123 (ID direto)

  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/, // lh3 ou drive.google.com/file/d/
    /id=([a-zA-Z0-9_-]+)/, // drive.google.com/open?id=
    /^([a-zA-Z0-9_-]{20,})$/, // ID direto (min 20 chars)
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * 🎯 HELPER: Otimiza imagem para WhatsApp
 *
 * CRÍTICO para WhatsApp:
 * 1. Formato JPEG (não WebP) - WhatsApp não processa WebP corretamente
 * 2. Tamanho < 300KB - WhatsApp bloqueia imagens maiores
 * 3. Dimensões corretas - 1200x630 ou 800x800
 * 4. URL absoluta - Protocolo HTTPS obrigatório
 *
 * SOLUÇÃO: Remove sufixo -rw do Google Drive para forçar JPEG
 */
function optimizeImageForWhatsApp(
  imageUrl: string | null,
  width: number = 1200,
): string | null {
  if (!imageUrl) return null;

  // 1️⃣ GOOGLE DRIVE - Extrai ID e força JPEG
  if (
    imageUrl.includes('lh3.googleusercontent.com') ||
    imageUrl.includes('drive.google.com')
  ) {
    const photoId = extractGoogleDriveId(imageUrl);
    if (photoId) {
      // ✅ SEM -rw no final = JPEG (não WebP)
      // ✅ Compressão automática pelo Google baseada em width
      // ✅ Resultado: ~200-300KB em JPEG de alta qualidade
      return `https://lh3.googleusercontent.com/d/${photoId}=w${width}`;
    }
  }

  // 2️⃣ SUPABASE STORAGE - Força JPEG com compressão
  if (imageUrl.includes('supabase.co')) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}width=${width}&quality=75&format=jpg`;
  }

  // 3️⃣ QUALQUER OUTRA URL - Retorna original
  return imageUrl;
}

/**
 * 🎯 HELPER: Cria objeto de imagem OG completo
 * Com TODAS as tags que o WhatsApp exige
 */
function createOGImage(
  url: string | null,
  alt: string,
  width: number = 1200,
  height: number = 630,
) {
  if (!url) return [];

  return [
    {
      url, // URL absoluta HTTPS
      width, // Largura explícita
      height, // Altura explícita
      type: 'image/jpeg', // CRÍTICO: WhatsApp exige tipo explícito
      alt, // Acessibilidade
    },
  ];
}

// =========================================================================
// 1️⃣ METADATA DE FOTO INDIVIDUAL
// =========================================================================

export async function getPhotoMetadata(
  fullSlug: string,
  googleId: string,
): Promise<Metadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) {
    return {
      title: 'Foto não encontrada',
      description: `Foto não encontrada - ${terms.site_name}`,
    };
  }

  // 🎯 Monta URL base do Google (sem otimização ainda)
  const googleBaseUrl = `https://lh3.googleusercontent.com/d/${googleId}=w1200`;

  // 🎯 Otimiza para WhatsApp (força JPEG, < 300KB)
  const ogImage = optimizeImageForWhatsApp(googleBaseUrl, 1200);

  const title = `${galeriaRaw.title} - Foto`;
  const description = `Veja esta foto exclusiva da galeria ${galeriaRaw.title}.`;
  const photoUrl = `${BASE_URL}/photo/${googleId}?s=${encodeURIComponent(fullSlug)}`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,

    // ✅ Tags OG completas para WhatsApp
    openGraph: {
      title,
      description,
      type: 'website',
      url: photoUrl,
      siteName: terms.site_name,
      images: createOGImage(ogImage, title, 1200, 630),
      locale: 'pt_BR',
    },

    // ✅ Twitter Card (fallback)
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },

    // ✅ Canonical URL
    alternates: {
      canonical: photoUrl,
    },
  };
}

// =========================================================================
// 2️⃣ METADATA DE PERFIL DO FOTÓGRAFO
// =========================================================================

export async function getPhotographerMetadata(
  username: string,
): Promise<GalleryMetadata> {
  const profile = await getPublicProfile(username);

  if (!profile) {
    return {
      title: `${terms.singular} não encontrado | ${terms.site_name}`,
      description: `Perfil não encontrado - ${terms.site_name}`,
    };
  }

  const title = `${profile.full_name || username} - ${terms.singular}`;
  const description =
    profile.mini_bio ||
    `Confira o portfólio completo de ${terms.items} de ${profile.full_name || username}.`;
  const profileUrl = `${BASE_URL}/${username}`;

  // 🎯 Foto do perfil - tenta profile_picture_url primeiro, depois photo_url
  const rawImage = profile.profile_picture_url || profile.photo_url;

  // 🎯 Otimiza para WhatsApp (800x800 para perfil quadrado)
  const ogImage = optimizeImageForWhatsApp(rawImage, 800);

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    fullname: profile.full_name || '',

    // ✅ Tags OG completas para WhatsApp
    openGraph: {
      title,
      description,
      type: 'profile', // Tipo específico para perfis
      url: profileUrl,
      siteName: terms.site_name,
      images: createOGImage(
        ogImage,
        `Foto de perfil de ${profile.full_name || username}`,
        800,
        800,
      ),
      locale: 'pt_BR',
    },

    // ✅ Twitter Card
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },

    // ✅ Canonical URL
    alternates: {
      canonical: profileUrl,
    },
  };
}

// =========================================================================
// 3️⃣ METADATA DE GALERIA
// =========================================================================

export async function getGalleryMetadata(
  fullSlug: string,
): Promise<GalleryMetadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) {
    return {
      title: `Galeria não encontrada | ${terms.site_name}`,
      description: `Galeria não encontrada - ${terms.site_name}`,
    };
  }

  const fullname = galeriaRaw.photographer?.full_name || '';
  const title = galeriaRaw.title;

  // Montagem da descrição
  const descriptionParts = [];
  if (galeriaRaw.location) descriptionParts.push(galeriaRaw.location);
  if (galeriaRaw.date) {
    descriptionParts.push(
      new Date(galeriaRaw.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    );
  }

  let description = '';
  if (!galeriaRaw.is_public) {
    description = `🔒 Galeria Privada - Digite sua senha para acessar as ${terms.items}.`;
  } else {
    if (fullname) descriptionParts.push(`Por ${fullname}`);
    description =
      descriptionParts.length > 0
        ? descriptionParts.join(' • ')
        : `Confira esta galeria exclusiva de ${terms.items}.`;
  }

  // 🎯 Imagem de capa - converte cover_image_url para URL do Google
  let ogImage: string | null = null;
  if (galeriaRaw.cover_image_url) {
    const coverId = extractGoogleDriveId(galeriaRaw.cover_image_url);
    if (coverId) {
      const googleBaseUrl = `https://lh3.googleusercontent.com/d/${coverId}=w1200`;
      ogImage = optimizeImageForWhatsApp(googleBaseUrl, 1200);
    }
  }

  const url = `${BASE_URL}/${fullSlug}`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    fullname,

    // ✅ Tags OG completas para WhatsApp
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: terms.site_name,
      images: createOGImage(ogImage, `Capa da galeria ${title}`, 1200, 630),
      locale: 'pt_BR',
    },

    // ✅ Twitter Card
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },

    // ✅ Canonical URL
    alternates: {
      canonical: url,
    },

    // ✅ Meta tags adicionais
    other: {
      'article:author': fullname || undefined,
    },
  };
}
