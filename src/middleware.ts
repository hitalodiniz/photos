import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Define o domínio base (ex: localhost:3000 ou suagaleria.com.br)
const NEXT_PUBLIC_MAIN_DOMAIN =
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

const subdomainCache = new Map<
  string,
  { username: string; use_subdomain: boolean; createdAt: number }
>();
const SUBDOMAIN_CACHE_TTL = 1000 * 60 * 10; // 10 minutos

async function getProfileBySubdomain(subdomain: string, req: NextRequest) {
  const now = Date.now();
  const isLocalhost = process.env.NODE_ENV === 'development'; // 🎯 Detecta ambiente
  const cached = subdomainCache.get(subdomain);

  const isDev = process.env.NODE_ENV === 'development';

  // No getProfileBySubdomain:
  if (!isDev && cached && now - cached.createdAt < SUBDOMAIN_CACHE_TTL) {
    return cached;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPANEXT_PUBLIC_BASE_URL!,
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

  // Só alimenta o cache se não for localhost para evitar stale data
  if (!isLocalhost) {
    subdomainCache.set(subdomain, item);
  }
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
  // Verifica se o host atual já é um subdomínio do NEXT_PUBLIC_MAIN_DOMAIN
  const cleanHost = host.split(':')[0];
  const cleanMainDomain = NEXT_PUBLIC_MAIN_DOMAIN.split(':')[0];
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
      'api',
    ];

    if (!reservedPaths.includes(potentialUsername)) {
      const profile = await getProfileBySubdomain(potentialUsername, req);
      if (profile && profile.use_subdomain) {
        const newPath = '/' + pathParts.slice(1).join('/');
        const newUrl = new URL(newPath, req.url);
        const port = host.split(':')[1];
        newUrl.hostname = `${potentialUsername}.${cleanMainDomain}`;
        if (port) newUrl.port = port;
        return NextResponse.redirect(newUrl);
      }
    }
  }

  // 3. REWRITE: hitalodiniz.localhost:3000 -> Pasta Interna
  if (isSubdomainRequest) {
    const subdomain = cleanHost.replace(`.${cleanMainDomain}`, '');

    if (subdomain && subdomain !== 'www') {
      const profile = await getProfileBySubdomain(subdomain, req);

      // No seu middleware.ts
      if (profile && profile.use_subdomain) {
        // 🎯 IMPORTANTE: Não deixe o pathname vazio para a home
        // Se for '/', usamos string vazia para não duplicar a barra
        const cleanPathname = pathname === '/' ? '' : pathname;

        const rewriteUrl = new URL(
          `/subdomain/${profile.username}${cleanPathname}`,
          req.url,
        );

        return NextResponse.rewrite(rewriteUrl);
      }
    }
  }

  // ---------------------------------------------------------
  // 4. LÓGICA DE REWRITE: Subdomínio -> Pasta Interna (Apenas Galerias)
  // ---------------------------------------------------------
  let subdomain = '';
  if (isSubdomainRequest) {
    subdomain = cleanHost.replace(`.${cleanMainDomain}`, '');
  }

  // Só entra na lógica se houver um subdomínio válido e não for 'www'
  if (subdomain && subdomain !== 'www') {
    // 🎯 A CHAVE: Só faz o rewrite se o caminho NÃO for uma rota de sistema.
    // Como o Next.js já ignora /api e /_next no matcher,
    // basta verificarmos se o pathname está vazio (home do fotógrafo)
    // ou se parece com uma estrutura de galeria (ex: /2025/10/...)
    const isGalleryPath = pathname === '/' || /^\/\d{4}/.test(pathname);

    if (isGalleryPath) {
      const profile = await getProfileBySubdomain(subdomain, req);

      if (profile && profile.use_subdomain) {
        const rewriteUrl = new URL(
          `/subdomain/${profile.username}${pathname}`,
          req.url,
        );

        const response = NextResponse.rewrite(rewriteUrl);
        const isLocalhost = process.env.NODE_ENV === 'development';

        if (isLocalhost) {
          response.headers.set('Cache-Control', 'no-store, max-age=0');
        }

        response.headers.set('x-subdomain-variant', 'true');
        return response;
      }
    }
  }

  // 5. PROTEÇÃO DE ROTAS DASHBOARD/ONBOARDING
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    const res = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPANEXT_PUBLIC_BASE_URL!,
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
