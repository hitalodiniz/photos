// src/app/[username]/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/core/logic/galeria-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';
import { getImageUrl } from '@/core/utils/url-helper';
import {} from '@/core/services/galeria.service';
import { SEO_CONFIG } from '@/core/config/seo.config';

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
  const galeria = await fetchGalleryBySlug(fullSlug);

  if (!galeria) return { title: 'Galeria não encontrada' };

  // 1. Troca o parâmetro s0 por s1200 para reduzir o peso do arquivo
  // O WhatsApp ignora imagens muito pesadas.
  const ogImageUrl = getImageUrl(galeria.cover_image_url, 'w1200');

  return {
    title: `${galeria.title} - Galeria de Fotos`,
    description: `Veja as fotos de ${galeria.photographer?.full_name}`,
    openGraph: {
      title: galeria.title,
      description: `Clique para acessar a galeria completa`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/${fullSlug}`,
      siteName: SEO_CONFIG.defaultTitle,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImageUrl],
    },
  };
}
