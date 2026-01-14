import { Metadata } from 'next';
import { getPhotoMetadata } from '@/lib/gallery/metadata-helper';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { headers } from 'next/headers';
import PhotoViewClient from './PhotoViewClient';

export async function generateMetadata({
  params,
  searchParams,
}: any): Promise<Metadata> {
  const { googleId } = await params;
  const sParams = await searchParams;

  // Lógica de resgate do Slug (sua técnica de debug/referer)
  let rawSlug = sParams?.s || '';
  if (!rawSlug) {
    const headersList = await headers();
    const fullUrl = headersList.get('referer') || '';
    if (fullUrl.includes('?s=')) {
      rawSlug = fullUrl.split('?s=')[1].split('&')[0];
      rawSlug = decodeURIComponent(rawSlug);
    }
  }
  const cleanSlug = rawSlug.replace(/^\/+/, '');

  // 1. Chama o seu helper que você enviou
  const baseMetadata = await getPhotoMetadata(cleanSlug, googleId);

  // 2. Mescla com as configurações globais do seu layout
  return {
    ...baseMetadata,
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL!),
    alternates: {
      canonical: `/photo/${googleId}?s=${cleanSlug}`,
    },
    // Mantém o ícone dourado padronizado do seu layout original
    icons: {
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'/><circle cx='12' cy='13' r='3'/></svg>",
    },
  };
}

export default async function Page({ params, searchParams }: any) {
  const resParams = await params;
  const resSearch = await searchParams;

  let rawSlug = resSearch?.s || '';
  if (!rawSlug) {
    const headersList = await headers();
    const fullUrl = headersList.get('referer') || '';
    if (fullUrl.includes('?s=')) {
      rawSlug = fullUrl.split('?s=')[1].split('&')[0];
      rawSlug = decodeURIComponent(rawSlug);
    }
  }

  const cleanSlug = rawSlug.replace(/^\/+/, '');
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
