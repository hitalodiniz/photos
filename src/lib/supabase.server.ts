// lib/supabase.server.ts (FINAL e GARANTIDO)

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cria e retorna um cliente Supabase para o lado do servidor.
 */
export function createSupabaseServerClient() {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                async get(name: string) { 
                    const store = await cookieStore;
                    return store.get(name)?.value;
                },
                async set(name: string, value: string, options: CookieOptions) {
                    try {
                        const store = await cookieStore;
                        store.set({ name, value, ...options });
                    } catch (error) {
                        // Erro de READONLY_COOKIES esperado em Server Actions
                    }
                },
                async remove(name: string, options: CookieOptions) {
                    try {
                        const store = await cookieStore;
                        store.set({ name, value: '', ...options });
                    } catch (error) {
                        // Erro de READONLY_COOKIES esperado em Server Actions
                        console.log('Erro ao remover cookie:', error);
                    }
                },
            },
            db: {
                schema: 'public', 
            },
        }
    );
}
