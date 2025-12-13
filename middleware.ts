import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("host") || "";
  const isLocalhost = host.includes("localhost");

  // Exemplo: hitalo.localhost:3000 → subdomain = "hitalo"
  const subdomain = isLocalhost
    ? host.split(".")[0] // localhost:3000 → "localhost"
    : host.split(".")[0];

  // Se for localhost puro, não é subdomínio
  const isSubdomain =
    isLocalhost && subdomain !== "localhost"
      ? true
      : !isLocalhost && host.split(".").length > 2;

  // Se NÃO for subdomínio → segue fluxo normal
  if (!isSubdomain) {
    return NextResponse.next();
  }

  // Se for subdomínio, precisamos verificar se existe fotógrafo com esse username
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          // Não precisa setar cookies aqui
        },
        remove(name, options) {
          // Não precisa remover cookies aqui
        },
      },
    }
  );

  const { data: profile } = await supabase
    .from("tb_profiles")
    .select("id, username, use_subdomain")
    .eq("username", subdomain)
    .single();

  // Se o subdomínio não pertence a ninguém → 404
  if (!profile || !profile.use_subdomain) {
    return NextResponse.rewrite(new URL("/404", req.url));
  }

  // Agora sabemos que o subdomínio é válido
  // Vamos reescrever a URL para a rota interna correta

  // Exemplo:
  // hitalo.localhost:3000/2025/10/05/casamento
  // vira:
  // localhost:3000/_subdomain/hitalo/2025/10/05/casamento

  const newUrl = req.nextUrl.clone();
  newUrl.pathname = `/_subdomain/${profile.username}${url.pathname}`;

  return NextResponse.rewrite(newUrl);
}

export const config = {
  matcher: [
    "/((?!_next|api|static|favicon.ico|robots.txt).*)",
  ],
};
