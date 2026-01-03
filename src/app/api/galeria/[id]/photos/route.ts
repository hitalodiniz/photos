// app/api/galeria/[id]/photos/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ✅ CORREÇÃO: Aguarda o objeto params antes de acessar o id
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createSupabaseServerClientReadOnly();

    // Busca os dados da galeria
    const { data: galeria, error: galeriaError } = await supabase
      .from('tb_galerias')
      .select('id, drive_folder_id, user_id')
      .eq('id', id)
      .single();

    if (galeriaError || !galeria || !galeria.drive_folder_id) {
      console.warn(`Galeria ${id} não encontrada ou sem pasta vinculada.`);
      return NextResponse.json({ photos: [] });
    }

    // Busca o token de acesso (Refresh Token Flow)
    const accessToken = await getDriveAccessTokenForUser(galeria.user_id);

    if (!accessToken) {
      console.error('Falha ao obter accessToken do Google.');
      return NextResponse.json(
        { error: 'Erro de autenticação com o Google' },
        { status: 401 },
      );
    }

    // Lista as fotos do Drive
    const photos = await listPhotosFromDriveFolder(
      galeria.drive_folder_id,
      accessToken,
    );

    return NextResponse.json({ photos });
  } catch (error: any) {
    console.error('Erro na API de fotos:', error);
    return NextResponse.json(
      { error: 'Falha interna no servidor' },
      { status: 500 },
    );
  }
}
