import { NextRequest, NextResponse } from 'next/server';
import { getGalleryLeadStats } from '@/core/services/gallery-lead.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const galleryId = searchParams.get('galeria_id');

    if (!galleryId) {
      return NextResponse.json(
        { success: false, error: 'galeria_id é obrigatório' },
        { status: 400 },
      );
    }

    const result = await getGalleryLeadStats(galleryId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: true, stats: result.stats },
      { status: 200 },
    );
  } catch (error) {
    console.error('Erro na API de estatísticas de leads:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
