// src/app/api/admin/revalidate-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createSupabaseAdmin } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';

/**
 * POST /api/admin/revalidate-user
 *
 * Revalida todas as tags de cache de um usuário específico ou de uma lista
 * de usernames. Disponível em todos os ambientes (inclusive produção) pois
 * é uma operação de leitura/invalidação — não destrói dados.
 *
 * Body: { usernames: string[] }
 * Requer: role 'admin' no perfil autenticado
 */
export async function POST(req: NextRequest) {
  // ── Guard: apenas admins ────────────────────────────────────────────────
  const { profile } = await getAuthenticatedUser();
  if (!profile?.roles?.includes('admin')) {
    return NextResponse.json(
      { success: false, error: 'Acesso restrito a administradores.' },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const usernames: string[] = Array.isArray(body.usernames)
    ? body.usernames.filter((u: unknown) => typeof u === 'string' && u.trim())
    : [];

  if (!usernames.length) {
    return NextResponse.json(
      { success: false, error: 'Informe ao menos um username.' },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdmin();

  // ── Busca id + username na tb_profiles ──────────────────────────────────
  const { data: profiles, error } = await supabase
    .from('tb_profiles')
    .select('id, username')
    .in('username', usernames);

  if (error) {
    console.error('[revalidate-user]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  if (!profiles?.length) {
    return NextResponse.json(
      {
        success: false,
        error: 'Nenhum usuário encontrado para os usernames informados.',
      },
      { status: 404 },
    );
  }

  // ── Revalida todas as tags relevantes ────────────────────────────────────
  // Espelha a lógica de revalidateProfile em profile.service.ts
  for (const p of profiles) {
    const u = p.username;
    const id = p.id;

    // Perfil público
    revalidateTag(`profile-${u}`);
    revalidateTag(`profile-data-${u}`);
    revalidateTag(`profile-galerias-${u}`);

    // Perfil privado e galerias do usuário
    revalidateTag(`profile-private-${id}`);
    revalidateTag(`user-galerias-${id}`);

    // Categorias
    revalidateTag(`profile-categories-${id}`);
  }

  // Usuários solicitados mas não encontrados no banco
  const foundUsernames = profiles.map((p) => p.username);
  const notFound = usernames.filter((u) => !foundUsernames.includes(u));

  const message = [
    `${profiles.length} usuário(s) revalidado(s): ${foundUsernames.join(', ')}.`,
    notFound.length ? `Não encontrados: ${notFound.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return NextResponse.json({
    success: true,
    message,
    revalidated: foundUsernames,
    notFound,
  });
}
