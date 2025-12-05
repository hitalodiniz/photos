import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 1. Muda o armazenamento de 'localStorage' (padrão) para 'sessionStorage'
    storage: globalThis.sessionStorage, 
    // 2. Garante que os tokens de refresh sejam usados
    autoRefreshToken: true,
    persistSession: true,
  },
});