// src/app/api/proxy-image/route.ts
import { getImageUrl } from '@/core/utils/url-helper';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get('id');
  const width = searchParams.get('w') || '600';

  if (!photoId) {
    return new NextResponse('ID da foto é obrigatório', { status: 400 });
  }

  try {
    const googleUrl = getImageUrl(photoId, `w${width}`);

    const response = await fetch(googleUrl, {
      // Identificando a requisição para evitar bloqueios de "bot"
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      // Se o Google der 429 ou 403, logamos para monitorar
      console.error(
        `Google Drive API respondeu com: ${response.status} para o ID: ${photoId}`,
      );
      return new NextResponse('Erro na origem da imagem', {
        status: response.status,
      });
    }
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'CDN-Cache-Control': 'public, s-maxage=31536000',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=31536000',
      },
    });
  } catch (error) {
    console.error('Erro no Proxy de Imagem:', error);
    return new NextResponse('Erro interno ao processar imagem', {
      status: 500,
    });
  }
}
