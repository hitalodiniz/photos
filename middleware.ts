// middleware.ts
import { NextResponse } from "next/server";
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

  // ============================
  // 1. PROTEÇÃO DO DASHBOARD
  // ============================
  if (url.pathname.startsWith("/dashboard")) {
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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("next", url.pathname + url.search);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ============================
  // 2. LÓGICA DE SUBDOMÍNIO
  // ============================

  const subdomain = isLocalhost
    ? host.split(".")[0]
    : host.split(".")[0];

  const isSubdomain =
    isLocalhost && subdomain !== "localhost"
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

  // ============================
  // 3. GALERIAS (PÚBLICAS OU PRIVADAS)
  // ============================
  // O middleware NÃO bloqueia galerias privadas.
  // A página da galeria é responsável por pedir senha.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api/auth/callback|api/auth|api|static|favicon.ico|robots.txt).*)",
  ],
};
