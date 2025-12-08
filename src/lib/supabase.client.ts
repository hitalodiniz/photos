// lib/supabase.client.ts
'use client';

import { createBrowserClient, type CookieOptions } from '@supabase/ssr';
// Certifique-se de que o caminho para o seu projeto esteja definido
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


/**
 * Cria e retorna um cliente Supabase para o lado do cliente (Browser).
 * Este cliente é configurado para armazenar o token de autenticação como HTTP Cookies.
 */
export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        // Garante que o SDK saiba que o armazenamento deve ser feito via cookies
        cookieOptions: {
            name: 'sb-auth-token', // Nome padrão do cookie de autenticação
        }
    }
  )
}

// O cliente principal que deve ser usado em todos os Client Components
export const supabase = createClient();