import { NextResponse } from 'next/server';
import { getInternalGoogleDriveUrl, GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

/**
 * 🎯 API Route para servir imagens otimizadas para Open Graph (WhatsApp, Facebook, etc.)
 * 
 * Esta rota garante:
 * 1. URL absoluta e acessível publicamente
 * 2. Formato JPEG (compatível com WhatsApp/Facebook)
 * 3. Tamanho otimizado (1200px - padrão Open Graph)
 * 4. Cache adequado para reduzir custos
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ googleId: string }> },
) {
  const resolvedParams = await params;
  const googleId = resolvedParams.googleId;

  if (!googleId) {
    return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
  }

  try {
    // 🎯 Usamos 'original' para garantir JPEG (não WebP) para melhor compatibilidade com WhatsApp
    // Tamanho 1200px é o padrão Open Graph e suficiente para previews
    const googleUrl = getInternalGoogleDriveUrl(googleId, '1200', 'original');

    const response = await fetch(googleUrl, {
      cache: 'force-cache',
      next: {
        revalidate: GLOBAL_CACHE_REVALIDATE,
        tags: [`og-photo-${googleId}`],
      },
    });

    if (!response.ok) {
      console.error(`[OG IMAGE ERROR] ID: ${googleId}, Status: ${response.status}`);
      return NextResponse.json(
        { error: 'Imagem indisponível no Drive' },
        { status: response.status },
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 🎯 Headers otimizados para Open Graph
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, s-maxage=${GLOBAL_CACHE_REVALIDATE}, stale-while-revalidate=${GLOBAL_CACHE_REVALIDATE / 2}`,
        // CORS headers para permitir acesso de crawlers de redes sociais
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error: any) {
    console.error(`[OG IMAGE ERROR] ID: ${googleId}`, error.message);
    return NextResponse.json(
      { error: 'Erro interno ao buscar imagem' },
      { status: 500 },
    );
  }
}
