import GaleriaBasePage, {
  generateMetadata as baseMetadata,
} from '@/components/gallery/GaleriaBasePage';

export const generateMetadata = baseMetadata;

export default async function Page({ params }: { params: Promise<any> }) {
  const resolvedParams = await params;
  return <GaleriaBasePage params={resolvedParams} isSubdomainContext={false} />;
}
