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
/*
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
);*/
// lib/supabase.client.ts (Final)
/*'use client'

import { createBrowserClient } from '@supabase/ssr'
// 🚨 Removemos a importação de 'CookieOptions' para simplificar
import { getCookies, setCookie, deleteCookie } from 'cookies-next'; 

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Define um tipo simples de opções de cookie para o cliente,
// já que o tipo original está deprecated.
type SimpleCookieOptions = {
    name: string;
    value: string;
    maxAge?: number;
    path?: string;
    expires?: Date;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
};

export const supabase = createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        cookies: {
            get(name: string) {
                return getCookies()[name];
            },
            set(name: string, value: string, options: SimpleCookieOptions) {
                // Usamos a função setCookie do cookies-next
                // Note que o tipo de opções do cookies-next é compatível com SimpleCookieOptions
                setCookie(name, value, options);
            },
            remove(name: string, options: SimpleCookieOptions) {
                deleteCookie(name, options);
            },
        },
        auth: {
            // Mantenha a persistência.
            persistSession: true,
        },
        // 🚨 O SDK prefere não ver o objeto 'cookies' se não for na rota de sincronização.
        // Se o aviso persistir, você pode precisar ignorá-lo com um comentário TypeScript:
        // @ts-ignore
    }
);
*/
// lib/supabase.client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    //storage: globalThis.sessionStorage,
    persistSession: true,
  },
});
