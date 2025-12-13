// app/api/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(
    request.url
  );

  if (error || !data.session) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const { user, provider_refresh_token } = data.session;

  // ✅ Salvar o refresh token na tb_profiles
  if (provider_refresh_token && user?.id) {
    const { error: updateError } = await supabase
      .from("tb_profiles")
      .update({ google_refresh_token: provider_refresh_token })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Erro ao salvar refresh token:", updateError.message);
    }
  }

  if (error || !data.session) {
    console.error("Auth callback error:", error);
    return Response.redirect(new URL("/auth/error", request.url));
  }

  // salvar refresh_token, redirecionar, etc.
  return Response.redirect(new URL("/dashboard", request.url));
}
