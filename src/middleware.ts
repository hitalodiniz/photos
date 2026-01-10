import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const NEXT_PUBLIC_MAIN_DOMAIN =
  process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. FILTRO DE SISTEMA E ARQUIVOS (Rápido)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const cleanHost = host.split(':')[0];
  const cleanMainDomain = NEXT_PUBLIC_MAIN_DOMAIN.split(':')[0];
  const isSubdomainRequest =
    cleanHost.endsWith(`.${cleanMainDomain}`) && cleanHost !== cleanMainDomain;

  // ---------------------------------------------------------
  // 2. LÓGICA DE REWRITE (Subdomínio -> Pasta Interna)
  // ---------------------------------------------------------
  if (isSubdomainRequest) {
    const subdomain = cleanHost.replace(`.${cleanMainDomain}`, '');

    if (subdomain && subdomain !== 'www') {
      const isHomePage = pathname === '/';
      const isGalleryPath =
        pathname === '/' ||
        /^\/\d{4}/.test(pathname) ||
        pathname.startsWith('/photo');

      if (isHomePage || isGalleryPath) {
        const targetPath = isHomePage
          ? `/${subdomain}`
          : `/subdomain/${subdomain}${pathname}`;

        const rewriteUrl = new URL(`${targetPath}${url.search}`, req.url);
        const response = NextResponse.rewrite(rewriteUrl);
        response.headers.set('x-subdomain-variant', 'true');
        return response;
      }
    }
  }

  // ---------------------------------------------------------
  // 3. PROTEÇÃO DE ROTAS DASHBOARD/ONBOARDING + LÓGICA DE SESSION COOKIE
  // ---------------------------------------------------------
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    const res = NextResponse.next();
    const isLocal = process.env.NODE_ENV === 'development'; // Verificação de ambiente

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Ajuste para Produção: Remover expiração para ser Session Cookie
              const finalOptions = { ...options };
              if (!isLocal) {
                delete finalOptions.maxAge;
                delete (finalOptions as any).expires;
              }

              // Atualiza na requisição (para o Supabase ler agora)
              req.cookies.set(name, value);
              // Atualiza na resposta (para o navegador salvar)
              res.cookies.set(name, value, finalOptions);
            });
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
