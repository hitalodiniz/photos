import { notFound } from 'next/navigation';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/core/logic/galeria-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';
import { getImageUrl } from '@/core/utils/url-helper';
import PhotographerProfileContainer from '@/components/profile/PhotographerProfileContainer';
import { getGalleryMetadata } from '@/lib/gallery/metadata-helper';
import { checkGalleryAccess } from '@/core/logic/auth-gallery';

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

  //`[Subdomain] Conflito de posse: Galeria pertence a ${galeriaRaw.photographer?.username}, mas acessada via ${username}`,
  if (galeriaRaw.photographer?.username !== username) {
    notFound();
  }

  //[Subdomain] O fotógrafo ${username} não tem permissão de subdomínio ativa.`,
  if (!galeriaRaw.photographer?.use_subdomain) {
    notFound();
  }

  // 3. Formatação
  const galeriaData = formatGalleryData(galeriaRaw, username);
  galeriaData.slug = fullSlug;
  const coverUrl = getImageUrl(galeriaData.cover_image_url, 'w600');

  // 4. Verificação de senha
  console.log('galeriaData.is_public', galeriaData.is_public);
  if (!galeriaData.is_public) {
    const isAuthorized = await checkGalleryAccess(galeriaData.id);
    console.log('isAuthorized', isAuthorized);
    if (!isAuthorized) {
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

  // Se houver erro de permissão, exibe uma mensagem clara
  if (error === 'PERMISSION_DENIED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600">Acesso Negado</h2>
        <p className="mt-2 text-gray-600">
          Esta pasta do Google Drive não possui permissões de acesso público.
          Por favor, altere as configurações da pasta para "Qualquer pessoa com
          o link.
        </p>
      </div>
    );
  }
  return <GaleriaView galeria={galeriaData} photos={photos} />;
}

export async function generateMetadata({ params }: { params: any }) {
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join('/')}`;

  return await getGalleryMetadata(fullSlug);
}
