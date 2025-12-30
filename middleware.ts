import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Cache (mantenha, mas com ciência das limitações do Edge)
const subdomainCache = new Map<
  string,
  { username: string; createdAt: number }
>();
const SUBDOMAIN_CACHE_TTL = 1000 * 60 * 5;

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
    }
  );

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || '';
  const pathname = url.pathname;

  const res = NextResponse.next();

  // 1. CLIENTE SUPABASE (Validar Sessão)
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

  // Use getUser() para segurança real no Dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ============================================
  // A. PROTEÇÃO DE ROTAS (Dashboard / Onboarding)
  // ============================================
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isOnboardingRoute = pathname.startsWith('/onboarding');

  if (isDashboardRoute || isOnboardingRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return res;
  }

  // ============================================
  // B. LÓGICA DE SUBDOMÍNIO (Galerias Públicas)
  // ============================================

  // Extração de subdomínio mais robusta
  const chunks = host.split('.');
  let subdomain = '';

  if (host.includes('localhost')) {
    if (chunks.length > 1 && chunks[0] !== 'localhost') subdomain = chunks[0];
  } else {
    // Para produção: fotografo.seusite.com.br -> chunks seriam ["fotografo", "seusite", "com", "br"]
    if (chunks.length > 2) subdomain = chunks[0];
  }

  // Se houver subdomínio e não for uma rota de sistema (api, _next, etc)
  if (
    subdomain &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next')
  ) {
    const profile = await getProfileBySubdomain(subdomain, req);

    if (profile) {
      // REWRITE para a pasta estruturada: /_subdomain/[username]/galeria/[...slug]
      // Isso mapeia internamente para sua estrutura de pastas
      return NextResponse.rewrite(
        new URL(`/_subdomain/${profile.username}${pathname}`, req.url),
      );
    }

    // Se o subdomínio não existir no banco, 404
    return NextResponse.rewrite(new URL('/404', req.url));
  }

  return res;
}

// O Matcher deve ser amplo para capturar subdomínios, mas ignorar arquivos
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

/*import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Cache simples em memória para subdomínios válidos
const subdomainCache = new Map<
  string,
  { username: string; use_subdomain: boolean; createdAt: number }
>();

const SUBDOMAIN_CACHE_TTL = 1000 * 60 * 5; // 5 minutos

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
    }
  );

  const { data: profile } = await supabase
    .from("tb_profiles")
    .select("id, username, use_subdomain")
    .eq("username", subdomain)
    .single();

  if (!profile || !profile.use_subdomain) {
    return null;
  }

  const item = {
    username: profile.username,
    use_subdomain: profile.use_subdomain,
    createdAt: now,
  };

  subdomainCache.set(subdomain, item);
  return item;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("host") || "";
  const isLocalhost = host.includes("localhost");

  // Inicia o cliente Supabase para verificar sessão
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.delete({ name, ...options });
        },
      },
    }
  );

  // ============================
  // 1. PROTEÇÃO DO DASHBOARD
  // ============================
  if (url.pathname.startsWith("/dashboard")) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Se não estiver logado, redireciona para a home
    if (!session) {
      const homeUrl = new URL("/", req.url);
      return NextResponse.redirect(homeUrl);
    }
    return res;
  }

  // ============================
  // 2. LÓGICA DE SUBDOMÍNIO
  // ============================
  const subdomain = isLocalhost ? host.split(".")[0] : host.split(".")[0];
  const isSubdomain = isLocalhost && subdomain !== "localhost"
      ? true
      : !isLocalhost && host.split(".").length > 2;

  if (isSubdomain) {
    const profile = await getProfileBySubdomain(subdomain, req);

    if (!profile) {
      return NextResponse.rewrite(new URL("/404", req.url));
    }

    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/_subdomain/${profile.username}${url.pathname}`;
    return NextResponse.rewrite(newUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|api/auth/callback|api/auth|api|static|favicon.ico|robots.txt).*)"],
};
*/
