// app/api/galeria/[id]/photos/route.ts
import { NextResponse } from 'next/server';
import { fetchPhotosByGalleryId } from '@/core/logic/galeria-logic';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ photos: [], error: 'ID da galeria ausente' }, { status: 400 });
    }

    // 🎯 Centraliza a lógica de busca usando o helper que já gerencia cache e dual strategy (API Key + OAuth)
    const result = await fetchPhotosByGalleryId(id);

    if (result.error === 'GALLERY_NOT_FOUND') {
      return NextResponse.json({ photos: [], error: 'Galeria não encontrada' }, { status: 404 });
    }

    // const totalElapsed = Date.now() - startTime;
    // console.log(`[API /galeria/${id}/photos] Completed in ${totalElapsed}ms. Photos found: ${result.photos?.length || 0}`);

    return NextResponse.json(
      { photos: result.photos || [], error: result.error },
      {
        headers: {
          // Cache de 30 minutos para a lista (mesmo do helper)
          'Cache-Control': `public, s-maxage=${GLOBAL_CACHE_REVALIDATE}, stale-while-revalidate=1800`,
        },
      },
    );
  } catch (error: any) {
    console.error('[API /galeria/[id]/photos] Unexpected Error:', error);
    return NextResponse.json(
      { error: 'Falha interna no servidor' },
      { status: 500 },
    );
  }
}
