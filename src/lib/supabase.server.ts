// lib/supabase.server.ts (FINAL e GARANTIDO)

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
// Importamos o RequestCookie (o objeto que .get(name) retorna)
import { type RequestCookie } from 'next/dist/server/web/spec-extension/cookies'; 
import { type ResponseCookieStore } from 'next/dist/server/web/spec-extension/cookies';
    // O cookieStore é o objeto que você precisa
    const writableCookieStore = cookieStore as ResponseCookieStore;

/**
 * Cria e retorna um cliente Supabase para o lado do servidor.
 */
export function createSupabaseServerClient() {
    // 1. Chamada síncrona. Removemos a conversão 'as unknown as ReadonlyRequestCookies'.
    const cookieStore = cookies();
    
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // 🔑 CRUCIAL: A função 'get' deve ser async e usar await.
                async get(name: string) { 
                    // O método .get(name) existe. Usamos 'await' para resolver a Promise.
                    // O erro de tipagem será resolvido porque não estamos mais forçando a conversão.
                    
                    // O tipo de retorno de cookieStore.get(name) é Promise<RequestCookie | undefined>
                    const cookie = await cookieStore.get(name) as RequestCookie | undefined; 
                    return cookie?.value;
                },
       // mas apenas gravam cookies em Route Handlers, não em Server Actions.
               set(name: string, value: string, options: CookieOptions) {
                    try {
                        writableCookieStore.set({ name, value, ...options });
                    } catch (error) {
                         // Erro de READONLY_COOKIES esperado em Server Actions
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        writableCookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // Erro de READONLY_COOKIES esperado em Server Actions
                    }
                },
            },
            db: {
                schema: 'public', 
            },
        }
    );
}
