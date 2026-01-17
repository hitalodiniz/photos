// src/app/[username]/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/core/logic/galeria-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';
import { getHighResImageUrl, getProxyUrl } from '@/core/utils/url-helper';
import {} from '@/core/services/galeria.service';
import { getGalleryMetadata } from '@/lib/gallery/metadata-helper';

// 🎯 Define que TODA essa rota (incluindo os filhos) é estática
export const dynamic = 'force-static';
export const revalidate = 86400; // 24 horas

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

  galeriaData.slug = fullSlug;
  // Verificação de segurança
  if (!galeriaData.is_public) {
    const cookieStore = await cookies();
    const savedToken = cookieStore.get(`galeria-${galeriaData.id}-auth`)?.value;

    if (savedToken !== galeriaData.password) {
      // 🎯 REVISÃO DO PROXY:
      // Alterado de getHighResImageUrl (1920px) para getProxyUrl (1000px).
      // Isso garante que a tela de bloqueio carregue instantaneamente,
      // poupando banda para a galeria real que vem a seguir.
      const coverUrl = getProxyUrl(galeriaData.cover_image_url, '1000');
      return (
        <PasswordPrompt
          galeria={galeriaData}
          fullSlug={fullSlug}
          coverImageUrl={coverUrl}
        />
      );
    }
  }

  const { photos, error } = await fetchDrivePhotos(
    galeriaRaw.photographer?.id,
    galeriaData.drive_folder_id,
  );

  return <GaleriaView galeria={galeriaData} photos={photos} />;
}

export async function generateMetadata({ params }: { params: any }) {
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join('/')}`;

  return await getGalleryMetadata(fullSlug);
}
