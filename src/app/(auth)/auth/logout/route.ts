import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const { origin } = new URL(request.url);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              // Garante que a remoção afete todos os subdomínios
              domain:
                process.env.NEXT_PUBLIC_COOKIE_DOMAIN ||
                process.env.COOKIE_DOMAIN,
              path: '/',
            });
          });
        },
      },
    },
  );

  // 1. Encerra a sessão no Supabase
  await supabase.auth.signOut();

  // 2. Limpeza manual de segurança (Opcional, mas recomendado para Multidomínios)
  // Isso força a expiração do cookie principal caso o setAll falhe em algum edge case
  const domain =
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN;
  const response = NextResponse.redirect(new URL('/', request.url));

  // Substituímos /auth/login por /login conforme sua nova estrutura

  if (domain) {
    // Busca o nome do cookie de auth (geralmente sb-XXXX-auth-token)
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
      : '';
    const tokenName = `sb-${projectId}-auth-token`;

    response.cookies.set(tokenName, '', {
      domain: domain,
      path: '/',
      maxAge: 0,
    });
  }

  return response;
}
