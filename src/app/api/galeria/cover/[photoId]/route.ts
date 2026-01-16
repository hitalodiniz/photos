import {
  getDirectGoogleUrl,
  getInternalGoogleDriveUrl,
} from '@/core/utils/url-helper';
import { NextResponse } from 'next/server';

// Força a rota a ser tratada como estática para permitir o cache de longa duração
export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(
  request: Request,
  { params }: { params: Promise<any> },
) {
  // 1. Resolve os parâmetros (Tratando possíveis variações de nome de pasta)
  const resolvedParams = await params;
  // Se a pasta for [photold] (com L), o Next.js preenche photold. Se for [photoId], preenche photoId.
  const photoId = resolvedParams.photoId;

  if (!photoId) {
    console.error(
      '\x1b[31m[ERRO]\x1b[0m photoId não encontrado. Verifique se o nome da pasta é [photoId]',
    );
    return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const width = searchParams.get('w') || '1000';

  const googleUrl = getInternalGoogleDriveUrl(photoId, width, 'webp');

  console.log(
    `\x1b[33m[PROXY IMAGE]\x1b[0m Solicitando WebP para ID: ${photoId}`,
  );
  try {
    // 2. O 'force-cache' ignora o 'private' do Google e grava no disco local
    const response = await fetch(googleUrl, {
      cache: 'force-cache',
      next: {
        revalidate: 86400,
        tags: [`cover-${photoId}`],
      },
    });

    // 1. Identifica se veio do cache ou do Google
    const cacheStatus = response.headers.get('x-nextjs-cache');
    const isHit = cacheStatus === 'HIT';

    const buffer = await response.arrayBuffer();

    // 2. Calcula o tamanho em KB para o log
    const sizeInKb = (buffer.byteLength / 1024).toFixed(1);

    if (isHit) {
      // Log de economia (Verde)
      console.log(
        `\x1b[32m[CACHE HIT PHOTO]\x1b[0m ID: ${photoId} | \x1b[1mEconomizou ${sizeInKb} KB\x1b[0m de banda.`,
      );
    } else {
      // Log de busca real (Roxo/Magenta)
      console.log(
        `\x1b[35m[GOOGLE MISS PHOTO]\x1b[0m ID: ${photoId} | Baixando ${sizeInKb} KB pela primeira vez.`,
      );
      const driveCache = response.headers.get('cache-control');
      if (driveCache)
        console.log(`\x1b[90m[GOOGLE HEADERS PHOTO]\x1b[0m ${driveCache}`);
    }

    if (!response.ok) {
      console.error(
        `\x1b[31m[ERRO GOOGLE IMAGE PHOTO]\x1b[0m Status: ${response.status} para o ID: ${photoId}`,
      );
      // Não lançamos erro aqui para podermos retornar o status real do Google (ex: 404 ou 403)
      return NextResponse.json(
        { error: 'Imagem indisponível no Drive' },
        { status: response.status },
      );
    }

    // 3. Sobrescrevemos o 'private' do Google por 'public' para a Vercel ativar o Edge Cache
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error: any) {
    console.error(`\x1b[31m[ERRO CRÍTICO]\x1b[0m`, error.message);
    return NextResponse.json(
      { error: 'Erro interno no proxy' },
      { status: 500 },
    );
  }
}
