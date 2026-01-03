// src/lib/gallery/metadata-helper.ts
import { fetchGalleryBySlug } from '@/lib/gallery/gallery-logic';

export async function getGalleryMetadata(fullSlug: string) {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);
  if (!galeriaRaw) return { title: 'Galeria não encontrada' };

  const title = `${galeriaRaw.title} — ${galeriaRaw.client_name}`;
  const isPrivate = !galeriaRaw.is_public;
  const description = isPrivate
    ? '🔒 Galeria Privada - Digite sua senha para acessar.'
    : `Confira as fotos de ${galeriaRaw.title}. Fotografia por ${galeriaRaw.photographer?.full_name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: galeriaRaw.cover_image_url ? [galeriaRaw.cover_image_url] : [],
      type: 'website',
    },
  };
}
