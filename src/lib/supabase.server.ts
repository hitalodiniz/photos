// src/lib/supabase.server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPANEXT_PUBLIC_BASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Só funciona em Server Actions / Route Handlers
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
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

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPANEXT_PUBLIC_BASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // ❌ Não pode escrever cookies fora de Server Actions
        set() {},
        remove() {},
      },
    },
  );
}
