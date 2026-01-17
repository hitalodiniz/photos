import { notFound } from 'next/navigation';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/core/logic/galeria-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';
import { getProxyUrl, GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';
import PhotographerContainer from '@/components/photographer/PhotographerContainer';
import { getGalleryMetadata } from '@/lib/gallery/metadata-helper';
import { checkGalleryAccess } from '@/core/logic/auth-gallery';
import { getProfileMetadataInfo } from '@/core/services/profile.service';

//AJUSTE CRÍTICO: Remova 'force-static' se a galeria tiver senha.
// Para galerias com proteção, o Next.js precisa validar o cookie a cada requisição.
export const dynamic = 'force-dynamic';
export const revalidate = GLOBAL_CACHE_REVALIDATE;

type SubdomainGaleriaPageProps = {
  params: Promise<{
    username: string;
    slug?: string[]; // Opcional por causa do [[...slug]]
  }>;
};

export default async function SubdomainGaleriaPage({
  params,
}: SubdomainGaleriaPageProps) {
  const resolvedParams = await params; // 🎯 Resolva primeiro sem desestruturar
  const username = resolvedParams.username;
  const slug = resolvedParams.slug;

  // Check de segurança antes de qualquer lógica
  if (!slug || slug.length === 0) {
    return <PhotographerContainer username={username} />;
  }

  const fullSlug = `${username}/${slug.join('/')}`;

  // 2. Busca os dados brutos
  // Dispara as duas promessas ao mesmo tempo
  const galeriaPromise = fetchGalleryBySlug(fullSlug);

  // Aguarda a primeira apenas para pegar o ID da pasta necessária para a segunda
  const galeriaRaw = await galeriaPromise;

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

  // 4. Verificação de senha
  console.log('galeriaData.is_public', galeriaData.is_public);
  if (!galeriaData.is_public) {
    const isAuthorized = await checkGalleryAccess(galeriaData.id);
    console.log('isAuthorized', isAuthorized);
    if (!isAuthorized) {
      const coverUrl = getProxyUrl(galeriaData.cover_image_url);
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
        <h2 className="text-2xl font-semibold text-red-600">Acesso Negado</h2>
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug?: string[] }>;
}) {
  const { username, slug } = await params;

  // Se for a Home do fotógrafo (sem slug)
  if (!slug || slug.length === 0) {
    const profile = await getProfileMetadataInfo(username); // 🎯 Usa o cache persistente

    return {
      title: `Portfólio de ${profile?.full_name || username}`,
      description: `Conheça o trabalho de ${profile?.full_name || username}.`,
      openGraph: {
        images: profile?.profile_picture_url
          ? [profile.profile_picture_url]
          : [],
      },
    };
  }

  try {
    // 2. Para a Galeria, usamos o getGalleryMetadata que você já ajustou para trazer o fullname
    const fullSlug = `${username}/${slug.join('/')}`;
    const metadata = await getGalleryMetadata(fullSlug);

    // Se a galeria não existir (ex: slug inválido), o getGalleryMetadata já retorna "Não encontrada"
    return {
      ...metadata,
      openGraph: {
        ...metadata.openGraph,
        authors: metadata.fullname ? [metadata.fullname] : [],
      },
    };
  } catch (error) {
    console.error('Erro ao gerar metadados da galeria:', error);
    return { title: `Galeria | ${username}` };
  }
}
