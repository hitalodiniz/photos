// src/lib/gallery/metadata-helper.ts
import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getDirectGoogleUrl } from '@/core/utils/url-helper';
import { getPublicProfile } from '@/core/services/profile.service';

// 🎯 Definimos um tipo que estende o Metadata padrão para incluir o fullname
type GalleryMetadata = Metadata & { fullname?: string };
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://suagaleria.com.br';

// No seu metadata-helper.ts

export async function getPhotoMetadata(
  fullSlug: string,
  googleId: string,
): Promise<Metadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://suagaleria.com.br';

  if (!galeriaRaw) return { title: 'Foto não encontrada' };

  // URL Direta da foto
  const ogImage = googleId 
    ? getDirectGoogleUrl(googleId, '1200') 
    : `${baseUrl}/default-og.jpg`;

  const title = `${galeriaRaw.title} - Foto`;
  const description = `Veja esta foto na galeria ${galeriaRaw.title}.`;
  
  // URL absoluta da foto para o og:url
  const photoUrl = `${baseUrl}/photo/${googleId}?s=${encodeURIComponent(fullSlug)}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website', // 🎯 Resolve og:type
      url: photoUrl,   // 🎯 Resolve og:url
      siteName: 'Sua Galeria',
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
    // 🎯 RESOLVE OS ERROS DO DEBUGGER (Tags Explícitas)
    // other: {
    //   'og:url': photoUrl,
    //   'og:type': 'website',
    //   'og:image': ogImage,
    //   'og:image:width': '1200',
    //   'og:image:height': '630',
    //   'og:image:type': 'image/jpeg',
    //   'fb:app_id': process.env.NEXT_PUBLIC_FB_APP_ID || '', // 🎯 Resolve fb:app_id
    // }
  };
}

// 🎯 REPLIQUE A MESMA LÓGICA NO getPhotographerMetadata (Perfil do Supabase)
export async function getPhotographerMetadata(
  username: string,
): Promise<GalleryMetadata> {
  const profile = await getPublicProfile(username);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://suagaleria.com.br';

  if (!profile) {
    return { title: 'Fotógrafo não encontrado | Sua Galeria' };
  }

  const title = `Portfólio de ${profile.full_name || username}`;
  const description = profile.mini_bio || `Confira o trabalho e as galerias de ${profile.full_name || username}.`;
  const profileUrl = `${baseUrl}/${username}`;

  // Tratamento da imagem do Supabase (Redimensionamento para evitar > 300KB)
  const rawImage = profile.photo_url || `${baseUrl}/default-og-profile.jpg`;
  const ogImage = rawImage.includes('supabase.co') 
    ? `${rawImage}?width=1200&height=630&resize=contain&quality=70&.jpg`
    : rawImage;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    fullname: profile.full_name || '',
    openGraph: {
      title,
      description,
      type: 'profile', // 🎯 Resolve og:type
      url: profileUrl,  // 🎯 Resolve og:url
      siteName: 'Sua Galeria',
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
      images: [ogImage],
    },
    // // 🎯 RESOLVE OS ERROS DO DEBUGGER (Tags Explícitas)
    // other: {
    //   'og:url': profileUrl,
    //   'og:type': 'profile',
    //   'og:image': ogImage,
    //   'og:image:width': '1200',
    //   'og:image:height': '630',
    //   'fb:app_id': process.env.NEXT_PUBLIC_FB_APP_ID || '', // 🎯 Resolve fb:app_id (se tiver)
    // },
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