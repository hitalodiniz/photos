// src/lib/gallery/metadata-helper.ts
import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getImageUrl, getProxyUrl } from '@/core/utils/url-helper';

export async function getGalleryMetadata(fullSlug: string): Promise<Metadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) {
    return { title: 'Galeria não encontrada | Sua Galeria de Fotos' };
  }

  const title = galeriaRaw.title;

  // 1. Montagem da Descrição Dinâmica
  const descriptionParts = [];
  if (galeriaRaw.client_name)
    descriptionParts.push(`Cliente: ${galeriaRaw.client_name}`);
  if (galeriaRaw.location) descriptionParts.push(galeriaRaw.location);
  if (galeriaRaw.date) {
    descriptionParts.push(
      new Date(galeriaRaw.date).toLocaleDateString('pt-BR'),
    );
  }

  // Inclui o fotógrafo sempre
  const photographerInfo = galeriaRaw.photographer?.full_name
    ? `Fotógrafo: ${galeriaRaw.photographer.full_name}`
    : '';

  // 2. Lógica de Privacidade vs Descrição Pública
  let description = '';
  if (!galeriaRaw.is_public) {
    description =
      `🔒 Galeria Privada - Digite sua senha para acessar. ${photographerInfo}`.trim();
  } else {
    if (photographerInfo) descriptionParts.push(photographerInfo);
    description =
      descriptionParts.length > 0
        ? descriptionParts.join(' | ')
        : 'Clique para acessar a galeria completa.';
  }

  // 3. Tratamento da Imagem (WhatsApp exige HTTPS e w1200)
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
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/${fullSlug}`,
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
    return { title: 'Fotografia não encontrada | Sua Galeria de Fotos' };
  }

  // Título focado na fotografia dentro da galeria
  const title = `Foto de ${galeriaRaw.title}`;

  // Descrição focada na visualização da foto
  const descriptionParts = [];
  if (galeriaRaw.location) descriptionParts.push(galeriaRaw.location);
  if (galeriaRaw.photographer?.full_name) {
    descriptionParts.push(`Fotógrafo: ${galeriaRaw.photographer.full_name}`);
  }

  // Texto amigável para o WhatsApp
  const description =
    descriptionParts.length > 0
      ? `${descriptionParts.join(' | ')}. Toque para ver em alta resolução.`
      : 'Toque para visualizar esta fotografia.';

  // 🎯 A Mágica: Substituímos a capa pela foto específica em alta definição (s1200)
  // O WhatsApp prefere HTTPS e imagens otimizadas
  const photoUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${getProxyUrl(googleId, '1600')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article', // 'article' é melhor para itens individuais
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/photo/${googleId}?s=${fullSlug}`,
      images: [
        {
          url: photoUrl,
          width: 1200,
          height: 630,
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [photoUrl],
    },
  };
}
