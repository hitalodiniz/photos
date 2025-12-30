// src/app/[username]/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/lib/gallery/gallery-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';

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

  // Verificação de segurança
  if (!galeriaData.is_public) {
    const cookieStore = await cookies();
    const savedToken = cookieStore.get(`galeria-${galeriaData.id}-auth`)?.value;

    if (savedToken !== galeriaData.password) {
      return (
        <PasswordPrompt
          galeriaTitle={galeriaData.title}
          galeriaId={galeriaData.id}
          fullSlug={fullSlug}
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
