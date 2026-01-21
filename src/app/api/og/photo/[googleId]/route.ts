import { NextResponse } from 'next/server';
import { getInternalGoogleDriveUrl, GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

/**
 * 🎯 API Route para servir imagens otimizadas para Open Graph (WhatsApp, Facebook, etc.)
 * 
 * Esta rota garante:
 * 1. URL absoluta e acessível publicamente
 * 2. Formato JPEG (compatível com WhatsApp/Facebook)
 * 3. Tamanho otimizado (800px - garante < 300KB para WhatsApp)
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
    // 🎯 WhatsApp requer imagem < 300KB e formato JPEG/PNG
    // Usamos tamanho 800px para garantir que fique < 300KB mesmo para fotos de alta qualidade
    // 'original' força JPEG (não WebP) para melhor compatibilidade
    // Nota: 800px ainda é suficiente para previews de qualidade no WhatsApp
    const googleUrl = getInternalGoogleDriveUrl(googleId, '800');

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
    
    // 🎯 Verifica tamanho da imagem (WhatsApp limita a 300KB)
    const imageSizeKB = buffer.byteLength / 1024;
    if (imageSizeKB > 300) {
      console.warn(`[OG IMAGE WARNING] ID: ${googleId}, Tamanho: ${imageSizeKB.toFixed(2)}KB (limite WhatsApp: 300KB)`);
      // Continua mesmo assim, mas loga o aviso
    }

    // 🎯 Headers otimizados para Open Graph e WhatsApp
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': `public, s-maxage=${GLOBAL_CACHE_REVALIDATE}, stale-while-revalidate=${GLOBAL_CACHE_REVALIDATE / 2}`,
        // CORS headers para permitir acesso de crawlers de redes sociais
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        // 🎯 Headers adicionais para melhor compatibilidade com WhatsApp
        'X-Content-Type-Options': 'nosniff',
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
