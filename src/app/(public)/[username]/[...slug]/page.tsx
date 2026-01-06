// src/app/[username]/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/lib/gallery/gallery-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';
import { getGalleryMetadata } from '@/lib/gallery/metadata-helper';
import { getImageUrl } from '@/core/utils/url-helper';

export default async function UsernameGaleriaPage({
  params,
}: {
  params: Promise<{ username: string; slug: string[] }>;
}) {
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join('/')}`;

  // Execução limpa das lógicas
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) notFound();

  const galeriaData = formatGalleryData(galeriaRaw, username);
  const coverUrl = getImageUrl(galeriaData.cover_image_url, 'w600');

  galeriaData.slug = fullSlug;
  // Verificação de segurança
  if (!galeriaData.is_public) {
    const cookieStore = await cookies();
    const savedToken = cookieStore.get(`galeria-${galeriaData.id}-auth`)?.value;

    if (savedToken !== galeriaData.password) {
      return (
        <PasswordPrompt
          galeria={galeriaData}
          fullSlug={fullSlug}
          coverImageUrl={coverUrl}
        />
      );
    }
  }

  const photos = await fetchDrivePhotos(
    galeriaRaw.photographer?.id,
    galeriaData.drive_folder_id,
  );

  return <GaleriaView galeria={galeriaData} photos={photos} />;
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { username, slug } = await params;
  const fullSlug = Array.isArray(slug)
    ? `${username}/${slug.join('/')}`
    : `${username}/${slug}`;

  // 1. Busca os dados brutos
  const data = await getGalleryMetadata(fullSlug);

  // 2. Garante que a imagem seja tratada para o WhatsApp (HTTPS + Tamanho)
  // O link do Google Drive precisa ser convertido em link direto
  const ogImage = data.cover_image_url
    ? getImageUrl(data.cover_image_url, 'w1200') // Força HTTPS e tamanho 1200px
    : undefined;

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      ...data.openGraph,
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
    // Adiciona o Twitter Card para garantir compatibilidade total
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description,
      images: ogImage ? [ogImage] : [],
    },
  };
}
