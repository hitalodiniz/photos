import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/lib/gallery/gallery-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';
import { getGalleryMetadata } from '@/lib/gallery/metadata-helper';
import { getImageUrl } from '@/utils/url-helper';

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
    notFound();
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

export async function generateMetadata({ params }: { params: any }) {
  const { username, slug } = await params;
  if (!slug) return {};
  const fullSlug = `${username}/${slug.join('/')}`;
  return getGalleryMetadata(fullSlug);
}
