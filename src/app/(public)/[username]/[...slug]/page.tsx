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

  // 1. Montagem do Título: "Corrida de rua - Cliente"
  const title = galeria.client_name
    ? `${galeria.title} - ${galeria.client_name}`
    : galeria.title;

  // 2. Montagem da Descrição Dinâmica
  // Exemplo: "Cliente: João | Local: Parque Ibirapuera | Data: 10/01/2024 | Fotógrafo: Hitalo Diniz"
  const descriptionParts = [];
  if (galeria.client_name)
    descriptionParts.push(`Cliente: ${galeria.client_name}`);
  if (galeria.location) descriptionParts.push(`Local: ${galeria.location}`);
  if (galeria.date)
    descriptionParts.push(
      `Data: ${new Date(galeria.date).toLocaleDateString('pt-BR')}`,
    );
  if (galeria.photographer?.full_name)
    descriptionParts.push(`Fotógrafo: ${galeria.photographer.full_name}`);

  const description =
    descriptionParts.length > 0
      ? descriptionParts.join(' | ')
      : 'Clique para acessar a galeria completa';

  // 3. Tratamento da Imagem
  const ogImageUrl = getImageUrl(galeria.cover_image_url, 'w1200');

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/${fullSlug}`,
      siteName: SEO_CONFIG.defaultTitle,
      locale: 'pt_BR',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Capa da galeria: ${title}`, // Melhora a acessibilidade e SEO
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [ogImageUrl],
    },
  };
}
