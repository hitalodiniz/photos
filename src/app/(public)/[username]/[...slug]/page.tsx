import GaleriaBasePage from '@/features/galeria/GaleriaBasePage';
import {
  getPhotographerMetadata,
  getGalleryMetadata,
} from '@/core/utils/metadata-helper';

type Props = {
  params: Promise<{ username: string; slug?: string[] }>;
};

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params;
  const { username, slug } = resolvedParams;

  // Se não tem slug, metadados do perfil do fotógrafo
  if (!slug || slug.length === 0) {
    return await getPhotographerMetadata(username);
  }

  // Caso com slug: metadados da galeria
  const fullSlug = `${username}/${slug.join('/')}`;
  return await getGalleryMetadata(fullSlug);
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params;

  return <GaleriaBasePage params={resolvedParams} isSubdomainContext={false} />;
}
