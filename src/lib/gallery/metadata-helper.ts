// src/lib/gallery/metadata-helper.ts
import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getImageUrl } from '@/core/utils/url-helper';

export async function getGalleryMetadata(fullSlug: string): Promise<Metadata> {
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) {
    return { title: 'Galeria não encontrada | Sua Galeria' };
  }

  const title = galeriaRaw.title;

  // 1. Montagem da Descrição Dinâmica
  const descriptionParts = [];
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
    return { title: 'Foto não encontrada | Sua Galeria' };
  }

  // 1. Título focado na foto, herdando o título da galeria
  const title = `Foto - ${galeriaRaw.title}`;

  // 2. Montagem da Descrição Dinâmica (Igual à galeria)
  const descriptionParts = [];
  if (galeriaRaw.location) descriptionParts.push(galeriaRaw.location);
  if (galeriaRaw.date) {
    descriptionParts.push(
      new Date(galeriaRaw.date).toLocaleDateString('pt-BR'),
    );
  }

  const photographerInfo = galeriaRaw.photographer?.full_name
    ? `Fotógrafo: ${galeriaRaw.photographer.full_name}`
    : '';

  let description = '';
  if (!galeriaRaw.is_public) {
    description = `🔒 Foto em Galeria Privada. ${photographerInfo}`.trim();
  } else {
    if (photographerInfo) descriptionParts.push(photographerInfo);
    description =
      descriptionParts.length > 0
        ? descriptionParts.join(' | ')
        : 'Toque para ver a foto em alta resolução.';
  }

  // 3. Tratamento da Imagem (A parte crucial)
  // Usamos o padrão que o WhatsApp aceita para o Drive, garantindo HTTPS e tamanho
  // 3. Tratamento da Imagem (WhatsApp exige HTTPS e w1200)
  const ogImage = galeriaRaw.cover_image_url
    ? getImageUrl(galeriaRaw.cover_image_url, 'w1200')
    : null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article', // 'article' indica que é um conteúdo específico dentro de um site
      url: `${baseUrl}/photo/${googleId}?s=${fullSlug}`,
      images: [
        {
          url: ogImage,
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
      images: [ogImage],
    },
  };
}
