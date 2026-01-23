// src/lib/gallery/metadata-helper.ts
import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getDirectGoogleUrl } from '@/core/utils/url-helper';
import { getPublicProfile } from '@/core/services/profile.service';

// 🎯 Definimos um tipo que estende o Metadata padrão para incluir o fullname
type GalleryMetadata = Metadata & { fullname?: string };
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://suagaleria.com.br';

export async function getPhotographerMetadata(
  username: string,
): Promise<GalleryMetadata> {
  const profile = await getPublicProfile(username);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://suagaleria.com.br';

  if (!profile) return { title: 'Fotógrafo não encontrado' };

  // 🎯 TRATAMENTO SUPABASE STORAGE:
  // Se a imagem for do Supabase, usamos parâmetros de transformação para reduzir de 2MB para ~50KB
  let ogImage = `${baseUrl}/default-og-profile.jpg`;

  if (profile.photo_url) {
    // Se for URL do Supabase, adicionamos parâmetros de otimização
    if (profile.photo_url.includes('supabase.co')) {
      ogImage = `${profile.photo_url}?width=800&height=600&resize=contain&quality=70`;
    } else {
      ogImage = profile.photo_url;
    }
  }

  const title = `Portfólio de ${profile.full_name || username}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description: profile.mini_bio || `Confira o trabalho de ${profile.full_name || username}.`,
    openGraph: {
      title,
      type: 'profile',
      url: `${baseUrl}/${username}`,
      siteName: 'Sua Galeria',
      images: [
        {
          url: ogImage, // ⬅️ Agora com tamanho reduzido
          width: 800,
          height: 600,
          type: 'image/jpeg',
        },
      ],
    },
    // ... restante do código
    other: {
      'google': 'notranslate',
      'og:image': ogImage, // ⬅️ Força a tag explicitamente como o erro sugeriu
    }
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://suagaleria.com.br';

  if (!galeriaRaw) {
    return { title: 'Foto não encontrada | Sua Galeria' };
  }

  // 🎯 URL DIRETA do Google (já otimizada pelo url-helper)
  const ogImage = googleId 
    ? getDirectGoogleUrl(googleId, '1200') 
    : `${baseUrl}/default-og-photo.jpg`;

  const title = `${galeriaRaw.title} - Foto`;
  const description = `Veja esta foto incrível na galeria de ${galeriaRaw.photographer?.full_name || 'Sua Galeria'}.`;
  const shareUrl = `${baseUrl}/photo/${googleId}?s=${encodeURIComponent(fullSlug)}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: shareUrl,
      siteName: 'Sua Galeria',
      images: [
        { 
          url: ogImage,
          width: 1200, 
          height: 630,
          type: 'image/jpeg',
          alt: title,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    // 🎯 RESOLVE "Propriedade Inferida": Força a tag explicitamente para o robô do WhatsApp
    other: {
      'og:image': ogImage,
      'image': ogImage,
    }
  };
}