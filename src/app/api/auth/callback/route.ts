// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const cookieStore = await cookies();

  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isProduction = process.env.NEXT_PUBLIC_NODE_ENV === 'production';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 🎯 AJUSTE MULTIDOMÍNIO: Injeta o domínio para abranger subdomínios
            // .localhost (dev) ou .suagaleria.com.br (Vercel)
            cookieStore.set(name, value, {
              ...options,
              domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
              path: '/',
              sameSite: 'lax',
              // 🎯 HTTPS OBRIGATÓRIO: Na Vercel deve ser true para o PKCE funcionar
              secure: isProduction,
            });
          });
        },
      },
    },
  );

  // 1. TROCA DE CÓDIGO (Grava cookies de sessão no domínio correto)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  // 2. CHECAGEM DE ERRO (PKCE / Credenciais)
  if (error || !data.session) {
    console.error(
      'Auth callback error:',
      error?.message || 'Sessão não encontrada.',
    );
    return NextResponse.redirect(
      new URL('/auth/error?message=Login falhou', request.url),
    );
  }

  const { user } = data.session;
  const providerRefreshToken = data.session.provider_refresh_token;

  // 3. PERSISTÊNCIA DO REFRESH TOKEN
  if (providerRefreshToken && user?.id) {
    const { error: updateError } = await supabase
      .from('tb_profiles')
      .update({ google_refresh_token: providerRefreshToken })
      .eq('id', user.id); // Validado conforme seu script SQL (chave PK = id)

    if (updateError) {
      console.error('Erro ao salvar refresh token:', updateError.message);
    }
  }

  // 4. REDIRECIONAMENTO FINAL
  // Redireciona para /dashboard ou /app conforme sua estrutura
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
