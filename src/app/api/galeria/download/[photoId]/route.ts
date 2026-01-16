import { getInternalGoogleDriveUrl } from '@/core/utils/url-helper';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await params;

  // 🎯 ESTRATÉGIA: Pedimos 3000px.
  // É o suficiente para impressões de alta qualidade (300 DPI)
  // e quase sempre resulta em um arquivo entre 2MB e 4MB.
  const width = '3000';

  // Note: Não usamos o sufixo '-rw' aqui porque para DOWNLOAD
  // o cliente geralmente espera o formato original (JPG/PNG).
  const googleUrl = getInternalGoogleDriveUrl(photoId, width, 'webp');

  try {
    const response = await fetch(googleUrl);

    if (!response.ok) throw new Error('Erro ao buscar no Drive');

    const buffer = await response.arrayBuffer();

    // Identifica o tipo real retornado pelo Google ou assume jpeg
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // O attachment força o navegador a baixar em vez de abrir
        'Content-Disposition': `attachment; filename="foto_alta_res_${photoId}.jpg"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro no download' }, { status: 500 });
  }
}
