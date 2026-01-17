import {
  getInternalGoogleDriveUrl,
  GLOBAL_CACHE_REVALIDATE,
} from '@/core/utils/url-helper';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await params;

  // 🎯 ESTRATÉGIA DE 1MB (Original Otimizado):
  // Solicitamos 4000px. Isso garante nitidez para impressões de até 30x40cm,
  // mas força o Google a processar o arquivo. O resultado costuma ser um arquivo
  // de alta fidelidade muito mais leve que o original bruto.
  const width = '4000';

  // Usamos 'original' como formato para que o Google não force WebP,
  // mantendo a compatibilidade universal do JPEG para o cliente final.
  const googleUrl = getInternalGoogleDriveUrl(photoId, width, 'original');

  try {
    const response = await fetch(googleUrl, {
      // Opcional: Adicionar cache aqui se quiser economizar banda do Drive em downloads repetidos
      cache: 'force-cache', // 🚀 Muito importante: cacheia o arquivo de 1MB na borda
      next: { revalidate: GLOBAL_CACHE_REVALIDATE }, // Cache de 7 dias para downloads
    });

    if (!response.ok) throw new Error('Erro ao buscar no Drive');

    const buffer = await response.arrayBuffer();

    // Determinamos o tipo de conteúdo. Se o Google processar, geralmente será image/jpeg.
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="foto_alta_res_${photoId}.jpg"`,
        'Cache-Control': `public, max-age=${GLOBAL_CACHE_REVALIDATE}, immutable`,
      },
    });
  } catch (error) {
    console.error(`[DOWNLOAD ERROR] ID: ${photoId}`, error);
    return NextResponse.json({ error: 'Erro no download' }, { status: 500 });
  }
}
