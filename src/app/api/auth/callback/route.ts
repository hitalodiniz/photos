// app/api/auth/callback/route.ts (CÓDIGO REVISADO)

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const cookieStore = await cookies();

    // Se não houver código, redireciona para a home ou erro.
    if (!code) {
        return NextResponse.redirect(new URL("/", request.url));
    }

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
                // Correção: a remoção deve usar maxAge: 0 no options, ou setar o valor vazio
                remove(name, options) {
                    cookieStore.set(name, '', { ...options, maxAge: 0 }); 
                },
            },
        }
    );

    // 1. TROCA DE CÓDIGO (Grava cookies de sessão)
    // Usamos o código na query param (ou a URL completa) para obter a sessão.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code); 
    
    // 2. CHECAGEM DE ERRO CRÍTICO (Fluxo de estado ou credenciais)
    if (error || !data.session) {
        console.error("Auth callback error:", error || "Sessão não encontrada após troca.");
        // Redireciona para uma página de erro que o usuário possa entender
        return NextResponse.redirect(new URL("/auth/error?message=Login falhou", request.url));
    }

    // Acessa os dados da sessão
    const { user } = data.session;
    // O provider_refresh_token está disponível diretamente no objeto data.session (se o login usou PKCE/offline)
    const providerRefreshToken = data.session.provider_refresh_token; 

    // 3. PERSISTÊNCIA DO REFRESH TOKEN (Se disponível)
    if (providerRefreshToken && user?.id) {
        // ⚠️ ATENÇÃO: Se sua coluna na tb_profiles for 'id' em vez de 'user_id',
        // você precisa usar o nome da coluna correta para evitar erro de RLS/update.
        
        const { error: updateError } = await supabase
            .from("tb_profiles")
            .update({ google_refresh_token: providerRefreshToken })
            .eq("id", user.id); // ASSUMIMOS QUE O ID DO USUÁRIO ESTÁ NA COLUNA 'id'
            
        if (updateError) {
            console.error("Erro ao salvar refresh token:", updateError.message);
            // NOTA: Não bloqueamos o login por causa desse erro, mas é importante logá-lo.
        }
    }

    // 4. REDIRECIONAMENTO FINAL
    // O usuário está autenticado e a sessão está no cookie.
    return NextResponse.redirect(new URL("/app", request.url)); // Redireciona para a guarda do cliente (/app)
}