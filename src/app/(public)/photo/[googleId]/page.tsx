import PhotoViewClient from './PhotoViewClient';
import { getPhotoMetadata } from '@/lib/gallery/metadata-helper';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { headers } from 'next/headers';

export async function generateMetadata({ params, searchParams }: any) {
  const { googleId } = await params;
  const sParams = await searchParams;
  const rawSlug = sParams.s || '';

  // Limpa o slug: remove barra inicial e garante que não seja nulo
  const cleanSlug = rawSlug.replace(/^\/+/, '');

  return await getPhotoMetadata(cleanSlug, googleId);
}

export default async function Page({ params, searchParams }: any) {
  const resParams = await params;
  const resSearch = await searchParams;

  // 🎯 TÉCNICA DE RESGATE: Se o resSearch.s falhar, tentamos ler do header de URL
  let rawSlug = resSearch?.s || '';

  if (!rawSlug) {
    const headersList = await headers();
    const fullUrl = headersList.get('referer') || '';
    // O referer ou outros headers costumam conter a URL completa
    if (fullUrl.includes('?s=')) {
      rawSlug = fullUrl.split('?s=')[1].split('&')[0];
      rawSlug = decodeURIComponent(rawSlug);
    }
  }

  const cleanSlug = rawSlug.replace(/^\/+/, '');

  // console.log('--- DEBUG FINAL ---');
  // console.log('GOOGLE ID:', resParams.googleId);
  //console.log('SLUG FINAL:', cleanSlug);

  const initialData = await fetchGalleryBySlug(cleanSlug);

  if (!initialData) {
    return (
      <div className="bg-black text-white min-h-screen flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Galeria não encontrada</h1>
        <p className="opacity-60 italic">Slug: {cleanSlug || 'Vazio'}</p>
        <p className="mt-4 text-xs opacity-40">ID: {resParams.googleId}</p>
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
