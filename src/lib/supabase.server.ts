// lib/supabase.server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cria e retorna um cliente Supabase que lê os cookies do servidor (Server Components / Server Actions).
 */
export function createSupabaseServerClient() {
    const cookieStore = cookies();
    console.log('Criando Supabase Server Client com cookies do servidor.', cookieStore.getAll().length);
    
    // O nome padrão do cookie é lido automaticamente pelo createServerClient,
    // mas precisamos fornecer os métodos get/set/remove usando a API 'cookies()' do Next.js.

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    // Retorna o valor do cookie lido diretamente dos headers da requisição.
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Esta função é executada quando o Supabase tenta SETAR um cookie.
                    // Em Server Components/Actions, geralmente falha por ser tarde demais,
                    // mas é mantida por completude e estabilidade.
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // O 'error' aqui é comum (READONLY_COOKIES)
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // O 'error' aqui é comum (READONLY_COOKIES)
                    }
                },
            },
            db: {
                schema: 'public', 
            },
        }
    );
}