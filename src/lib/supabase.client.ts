// lib/supabase.client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

const SUPANEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Puxa do .env ou usa o host atual como fallback de segurança
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

// Extrai o ID do projeto da URL automaticamente (ex: bdgqiyvasucvhihaueuk)
const projectId = new URL(SUPANEXT_PUBLIC_BASE_URL).hostname.split('.')[0];

export const supabase = createBrowserClient(
  SUPANEXT_PUBLIC_BASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: `sb-${projectId}-auth-token`,
    },
    cookieOptions: {
      domain: COOKIE_DOMAIN,
      path: '/',
      sameSite: 'lax',
      // Verifica se não está em localhost para ativar o Secure
      secure: process.env.NEXT_PUBLIC_NODE_ENV === 'production',
    },
  },
);
