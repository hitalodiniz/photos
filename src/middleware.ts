import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { fetchProfileRaw } from '@/core/services/profile.service';
import { resolveGalleryUrl } from '@/core/utils/url-helper';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const MAIN_DOMAIN = new URL(SITE_URL).host;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') || '';
  const protocol = req.nextUrl.protocol.replace(':', '');

  // 1. FILTRO DE SISTEMA (Short-circuit rápido)
  if (
    pathname.includes('.') || // Ignora arquivos (favicon.ico, sitemap.xml, etc)
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/.well-known')
  ) {
    return NextResponse.next();
  }

  // --- REGRA 1: ÁREA PROTEGIDA ---
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    // Resposta de sucesso com headers propagados
    const response = NextResponse.next({
      request: { headers: new Headers(req.headers) },
    });
    const redirectResponse = NextResponse.redirect(new URL('/', req.url));
    const isLocal = process.env.NODE_ENV === 'development';

    // 2. Inicializamos o Supabase injetando a manipulação de cookies na 'response'
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              // 1. Atualiza na requisição (para o getUser() deste middleware ler agora)
              req.cookies.set(name, value);

              const finalOptions = { ...options };
              if (!isLocal) {
                delete finalOptions.maxAge;
                delete (finalOptions as any).expires;
              }

              // 2. Atualiza na resposta (para o navegador salvar o cookie)
              response.cookies.set(name, value, finalOptions);
              redirectResponse.cookies.set(name, value, finalOptions);
            });

            // 🎯 O PULO DO GATO: Sincroniza os cookies da response com o request
            // Isso permite que o getProfileData() na Page leia a sessão atualizada.
            const headers = new Headers(req.headers);
            response.cookies.forEach((cookie) => {
              headers.append('set-cookie', `${cookie.name}=${cookie.value}`);
            });
          },
        },
      },
    );

    // 3. Verificamos o usuário
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 4. Se não houver usuário, retornamos o redirecionamento com os cookies atualizados
    if (!user) {
      console.warn(
        '❌ Usuário não encontrado no middleware, redirecionando para home...',
      );
      return redirectResponse;
    }
    console.log('✅ User ok no Dashboard, permitindo acesso.');
    // 5. Se houver usuário, retornamos a resposta de sucesso
    return response;
  }

  const isSubdomainRequest =
    host.endsWith(`.${MAIN_DOMAIN}`) && host !== MAIN_DOMAIN;

  // --- REGRA A: ACESSO VIA SUBDOMÍNIO ---
  if (isSubdomainRequest) {
    const subdomain = host.replace(`.${MAIN_DOMAIN}`, '').toLowerCase();

    if (subdomain !== 'www') {
      const profile = await fetchProfileRaw(subdomain);

      if (!profile) return NextResponse.redirect(new URL(SITE_URL));

      // Se perdeu direito ao subdomínio: hitalo.site.com -> site.com/hitalo
      // 🎯 SE NÃO EXISTE OU NÃO TEM PERMISSÃO -> 404
      // Não corrigimos a URL, apenas dizemos que não existe.
      if (!profile || !profile.use_subdomain) {
        console.warn(
          `[Security] Tentativa de acesso a subdomínio sem permissão: ${subdomain}`,
        );

        // Fazemos um rewrite para uma rota que não existe ou para o próprio 404 do Next
        const url = req.nextUrl.clone();
        url.pathname = '/404';
        return NextResponse.rewrite(url);
      }

      // REWRITE INTERNO: Mapeia para a pasta física /subdomain/[username]
      // Remove o username do path caso ele esteja lá (evita /subdomain/hitalo/hitalo/...)
      const prefix = `/${subdomain}`;
      const cleanPath = pathname.startsWith(prefix)
        ? pathname.substring(prefix.length)
        : pathname;
      const normalizedPath = cleanPath.startsWith('/')
        ? cleanPath
        : `/${cleanPath}`;

      const internalPath = `/subdomain/${subdomain}${normalizedPath === '/' ? '' : normalizedPath}`;

      const rewriteUrl = req.nextUrl.clone();
      rewriteUrl.pathname = internalPath;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // --- REGRA B: ACESSO VIA DOMÍNIO PRINCIPAL ---
  if (!isSubdomainRequest && host === MAIN_DOMAIN) {
    const segments = pathname.split('/').filter(Boolean);
    const potentialUsername = segments[0]?.toLowerCase();

    if (
      potentialUsername &&
      !['dashboard', 'onboarding', 'auth', 'api'].includes(potentialUsername)
    ) {
      const profile = await fetchProfileRaw(potentialUsername);

      // REDIRECT: site.com/hitalo -> hitalo.site.com/
      if (profile?.use_subdomain) {
        const correctUrl = resolveGalleryUrl(
          profile.username,
          pathname, // A função vai limpar o "/hitalo" daqui
          true,
          MAIN_DOMAIN,
          protocol,
        );
        return NextResponse.redirect(new URL(correctUrl), 301);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
