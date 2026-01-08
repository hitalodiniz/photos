import PhotoViewClient from './PhotoViewClient';
import { getPhotoMetadata } from '@/lib/gallery/metadata-helper';

export async function generateMetadata({ params, searchParams }: any) {
  const { googleId } = await params;
  const sParams = await searchParams;
  const rawSlug = sParams.s || '';
  const fullSlug = rawSlug.startsWith('/') ? rawSlug.substring(1) : rawSlug;

  return await getPhotoMetadata(fullSlug, googleId);
}

export default async function Page({ params, searchParams }: any) {
  const resParams = await params;
  const resSearch = await searchParams;

  return <PhotoViewClient googleId={resParams.googleId} slug={resSearch.s} />;
}
