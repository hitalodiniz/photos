import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Define o domínio base (ex: localhost:3000 ou suagaleria.com.br)
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

const subdomainCache = new Map<
  string,
  { username: string; use_subdomain: boolean; createdAt: number }
>();
const SUBDOMAIN_CACHE_TTL = 1000 * 60 * 10; // 10 minutos

async function getProfileBySubdomain(subdomain: string, req: NextRequest) {
  const now = Date.now();
  const cached = subdomainCache.get(subdomain);

  if (cached && now - cached.createdAt < SUBDOMAIN_CACHE_TTL) {
    return cached;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    },
  );

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('username, use_subdomain')
    .eq('username', subdomain)
    .single();

  // Retorna null apenas se o perfil realmente não existir no banco
  if (!profile) return null;

  const item = {
    username: profile.username,
    use_subdomain: !!profile.use_subdomain, // Garante booleano
    createdAt: now,
  };

  subdomainCache.set(subdomain, item);
  return item;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. FILTRO DE SISTEMA E ARQUIVOS
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const pathParts = pathname.split('/').filter(Boolean);

  // 2. DETECÇÃO DE SUBDOMÍNIO EXISTENTE
  // Verifica se o host atual já é um subdomínio do MAIN_DOMAIN
  const cleanHost = host.split(':')[0];
  const cleanMainDomain = MAIN_DOMAIN.split(':')[0];
  const isSubdomainRequest = cleanHost.endsWith(`.${cleanMainDomain}`);

  // ---------------------------------------------------------
  // 3. LÓGICA DE REDIRECT: URL Padrão -> Subdomínio
  // Ex: localhost:3000/hitalodiniz/2025... -> hitalodiniz.localhost:3000/2025...
  // ---------------------------------------------------------
  if (!isSubdomainRequest && pathParts.length > 0) {
    const potentialUsername = pathParts[0];
    const reservedPaths = [
      'dashboard',
      'onboarding',
      'login',
      'subdomain',
      'planos',
      'public',
      'static',
    ];

    if (!reservedPaths.includes(potentialUsername)) {
      const profile = await getProfileBySubdomain(potentialUsername, req);

      if (profile && profile.use_subdomain) {
        const newPath = '/' + pathParts.slice(1).join('/');
        const newUrl = new URL(newPath, req.url);

        // Ajusta o hostname mantendo a porta se for localhost
        const port = host.split(':')[1];
        newUrl.hostname = `${potentialUsername}.${cleanMainDomain}`;
        if (port) newUrl.port = port;

        return NextResponse.redirect(newUrl);
      }
    }
  }

  // ---------------------------------------------------------
  // 4. LÓGICA DE REWRITE: Subdomínio -> Pasta Interna
  // Ex: hitalodiniz.localhost:3000/2025... -> /site-interno/hitalodiniz/2025...
  // ---------------------------------------------------------
  let subdomain = '';
  if (isSubdomainRequest) {
    subdomain = cleanHost.replace(`.${cleanMainDomain}`, '');
  }

  if (subdomain && subdomain !== 'www') {
    const profile = await getProfileBySubdomain(subdomain, req);

    // CASO 1: Perfil existe E permite subdomínio (Fluxo Normal)
    if (profile && profile.use_subdomain) {
      const cleanPathname = pathname.startsWith('/')
        ? pathname
        : `/${pathname}`;
      const rewriteUrl = new URL(
        `/subdomain/${profile.username}${cleanPathname}`,
        req.url,
      );

      const response = NextResponse.rewrite(rewriteUrl);
      // ... (headers de cache)
      return response;
    }

    // CASO 2: Perfil existe mas NÃO permite subdomínio (Trava de Segurança)
    if (profile && !profile.use_subdomain) {
      console.warn(
        `[Middleware] Acesso negado: Subdomínio desativado para ${subdomain}`,
      );
      // Força o erro 404 para não vazar a existência da rota interna
      return NextResponse.rewrite(new URL('/_not-found', req.url));
    }

    // CASO 3: Perfil não existe
    return NextResponse.rewrite(new URL('/404', req.url));
  }

  // 5. PROTEÇÃO DE ROTAS DASHBOARD/ONBOARDING
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    const res = NextResponse.next();
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
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/', req.url));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
