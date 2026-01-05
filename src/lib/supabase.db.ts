// lib/supabase.db.ts
import { createClient } from '@supabase/supabase-js';

export function createSupabaseDbClient(jwtToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPANEXT_PUBLIC_BASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      },
    },
  );
}
