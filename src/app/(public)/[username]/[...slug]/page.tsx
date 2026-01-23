import GaleriaBasePage from '@/features/galeria/GaleriaBasePage';
import {
  generateMetadata as baseMetadata,
} from '@/features/galeria/GaleriaBasePage';

export const generateMetadata = baseMetadata;

export default async function Page({ params }: { params: Promise<any> }) {
  const resolvedParams = await params;
  return <GaleriaBasePage params={resolvedParams} isSubdomainContext={false} />;
}
