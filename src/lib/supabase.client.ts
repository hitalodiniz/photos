// lib/supabase/client.ts (FINAL E SIMPLIFICADO)
/*'use client'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: globalThis.sessionStorage, // 🚨 Volta para o Local Storage (o mais estável)
      persistSession: true,
    },
  }
);*/

'use client'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 🚨 SUBSTITUA PELA SUA REFERÊNCIA REAL DE PROJETO
const PROJECT_REF = 'bdgqiyvasucvhihaueuk'; 

// Define a chave exata que o Supabase usará no Local Storage
const LOCAL_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`; 


export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            // 🚨 MUDANÇA: Usa o Local Storage para persistência de longo prazo
            storage: globalThis.localStorage, 
            storageKey: LOCAL_STORAGE_KEY, 
            persistSession: true, 
        },
    }
);
