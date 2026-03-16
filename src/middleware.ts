/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 *
 * Este arquivo gerencia:
 * - Proteção de rotas autenticadas (/dashboard, /onboarding)
 * - Redirecionamento de subdomínios
 * - Verificação de autenticação em todas as requisições
 *
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Qualquer bug pode permitir acesso não autorizado
 * - Pode quebrar toda a autenticação da aplicação
 * - Pode expor dados sensíveis
 *
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Crie/atualize testes unitários
 * 4. Teste extensivamente localmente
 * 5. Solicite revisão de código
 *
 * 📋 CHECKLIST OBRIGATÓRIO:
 * [ ] Testes unitários criados/atualizados
 * [ ] Testado em localhost
 * [ ] Testado em produção/staging
 * [ ] Revisão de código aprovada
 * [ ] Documentação atualizada
 *
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { fetchProfileDirectDB } from '@/core/services/profile.service';
import { resolveGalleryUrl } from '@/core/utils/url-helper';

export async function middleware(req: NextRequest) {
  const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  //Identifica o domínio base sem o prefixo "teste." caso esteja em homologação
  const ACTUAL_HOST = new URL(SITE_URL).host;
  const MAIN_DOMAIN = ACTUAL_HOST.replace('teste.', '');
  const URL_TESTE = 'teste.suagaleria.com.br';

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

    const isLocal = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

    // 2. Inicializamos o Supabase injetando a manipulação de cookies na 'response'
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          domain: cookieDomain,
          path: '/',
          sameSite: 'lax',
          secure: isProduction,
        },
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              // 1. Atualiza na requisição (para o getUser() deste middleware ler agora)
              req.cookies.set(name, value);

              const finalOptions = {
                ...options,
                domain: cookieDomain,
                path: '/',
                sameSite: 'lax' as const,
                secure: isProduction,
              };

              if (isProduction) {
                delete finalOptions.maxAge;
                delete (finalOptions as any).expires;
              }

              // 2. Atualiza na resposta (para o navegador salvar o cookie)
              response.cookies.set(name, value, finalOptions);
            });

            // 🎯 O PULO DO GATO: Sincroniza os cookies da response com o request
            // Isso permite que o getProfileData() na Page leia a sessão atualizada.
            const headers = new Headers(req.headers);
            response.cookies.getAll().forEach((cookie) => {
              headers.append('set-cookie', `${cookie.name}=${cookie.value}`);
            });
          },
        },
      },
    );

    // 3. Verificamos o usuário
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      // console.error('[Middleware] Erro ao verificar usuário:', authError.message);
    }

    // 4. Se não houver usuário, retornamos o redirecionamento com os cookies atualizados
    if (!user) {
      // 🚀 LOG: Monitora redirecionamento por falta de usuário
      // console.log(`[Middleware] Usuário não autenticado em ${pathname}, redirecionando para /`);

      // Se não houver usuário, redireciona preservando os cookies já setados (como a tentativa de login)
      const redirectUrl = new URL('/', req.url);
      const redirectRes = NextResponse.redirect(redirectUrl);
      // Copia cookies da resposta de auth para a resposta de redirecionamento
      response.cookies.getAll().forEach((c) =>
        redirectRes.cookies.set(c.name, c.value, {
          path: c.path,
          domain: c.domain,
          expires: c.expires,
          sameSite: c.sameSite,
          secure: c.secure,
          httpOnly: c.httpOnly,
        }),
      );
      return redirectRes;
    }
    // 5. Se houver usuário, retornamos a resposta de sucesso
    return response;
  }

  // Detecta se termina com .suagaleria.com.br ou .teste.suagaleria.com.br
  const isHomolog = host.includes(URL_TESTE);
  const internalMainDomain = isHomolog
    ? URL_TESTE
    : process.env.NEXT_PUBLIC_MAIN_DOMAIN &&
        process.env.NEXT_PUBLIC_MAIN_DOMAIN !== 'undefined'
      ? process.env.NEXT_PUBLIC_MAIN_DOMAIN
      : ACTUAL_HOST;

  // Agora comparamos contra o internalMainDomain (que pode ser o de teste ou o real)
  const isSubdomainRequest =
    host.endsWith(`.${internalMainDomain}`) && host !== internalMainDomain;

  // --- REGRA A: ACESSO VIA SUBDOMÍNIO ---
  if (isSubdomainRequest) {
    // Extrai o subdomínio limpando o sufixo de produção ou homologação
    const subdomain = host.replace(`.${internalMainDomain}`, '').toLowerCase();
    if (subdomain !== 'www') {
      // 🎯 MIDDLEWARE: Usa fetchProfileDirectDB (sem cache) pois Middleware não suporta unstable_cache
      const profile = await fetchProfileDirectDB(subdomain);

      if (!profile) return NextResponse.redirect(new URL(SITE_URL));

      // Se perdeu direito ao subdomínio: hitalo.site.com -> site.com/hitalo
      // 🎯 SE NÃO EXISTE OU NÃO TEM PERMISSÃO -> 404
      // Não corrigimos a URL, apenas dizemos que não existe.
      if (!profile || !profile.use_subdomain) {
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

      // Garante que os cookies do request original sejam passados para o destino do rewrite
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // --- REGRA B: ACESSO VIA DOMÍNIO PRINCIPAL ---
  // Aqui evitamos que o domínio de teste redirecione para a produção
  if (!isSubdomainRequest && host === internalMainDomain) {
    const segments = pathname.split('/').filter(Boolean);
    const potentialUsername = segments[0]?.toLowerCase();

    // console.log('[Middleware Regra B Debug]', { potentialUsername, segments });

    if (
      potentialUsername &&
      !['dashboard', 'onboarding', 'auth', 'api'].includes(potentialUsername)
    ) {
      // 🎯 MIDDLEWARE: Usa fetchProfileDirectDB (sem cache) pois Middleware não suporta unstable_cache
      const profile = await fetchProfileDirectDB(potentialUsername);

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
  matcher: [
    /*
     * Ignora:
     * - api (rotas de API)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem do Next)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
