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
  const isLocal = process.env.NODE_ENV === 'development';

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const finalOptions = { ...options };

          // Se NÃO for localhost, removemos o tempo de expiração
          // para que o cookie seja deletado ao fechar o navegador.
          if (!isLocal) {
            delete finalOptions.maxAge;
            delete (finalOptions as any).expires;
          }

          cookieStore.set(name, value, finalOptions);
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
