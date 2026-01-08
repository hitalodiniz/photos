import PhotoViewClient from './PhotoViewClient';
import { getGalleryMetadata } from '@/lib/gallery/metadata-helper';

export async function generateMetadata({ params }: { params: any }) {
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join('/')}`;

  return await getGalleryMetadata(fullSlug);
}

export default async function Page({ params, searchParams }: any) {
  const resParams = await params;
  const resSearch = await searchParams;

  return <PhotoViewClient googleId={resParams.googleId} slug={resSearch.s} />;
}
