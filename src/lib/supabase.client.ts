/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Cliente Supabase do browser
 * - Configuração de cookies de autenticação
 * - Configuração de domínio para subdomínios
 * - Fluxo PKCE para segurança
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Mudanças em cookieOptions podem quebrar autenticação cross-domain
 * - Mudanças em flowType podem quebrar segurança OAuth
 * - Pode expor tokens via cookies mal configurados
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda configuração de cookies cross-domain
 * 4. Teste extensivamente em subdomínios
 * 5. Solicite revisão de código
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

// lib/supabase.client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Certifique-se que essa variável na Vercel
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
  },
);
