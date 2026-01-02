// lib/supabase.client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Puxa do .env ou usa o host atual como fallback de segurança
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-bdgqiyvasucvhihaueuk-auth-token',
  },
  cookieOptions: {
    domain: COOKIE_DOMAIN,
    path: '/',
    sameSite: 'lax',
    // Verifica se não está em localhost para ativar o Secure
    secure:
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost'),
  },
});
