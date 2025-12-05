// lib/supabase.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Usaremos sessionStorage (que é mais seguro que localStorage)
    storage: globalThis.sessionStorage, 
    autoRefreshToken: true,
    persistSession: true,
  },
});