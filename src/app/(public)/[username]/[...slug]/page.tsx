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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string[] }>;
}) {
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join('/')}`;

  const galeriaRaw = await fetchGalleryBySlug(fullSlug);
  if (!galeriaRaw) return { title: 'Galeria de Fotos' };

  // 🎯 Garante que o título da galeria não ultrapasse 40 caracteres
  const cleanTitle =
    galeriaRaw.title.length > 40
      ? `${galeriaRaw.title.substring(0, 37)}...`
      : galeriaRaw.title;

  return {
    title: cleanTitle,
  };
}
