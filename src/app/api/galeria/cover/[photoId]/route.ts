import {
  getInternalGoogleDriveUrl,
  GLOBAL_CACHE_REVALIDATE,
} from '@/core/utils/url-helper';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> }, // Tipagem mais precisa
) {
  const resolvedParams = await params;
  const photoId = resolvedParams.photoId;

  if (!photoId) {
    return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const width = searchParams.get('w') || '1000';

  // 🎯 O helper já garante o sufixo '-rw' para WebP otimizado
  const googleUrl = getInternalGoogleDriveUrl(photoId, width, 'webp');

  try {
    const response = await fetch(googleUrl, {
      cache: 'force-cache',

      next: {
        revalidate: GLOBAL_CACHE_REVALIDATE,
        tags: [`cover-${photoId}`],
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Imagem indisponível no Drive' },
        { status: response.status },
      );
    }

    const buffer = await response.arrayBuffer();

    // 🚀 Edge Cache: Instruímos a Vercel a guardar esta imagem processada
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': `public, s-maxage=${GLOBAL_CACHE_REVALIDATE}, stale-while-revalidate=${GLOBAL_CACHE_REVALIDATE / 2}`,
      },
    });
  } catch (error: any) {
    console.error(`[PROXY ERROR] ID: ${photoId}`, error.message);
    return NextResponse.json(
      { error: 'Erro interno no proxy' },
      { status: 500 },
    );
  }
}
