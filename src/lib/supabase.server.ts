import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cria e retorna um cliente Supabase que lê os cookies do servidor.
 */
export function createSupabaseServerClient() {
    const cookieStore = cookies();
    
    // O nome padrão do cookie do Supabase no ambiente de produção geralmente é "sb-[project-ref]-auth-token"
    // Usamos o objeto global `cookies` para configurar o nome correto.
    const cookieOptions = {
        name: 'sb-bdgqiyvasucvhihaueuk-auth-token', // 🚨 SUBSTITUA 'bgqiyvasucvhihaueuk' pela sua REFERÊNCIA REAL do Projeto Supabase 
                                                 // (ou use o nome do cookie que você vê no F12 -> Application -> Cookies)
    };

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    // Agora, o nome 'name' virá com o prefixo correto
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                         // ...
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // ...
                    }
                },
            },
            // 🚨 NOVO: Incluir o nome do cookie na configuração do cliente
            cookieOptions: cookieOptions, 
            db: {
                schema: 'public', 
            },
        }
    );
}