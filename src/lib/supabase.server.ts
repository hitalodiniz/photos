// src/lib/supabase.server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const store = await cookies(); // ⬅ cookies() é assíncrono no Next 15
          return store.get(name)?.value;
        },

        async set(name: string, value: string, options: any) {
          const store = await cookies();
          store.set(name, value, options);
        },

        async remove(name: string, options: any) {
          const store = await cookies();
          store.set(name, "", { ...options, maxAge: 0 });
        }
      }
    }
  );
}
