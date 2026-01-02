import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  fetchGalleryBySlug,
  formatGalleryData,
  fetchDrivePhotos,
} from '@/lib/gallery/gallery-logic';
import { GaleriaView, PasswordPrompt } from '@/components/gallery';

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

  console.log('🔥 CHEGOU NA PAGINA INTERNA!');
  console.log('📝 Params recebidos:', { username, slug });

  // 1. Tratamento da Raiz do Subdomínio
  if (!slug || slug.length === 0) {
    console.log(
      `[Subdomain] Usuário ${username} acessou a raiz. Redirecionando ou exibindo 404.`,
    );
    // Opcional: Você pode buscar uma galeria "vitrine" aqui ou manter o notFound
    notFound();
  }

  const fullSlug = `${username}/${slug.join('/')}`;
  console.log(`[Subdomain] Buscando galeria com slug: ${fullSlug}`);

  // 2. Busca os dados brutos
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  // Verificação detalhada para Debug
  if (!galeriaRaw) {
    console.error(
      `[Subdomain] Galeria não encontrada no banco para o slug: ${fullSlug}`,
    );
    notFound();
  }

  if (galeriaRaw.photographer?.username !== username) {
    console.error(
      `[Subdomain] Conflito de posse: Galeria pertence a ${galeriaRaw.photographer?.username}, mas acessada via ${username}`,
    );
    notFound();
  }
  console.log(
    `[Subdomain] Fotografo tem subdmonio:`,
    galeriaRaw.photographer?.use_subdomain,
  );
  if (!galeriaRaw.photographer?.use_subdomain) {
    console.error(
      `[Subdomain] O fotógrafo ${username} não tem permissão de subdomínio ativa.`,
    );
    notFound();
  }

  // 3. Formatação
  const galeriaData = formatGalleryData(galeriaRaw, username);
  galeriaData.slug = fullSlug;

  // 4. Verificação de senha
  if (!galeriaData.is_public) {
    const cookieStore = await cookies();
    const cookieKey = `galeria-${galeriaData.id}-auth`;
    const savedToken = cookieStore.get(cookieKey)?.value;

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

  // 5. Fotos do Drive
  const photos = await fetchDrivePhotos(
    galeriaRaw.photographer?.id,
    galeriaData.drive_folder_id,
  );

  return <GaleriaView galeria={galeriaData} photos={photos} />;
}

export async function generateMetadata({ params }: SubdomainGaleriaPageProps) {
  const { username, slug } = await params;
  if (!slug) return {};

  const fullSlug = `${username}/${slug.join('/')}`;
  const galeriaRaw = await fetchGalleryBySlug(fullSlug);

  if (!galeriaRaw) return {};

  const title = `${galeriaRaw.title} | ${galeriaRaw.client_name}`;
  return {
    title,
    openGraph: {
      title,
      images: galeriaRaw.cover_image_url ? [galeriaRaw.cover_image_url] : [],
    },
  };
}
