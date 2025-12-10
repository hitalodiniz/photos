// src/app/api/auth/callback/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Esta rota lida com o callback OAuth e a sincronização do token para o cookie HTTP.
export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (code) {
        // Cria o cliente que pode LER e ESCREVER cookies
        const supabase = createRouteHandlerClient({ cookies });
        
        // Troca o código pela sessão. Esta chamada FORÇA a gravação do cookie HTTP.
        await supabase.auth.exchangeCodeForSession(code);
    }
    
    // Redireciona para o ponto de entrada da aplicação (onde o AppClientGuard fará o trabalho)
    return NextResponse.redirect(`${requestUrl.origin}/app`);
}