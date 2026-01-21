// src/lib/gallery/metadata-helper.ts
import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getDirectGoogleUrl } from '@/core/utils/url-helper';
import { getPublicProfile } from '@/core/services/profile.service';

// 🎯 Definimos um tipo que estende o Metadata padrão para incluir o fullname
type GalleryMetadata = Metadata & { fullname?: string };

export async function getPhotographerMetadata(
  username: string,
): Promise<GalleryMetadata> {
  const profile = await getPublicProfile(username);

  if (!profile) {
    return { title: 'Fotógrafo não encontrado | Sua Galeria' };
  }

  const title = `Portfólio de ${profile.full_name || username}`;
  const description =
    profile.mini_bio ||
    `Confira o trabalho e as galerias de ${profile.full_name || username}.`;

  // 🎯 FALLBACK: Prefere URL direta (server-side), cliente fará fallback se necessário
  const ogImage = profile.photo_url
    ? getDirectGoogleUrl(profile.photo_url, '1200')
    : `${process.env.NEXT_PUBLIC_BASE_URL}/default-og-profile.jpg`;

  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/${username}`;

  return {
    title,
    description,
    fullname: profile.full_name || '',
    openGraph: {
      title,
      description,
      type: 'profile',
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Foto de perfil de ${profile.full_name || username}`,
        },
      ],
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
    return { title: 'Galeria não encontrada | Sua Galeria' };
  }

  // 1. Extração de dados
  const fullname = galeriaRaw.photographer?.full_name || '';
  // 🎯 Título composto: "Nome da Galeria | Nome do Fotógrafo"
  /*const title = fullname
    ? `${galeriaRaw.title} | ${fullname}`
    : galeriaRaw.title;*/
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
    ? getDirectGoogleUrl(galeriaRaw.cover_image_url, '1200')
    : null;
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/${fullSlug}`;

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
              width: 1200,
              height: 630,
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
/**
 * Gera metadados para uma foto específica do Lightbox/PhotoView
 */
export async function getPhotoMetadata(
  fullSlug: string,
  googleId: string,
): Promise<Metadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) {
    return { title: 'Foto não encontrada | Sua Galeria' };
  }

  // 🎯 Título: Nome da galeria + indicação de foto
  const title = `${galeriaRaw.title} - Foto`;

  // 🎯 Descrição otimizada para WhatsApp/Facebook
  const descriptionParts = [];
  
  // Adiciona informações relevantes
  if (galeriaRaw.location) {
    descriptionParts.push(`📍 ${galeriaRaw.location}`);
  }
  if (galeriaRaw.date) {
    descriptionParts.push(
      `📅 ${new Date(galeriaRaw.date).toLocaleDateString('pt-BR')}`,
    );
  }

  const photographerInfo = galeriaRaw.photographer?.full_name
    ? `📸 ${galeriaRaw.photographer.full_name}`
    : '';

  let description = '';
  if (!galeriaRaw.is_public) {
    description = `🔒 Galeria Privada. ${photographerInfo}`.trim();
  } else {
    if (photographerInfo) descriptionParts.push(photographerInfo);
    description =
      descriptionParts.length > 0
        ? descriptionParts.join(' • ')
        : 'Confira esta foto da galeria.';
  }

  // 🎯 Usa API route própria para garantir compatibilidade com WhatsApp/Facebook
  // A rota /api/og/photo serve a imagem em JPEG (não WebP) e com URL absoluta acessível
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const ogImage = googleId 
    ? `${baseUrl}/api/og/photo/${googleId}` 
    : null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${baseUrl}/photo/${googleId}?s=${fullSlug}`,
      images: ogImage 
        ? [{ 
            url: ogImage, 
            width: 1200, 
            height: 900, // Aspect ratio 4:3 funciona bem para fotos no WhatsApp
            alt: `${title}`,
            type: 'image/jpeg', // Garante que seja reconhecido como JPEG
          }] 
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
      creator: galeriaRaw.photographer?.full_name || undefined,
    },
  };
}
