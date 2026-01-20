// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

//Fluxo de login - Login -> Google -> Callback -> /login (triagem) -> /dashboard (ou subdomínio).

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const cookieStore = await cookies();

  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            // AJUSTE MULTIDOMÍNIO: Injeta o domínio para abranger subdomínios
            // .localhost (dev) ou .suagaleria.com.br (Vercel)
            cookieStore.set(name, value, {
              ...options,
              domain:
                process.env.NEXT_PUBLIC_COOKIE_DOMAIN ||
                process.env.COOKIE_DOMAIN,
              path: '/',
              sameSite: 'lax',
              // HTTPS OBRIGATÓRIO: Na Vercel deve ser true para o PKCE funcionar
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
      new URL('/login?error=auth_failed', request.url),
    );
  }

  const { user, provider_refresh_token, provider_token, expires_in } =
    data.session;

  // 3. PERSISTÊNCIA DO REFRESH TOKEN
  if (user?.id) {
    const updates: any = {};

    // Salva o Refresh Token se disponível (essencial para futuras renovações)
    if (provider_refresh_token) {
      updates.google_refresh_token = provider_refresh_token;
    }

    // Salva o Access Token inicial para o service já ler do banco
    if (provider_token) {
      updates.google_access_token = provider_token;

      // Calcula a expiração (expires_in costuma ser 3600 segundos para o Google)
      const expiresInSeconds = expires_in || 3600;
      updates.google_token_expires_at = new Date(
        Date.now() + expiresInSeconds * 1000,
      ).toISOString();
    }

    // 🎯 Marca status de autenticação como ativo quando tokens são salvos
    if (provider_refresh_token || provider_token) {
      updates.google_auth_status = 'active';
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('tb_profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        console.error('Erro ao salvar tokens iniciais:', updateError.message);
      } else {
        console.log(`[auth/callback] Tokens salvos com sucesso para userId: ${user.id}`);
      }
    }
  }

  // 4. REDIRECIONAMENTO FINAL
  // Redireciona para /dashboard ou /app conforme sua estrutura
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
