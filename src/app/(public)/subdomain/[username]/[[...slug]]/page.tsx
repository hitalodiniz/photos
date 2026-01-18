import GaleriaBasePage from '@/components/gallery/GaleriaBasePage';
import {
  getPhotographerMetadata,
  getGalleryMetadata,
} from '@/lib/gallery/metadata-helper';

type Props = {
  params: Promise<{ username: string; slug?: string[] }>;
};

// 🎯 O Metadata também precisa ser unificado aqui
export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params;
  const { username, slug } = resolvedParams;

  // Se não tem slug, busca metadados do fotógrafo, senão da galeria
  if (!slug || slug.length === 0) {
    return await getPhotographerMetadata(username);
  }

  const fullSlug = `${username}/${slug.join('/')}`;
  return await getGalleryMetadata(fullSlug);
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params;

  // Passamos isSubdomainContext como true pois estamos dentro da pasta subdomain
  return <GaleriaBasePage params={resolvedParams} isSubdomainContext={true} />;
}
