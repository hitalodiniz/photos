// src/lib/gallery/metadata-helper.ts
import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getImageUrl } from '@/core/utils/url-helper';

export async function getGalleryMetadata(fullSlug: string): Promise<Metadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) {
    return { title: 'Galeria não encontrada | Sua Galeria de Fotos' };
  }

  const title = `${galeriaRaw.title} — ${galeriaRaw.client_name}`;
  const isPrivate = !galeriaRaw.is_public;
  const description = isPrivate
    ? '🔒 Galeria Privada - Digite sua senha para acessar.'
    : `Confira as fotos de ${galeriaRaw.title}. Fotografia por ${galeriaRaw.photographer?.full_name}.`;

  // 🎯 IMPORTANTE: WhatsApp exige HTTPS e prefere w1200 para o card grande
  const ogImage = galeriaRaw.cover_image_url
    ? getImageUrl(galeriaRaw.cover_image_url, 'w1200')
    : null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      // Se a imagem for nula, o array fica vazio
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
