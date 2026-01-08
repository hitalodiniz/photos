import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const NEXT_PUBLIC_MAIN_DOMAIN =
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';
const subdomainCache = new Map<
  string,
  { username: string; use_subdomain: boolean; createdAt: number }
>();
const SUBDOMAIN_CACHE_TTL = 1000 * 60 * 10;

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. FILTRO DE SISTEMA E ARQUIVOS (Mover para o topo para performance)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. INSTÂNCIA ÚNICA DO SUPABASE (Sincronizada)
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value),
          );
          // Importante: Atualizamos a resposta que será retornada
          response = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 3. LÓGICA DE SUBDOMÍNIO
  const cleanHost = host.split(':')[0];
  const cleanMainDomain = NEXT_PUBLIC_MAIN_DOMAIN.split(':')[0];
  const isSubdomainRequest = cleanHost.endsWith(`.${cleanMainDomain}`);
  const subdomain = isSubdomainRequest
    ? cleanHost.replace(`.${cleanMainDomain}`, '')
    : '';

  if (subdomain && subdomain !== 'www') {
    const isGalleryPath =
      pathname === '/' ||
      /^\/\d{4}/.test(pathname) ||
      pathname.startsWith('/photo');

    if (isGalleryPath) {
      // Usar o cache manualmente ou buscar no supabase já instanciado
      const now = Date.now();
      let profile = subdomainCache.get(subdomain);

      if (
        !profile ||
        (process.env.NODE_ENV !== 'development' &&
          now - profile.createdAt > SUBDOMAIN_CACHE_TTL)
      ) {
        const { data } = await supabase
          .from('tb_profiles')
          .select('username, use_subdomain')
          .eq('username', subdomain)
          .single();

        if (data) {
          profile = {
            username: data.username,
            use_subdomain: !!data.use_subdomain,
            createdAt: now,
          };
          if (process.env.NODE_ENV !== 'development')
            subdomainCache.set(subdomain, profile);
        }
      }

      if (profile?.use_subdomain) {
        const rewriteUrl = new URL(
          `/subdomain/${profile.username}${pathname}${url.search}`,
          req.url,
        );
        // Criamos o rewrite a partir da resposta que já pode ter novos cookies
        const rewriteRes = NextResponse.rewrite(rewriteUrl);
        // Copia os cookies da 'response' (onde o Supabase injetou o refresh) para o rewrite
        response.cookies
          .getAll()
          .forEach((c) => rewriteRes.cookies.set(c.name, c.value));
        return rewriteRes;
      }
    }
  }

  // 4. PROTEÇÃO DE ROTAS DASHBOARD
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Se houver erro de refresh token, limpa a sessão e desloga
    if (error?.code === 'refresh_token_already_used') {
      const loginUrl = new URL('/', req.url);
      const errorRes = NextResponse.redirect(loginUrl);
      errorRes.cookies.delete('sb-access-token'); // Ajuste o nome conforme seu cookie
      errorRes.cookies.delete('sb-refresh-token');
      return errorRes;
    }

    if (!user) return NextResponse.redirect(new URL('/', req.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
