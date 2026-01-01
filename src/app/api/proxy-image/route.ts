// src/app/api/proxy-image/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get('id');

  // Validação básica do ID
  if (!photoId) {
    return new NextResponse('ID da foto é obrigatório', { status: 400 });
  }

  // URL original do Google (lh3) que você quer manter
  const googleUrl = `https://lh3.googleusercontent.com/d/${photoId}=s0`;

  try {
    // O servidor faz o download (aqui o CORS não bloqueia)
    const response = await fetch(googleUrl, {
      next: { revalidate: 3600 }, // Cache opcional de 1 hora para performance
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar no Google: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Retorna os dados binários com cabeçalhos de permissão para o seu navegador
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Access-Control-Allow-Origin': '*', // LIBERA O ZIP NO FRONTEND
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erro no Proxy de Imagem:', error);
    return new NextResponse('Erro interno ao processar imagem', {
      status: 500,
    });
  }
}
