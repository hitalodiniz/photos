import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/core/logic/galeria-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';
import { getImageUrl } from '@/core/utils/url-helper';
import PhotographerProfileContainer from '@/components/profile/PhotographerProfileContainer';
import { Metadata } from 'next';
import { SEO_CONFIG } from '@/core/config/seo.config';

type SubdomainGaleriaPageProps = {
  params: Promise<{
    username: string;
    slug?: string[]; // Opcional por causa do [[...slug]]
  }>;
};

export default async function SubdomainGaleriaPage({
  params,
}: SubdomainGaleriaPageProps) {
  const { username, slug } = await params;

  // 1. Tratamento da Raiz do Subdomínio
  if (!slug || slug.length === 0) {
    // Opcional: Você pode buscar uma galeria "vitrine" aqui ou manter o notFound
    return <PhotographerProfileContainer username={username} />;
  }

  const fullSlug = `${username}/${slug.join('/')}`;
  // 2. Busca os dados brutos
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  // Verificação detalhada para Debug
  if (!galeriaRaw) {
    notFound();
  }

  if (galeriaRaw.photographer?.username !== username) {
    console.error(
      `[Subdomain] Conflito de posse: Galeria pertence a ${galeriaRaw.photographer?.username}, mas acessada via ${username}`,
    );
    notFound();
  }

  if (!galeriaRaw.photographer?.use_subdomain) {
    console.error(
      `[Subdomain] O fotógrafo ${username} não tem permissão de subdomínio ativa.`,
    );
    notFound();
  }

  // 3. Formatação
  const galeriaData = formatGalleryData(galeriaRaw, username);
  galeriaData.slug = fullSlug;
  const coverUrl = getImageUrl(galeriaData.cover_image_url, 'w600');

  // 4. Verificação de senha
  if (!galeriaData.is_public) {
    const cookieStore = await cookies();
    const cookieKey = `galeria-${galeriaData.id}-auth`;
    const savedToken = cookieStore.get(cookieKey)?.value;

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

  // 5. Fotos do Drive
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
