// src/app/api/proxy-image/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get('id');
  const width = searchParams.get('w');
  const size = searchParams.get('s');
  const isDownload = searchParams.get('download') === 'true';

  if (!photoId) {
    return new NextResponse('ID da foto é obrigatório', { status: 400 });
  }

  try {
    // ENDPOINT MAIS ESTÁVEL PARA ARQUIVOS DO DRIVE
    // sz=s4000 tenta forçar a maior resolução disponível (até 4k)
    const sz = size === '0' ? 's4000' : `w${width || '600'}`;
    const googleUrl = `https://lh3.googleusercontent.com/u/0/d/${photoId}=${sz}`;

    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 },
    });

    // Se falhar no lh3, tenta o fallback oficial de thumbnail
    if (!response.ok) {
      const fallbackUrl = `https://drive.google.com/thumbnail?id=${photoId}&sz=${size === '0' ? 's4000' : 'w1000'}`;
      const fallbackResponse = await fetch(fallbackUrl);

      if (!fallbackResponse.ok) {
        console.error(`Falha total no Google para o ID: ${photoId}`);
        return new NextResponse('Erro na origem da imagem', {
          status: fallbackResponse.status,
        });
      }
      return processResponse(fallbackResponse, isDownload, photoId);
    }

    return processResponse(response, isDownload, photoId);
  } catch (error) {
    return new NextResponse('Erro interno no Proxy', { status: 500 });
  }
}

// Função auxiliar para evitar repetição de código
async function processResponse(res: Response, isDownload: boolean, id: string) {
  const headers = new Headers({
    'Content-Type': res.headers.get('content-type') || 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  });

  if (isDownload) {
    headers.set('Content-Disposition', `attachment; filename="foto_${id}.jpg"`);
    headers.set('Content-Type', 'image/jpeg'); // Mantendo jpeg para compatibilidade
  }

  return new NextResponse(res.body, { headers });
}
