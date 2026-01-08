// lib/supabase.client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Certifique-se que essa variável na Vercel seja ".suagaleria.com.br"
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

export const supabase = createBrowserClient(
  SUPABASE_PUBLIC_BASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // 🎯 ADICIONE ISSO: Força o fluxo PKCE no cliente
    },
    cookieOptions: {
      domain: COOKIE_DOMAIN, // Se estiver vazio em localhost, ele usa o host atual
      path: '/',
      sameSite: 'lax',
      secure: process.env.NEXT_PUBLIC_NODE_ENV === 'production',
  },
);
