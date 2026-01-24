/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Cliente Supabase do servidor (SSR)
 * - Gerenciamento de cookies no servidor
 * - Clientes read-only para SSR
 * - Cliente para cache (sem cookies)
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Mudanças podem quebrar autenticação SSR
 * - Pode expor cookies incorretamente
 * - Pode causar problemas de sincronização de sessão
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda diferença entre clientes (read/write/read-only)
 * 4. Teste extensivamente em SSR
 * 5. Solicite revisão de código
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

// src/lib/supabase.server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * ============================================================
 * 1) CLIENTE COMPLETO — PODE LER E ESCREVER COOKIES
 * Use SOMENTE em:
 *  - Server Actions
 *  - Route Handlers (app/api/.../route.ts)
 * ============================================================
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: cookieDomain,
        path: '/',
        sameSite: 'lax',
        secure: isProduction,
      },
      cookies: {
        getAll: () => {
          return cookieStore.getAll();
        },
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = { 
              ...options,
              domain: cookieDomain,
              path: '/',
              sameSite: 'lax' as const,
              secure: isProduction,
            };

            // Se NÃO for localhost, removemos o tempo de expiração
            // para que o cookie seja deletado ao fechar o navegador.
            if (isProduction) {
              delete finalOptions.maxAge;
              delete (finalOptions as any).expires;
            }

            cookieStore.set(name, value, finalOptions);
          });
        },
      },
    },
  );
}

/**
 * ============================================================
 * 2) CLIENTE READ-ONLY — NÃO PODE ESCREVER COOKIES
 * Use em:
 *  - page.tsx (SSR)
 *  - layout.tsx
 *  - generateMetadata
 *  - sitemap.ts
 *  - robots.ts
 *  - qualquer SSR que NÃO seja Server Action
 * ============================================================
 */
export async function createSupabaseServerClientReadOnly() {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: cookieDomain,
        path: '/',
        sameSite: 'lax',
        secure: isProduction,
      },
      cookies: {
        getAll: () => {
          return cookieStore.getAll();
        },
        // ❌ Não pode escrever cookies fora de Server Actions
        setAll() {},
      },
    },
  );
}

/**
 * ============================================================
 * 3) CLIENTE PARA CACHE (ANON) — NÃO TOCA EM COOKIES
 * Use SOMENTE em:
 * - Funções dentro de 'unstable_cache'
 * - Quando você precisa apenas de dados públicos
 * ============================================================
 */
export function createSupabaseClientForCache() {
  // 🎯 Retorna um cliente simples que não depende de cookies do Next.js
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
