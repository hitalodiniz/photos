import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getPublicProfile } from './core/services/profile.service';

// Define o domínio base (ex: localhost:3000 ou suagaleria.com.br)
const NEXT_PUBLIC_MAIN_DOMAIN =
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

const subdomainCache = new Map<
  string,
  { username: string; use_subdomain: boolean; createdAt: number }
>();
const SUBDOMAIN_CACHE_TTL = 1000 * 60 * 10; // 10 minutos

async function getProfileBySubdomain(subdomain: string) {
  const now = Date.now();
  const isLocalhost = process.env.NODE_ENV === 'development'; // 🎯 Detecta ambiente
  const cached = subdomainCache.get(subdomain);

  const isDev = process.env.NODE_ENV === 'development';

  // No getProfileBySubdomain:
  if (!isDev && cached && now - cached.createdAt < SUBDOMAIN_CACHE_TTL) {
    return cached;
  }

  const profile = await getPublicProfile(subdomain);

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

  /*console.log('--- MIDDLEWARE START ---');
  console.log('Host:', host);
  console.log('Pathname:', pathname);*/

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
  const cleanHost = host.split(':')[0];
  const cleanMainDomain = NEXT_PUBLIC_MAIN_DOMAIN.split(':')[0];
  const isSubdomainRequest = cleanHost.endsWith(`.${cleanMainDomain}`);

  //console.log('Config:', { cleanHost, cleanMainDomain, isSubdomainRequest });

  // ---------------------------------------------------------
  // 3. LÓGICA DE REDIRECT: URL Padrão -> Subdomínio
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
      const profile = await getProfileBySubdomain(potentialUsername);

      if (profile && profile.use_subdomain) {
        const newPath = '/' + pathParts.slice(1).join('/');
        const newUrl = new URL(newPath, req.url);
        const port = host.split(':')[1];
        newUrl.hostname = `${potentialUsername}.${cleanMainDomain}`;
        if (port) newUrl.port = port;

        //console.log('REDIRECT detectado -> Enviando para:', newUrl.toString());
        return NextResponse.redirect(newUrl);
      }
    }
  }

  // ---------------------------------------------------------
  // 4. LÓGICA DE REWRITE: Subdomínio -> Pasta Interna
  // ---------------------------------------------------------
  let subdomain = '';
  if (isSubdomainRequest) {
    subdomain = cleanHost.replace(`.${cleanMainDomain}`, '');
    //console.log('Subdomínio detectado:', subdomain);
  }

  if (subdomain && subdomain !== 'www') {
    // Verifica se é a raiz (home do fotógrafo no subdomínio)
    const isHomePage = pathname === '/';

    // Outras rotas que você queira que caiam no perfil ou galerias
    const isGalleryPath =
      pathname === '/' ||
      /^\/\d{4}/.test(pathname) ||
      pathname.startsWith('/photo');

    if (isHomePage || isGalleryPath) {
      const profile = await getProfileBySubdomain(subdomain);
      /*console.log(
        'Perfil encontrado para subdomínio?',
        !!profile,
        'Usa subdomínio?',
        profile?.use_subdomain,
      );*/

      if (profile && profile.use_subdomain) {
        let targetPath = '';

        if (isHomePage) {
          // Se não tem slug (é a home), vai para a raiz do username
          targetPath = `/${profile.username}`;
          //console.log(`REWRITE: Home do subdomínio -> ${targetPath}`);
        } else {
          // Se tiver slug (ex: /2025/casamento), mantém o pathname para cair na rota de galeria
          targetPath = `/subdomain/${profile.username}${pathname}`;
          //console.log(`REWRITE: Galeria no subdomínio -> ${targetPath}`);
        }

        //console.log('APLICANDO REWRITE INTERNO ->', rewriteUrl.pathname);

        const rewriteUrl = new URL(`${targetPath}${url.search}`, req.url);
        const response = NextResponse.rewrite(rewriteUrl);

        const isLocalhost = process.env.NODE_ENV === 'development';

        if (isLocalhost) {
          response.headers.set('Cache-Control', 'no-store, max-age=0');
        }

        response.headers.set('x-subdomain-variant', 'true');
        return response;
      } else {
        //console.log(
        //  `ACESSO NEGADO: Subdomínio "${subdomain}" desativado ou inexistente.`,
        //);

        // Fazemos um rewrite para uma rota que certamente disparará o 404 do Next.js
        return NextResponse.rewrite(new URL('/404', req.url));
      }
    }
  }

  // 5. PROTEÇÃO DE ROTAS DASHBOARD/ONBOARDING
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    //console.log('Proteção de rota ativa para:', pathname);
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
    if (!user) {
      //console.log('Usuário não autenticado, redirecionando para home');
      return NextResponse.redirect(new URL('/', req.url));
    }
    return res;
  }

  //console.log('Middleware finalizado sem alterações (NextResponse.next)');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos e imagens para não rodar lógica de subdomínio neles
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
