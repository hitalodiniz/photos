// app/api/galeria/[id]/photos/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();
  console.log('[API /galeria/[id]/photos] Request started', {
    timestamp: new Date().toISOString(),
  });

  try {
    // ✅ CORREÇÃO: Aguarda o objeto params antes de acessar o id
    const resolvedParams = await params;
    const { id } = resolvedParams;

    console.log('[API /galeria/[id]/photos] Fetching gallery', { galeriaId: id });

    const supabase = await createSupabaseServerClientReadOnly();

    // Busca os dados da galeria
    const { data: galeria, error: galeriaError } = await supabase
      .from('tb_galerias')
      .select('id, drive_folder_id, user_id')
      .eq('id', id)
      .single();

    if (galeriaError || !galeria || !galeria.drive_folder_id) {
      console.warn('[API /galeria/[id]/photos] Gallery not found or missing folder', {
        galeriaId: id,
        error: galeriaError?.message,
        hasGaleria: !!galeria,
        hasFolderId: !!galeria?.drive_folder_id,
      });
      return NextResponse.json({ photos: [] });
    }

    console.log('[API /galeria/[id]/photos] Gallery found', {
      galeriaId: id,
      folderId: galeria.drive_folder_id,
      userId: galeria.user_id,
    });

    // Busca o token de acesso (Refresh Token Flow)
    console.log('[API /galeria/[id]/photos] Getting access token', {
      userId: galeria.user_id,
    });
    const tokenStartTime = Date.now();
    const accessToken = await getDriveAccessTokenForUser(galeria.user_id);
    const tokenElapsed = Date.now() - tokenStartTime;

    if (!accessToken) {
      console.error('[API /galeria/[id]/photos] Token not found', {
        galeriaId: id,
        userId: galeria.user_id,
        elapsedMs: tokenElapsed,
      });
      return NextResponse.json(
        { error: 'Erro de autenticação com o Google' },
        { status: 401 },
      );
    }

    console.log('[API /galeria/[id]/photos] Token obtained', {
      galeriaId: id,
      tokenLength: accessToken.length,
      elapsedMs: tokenElapsed,
    });

    // Lista as fotos do Drive
    console.log('[API /galeria/[id]/photos] Fetching photos from Drive', {
      galeriaId: id,
      folderId: galeria.drive_folder_id,
    });
    const photosStartTime = Date.now();
    const photos = await listPhotosFromDriveFolder(
      galeria.drive_folder_id,
      accessToken,
    );
    const photosElapsed = Date.now() - photosStartTime;

    const totalElapsed = Date.now() - startTime;
    console.log('[API /galeria/[id]/photos] Completed successfully', {
      galeriaId: id,
      photosCount: photos?.length || 0,
      photosElapsedMs: photosElapsed,
      totalElapsedMs: totalElapsed,
      totalElapsedSeconds: (totalElapsed / 1000).toFixed(2),
    });

    return NextResponse.json(
      { photos },
      {
        headers: {
          // Cache de 1 hora para a lista (reduz consultas ao banco e Google API)
          'Cache-Control': `public, s-maxage=${GLOBAL_CACHE_REVALIDATE}, stale-while-revalidate=1800`,
        },
      },
    );
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('[API /galeria/[id]/photos] Error', {
      error: error.message,
      errorStack: error.stack,
      elapsedMs: elapsed,
      elapsedSeconds: (elapsed / 1000).toFixed(2),
    });
    return NextResponse.json(
      { error: 'Falha interna no servidor' },
      { status: 500 },
    );
  }
}
