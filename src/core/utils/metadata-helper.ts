// src/lib/gallery/metadata-helper.ts
import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getDirectGoogleUrl } from '@/core/utils/url-helper';
import { getPublicProfile } from '@/core/services/profile.service';
import { SegmentType } from '../config/plans';
import { SEGMENT_DICTIONARY } from '../config/segments';

// 🎯 Definimos um tipo que estende o Metadata padrão para incluir o fullname
type GalleryMetadata = Metadata & { fullname?: string };
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://suagaleria.com.br';

const segment =
  (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';
const terms = SEGMENT_DICTIONARY[segment];

// No seu metadata-helper.ts

export async function getPhotoMetadata(
  fullSlug: string,
  googleId: string,
): Promise<Metadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) return { title: 'Foto não encontrada' };

  // URL Direta da foto
  // WhatsApp prefere JPEGs diretos. Forçamos o parâmetro de largura para garantir < 300KB
  const ogImage = googleId
    ? getDirectGoogleUrl(googleId, '800')
    : `${BASE_URL}/default-og.jpg`;

  const title = `${galeriaRaw.title} - Foto`;
  const description = `Veja esta foto na galeria ${galeriaRaw.title}.`;

  // URL absoluta da foto para o og:url
  const photoUrl = `${BASE_URL}/photo/${googleId}?s=${encodeURIComponent(fullSlug)}`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website', // 🎯 Resolve og:type
      url: photoUrl, // 🎯 Resolve og:url
      siteName: terms.site_name,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 800,
              height: 420,
              alt: title,
            },
          ]
        : [],
    },
  };
}

// 🎯 REPLIQUE A MESMA LÓGICA NO getPhotographerMetadata (Perfil do Supabase)
export async function getPhotographerMetadata(
  username: string,
): Promise<GalleryMetadata> {
  const profile = await getPublicProfile(username);
  if (!profile) {
    return { title: `${terms.singular} não encontrado | ${terms.site_name}` };
  }

  const title = `Portfólio de ${profile.full_name || username}`;
  const description =
    profile.mini_bio ||
    `Confira as galerias de ${terms.items} de ${profile.full_name || username}.`;
  const profileUrl = `${BASE_URL}/${username}`;

  // Tratamento da imagem do Supabase (Redimensionamento para evitar > 300KB)
  const rawImage = profile.photo_url || `${BASE_URL}/default-og-profile.jpg`;
  const ogImage = rawImage.includes('supabase.co')
    ? `${rawImage}?width=400&height=400&resize=contain&quality=80&format=jpg&ignore=.jpg`
    : rawImage;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    fullname: profile.full_name || '',
    openGraph: {
      title,
      description,
      type: 'website', // 🎯 Resolve og:type
      url: profileUrl, // 🎯 Resolve og:url
      siteName: terms.site_name,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 400,
              height: 400,
              type: 'image/jpeg',
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export async function getGalleryMetadata(
  fullSlug: string,
): Promise<GalleryMetadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) {
    return { title: `Galeria não encontrada | ${terms.site_name}` };
  }

  // 1. Extração de dados
  const fullname = galeriaRaw.photographer?.full_name || '';

  // 🎯 Título Nome da Galeria
  const title = galeriaRaw.title;

  // 2. Montagem da Descrição Dinâmica
  const descriptionParts = [];
  if (galeriaRaw.location) descriptionParts.push(galeriaRaw.location);
  if (galeriaRaw.date) {
    descriptionParts.push(
      new Date(galeriaRaw.date).toLocaleDateString('pt-BR'),
    );
  }

  // 3. Lógica de Privacidade vs Descrição Pública
  let description = '';
  if (!galeriaRaw.is_public) {
    description = `🔒 Galeria Privada - Digite sua senha para acessar.`;
  } else {
    // Adiciona o nome do autor à descrição se for pública
    if (fullname) descriptionParts.push(`Autor: ${fullname}`);
    description =
      descriptionParts.length > 0
        ? descriptionParts.join(' | ')
        : 'Clique para acessar a galeria completa.';
  }

  // 4. Tratamento da Imagem (OpenGraph)
  // 🎯 FALLBACK: Prefere URL direta (server-side), cliente fará fallback se necessário
  const ogImage = galeriaRaw.cover_image_url
    ? getDirectGoogleUrl(galeriaRaw.cover_image_url, '800')
    : null;
  const url = `${BASE_URL}/${fullSlug}`;

  return {
    title,
    description,
    fullname, // ⬅️ Agora retornado corretamente para uso externo
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 800,
              height: 420,
              type: 'image/jpeg',
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}
