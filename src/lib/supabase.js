// lib/supabase.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'SUPANEXT_PUBLIC_BASE_URL e SUPABASE_ANON_KEY devem ser definidos.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Usamos sessionStorage, conforme sua arquitetura Cliente-Side
    storage: globalThis.sessionStorage,
    autoRefreshToken: true,
    persistSession: true,

    // Desabilitar o auto-refresh no lado do servidor/middleware para evitar problemas de CORS/segurança
    detectSessionInUrl: typeof window !== 'undefined',
  },
});

// Nota: Para Server Actions e Route Handlers, você usará a função createClient()
// diretamente com a Chave de Serviço, que é mais segura.
