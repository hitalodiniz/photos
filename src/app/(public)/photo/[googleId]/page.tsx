import { Metadata } from 'next';
import { getPhotoMetadata } from '@/core/utils/metadata-helper';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { headers } from 'next/headers';
import PhotoViewClient from './PhotoViewClient';

// Helper interno para extrair o slug com segurança
async function getSlugFromContext(searchParams: any): Promise<string> {
  let rawSlug = searchParams?.s || '';
  
  if (!rawSlug) {
    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    if (referer.includes('?s=')) {
      rawSlug = decodeURIComponent(referer.split('?s=')[1].split('&')[0]);
    }
  }
  
  return rawSlug.replace(/^\/+/, '');
}

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const { googleId } = await params;
  const sParams = await searchParams;
  const cleanSlug = await getSlugFromContext(sParams);

  // 🎯 Usa direto a função centralizada que já tem:
  // - MetadataBase configurada
  // - Tags explícitas (og:image:width, etc)
  // - URL direta do Google 1200x630
  return await getPhotoMetadata(cleanSlug, googleId);
}

export default async function Page({ params, searchParams }: any) {
  const resParams = await params;
  const resSearch = await searchParams;
  const cleanSlug = await getSlugFromContext(resSearch);

  const initialData = await fetchGalleryBySlug(cleanSlug);

  if (!initialData) {
    return (
      <div className="bg-black text-white min-h-screen flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-2xl font-semibold mb-4">Galeria não encontrada</h1>
        <p className="opacity-60 italic">Slug: {cleanSlug || 'Vazio'}</p>
      </div>
    );
  }

  return (
    <PhotoViewClient
      googleId={resParams.googleId}
      slug={cleanSlug}
      initialData={initialData}
    />
  );
}