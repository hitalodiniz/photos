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

const isProduction = process.env.NEXT_PUBLIC_NODE_ENV === 'production';

export const supabase = createBrowserClient(
  SUPABASE_PUBLIC_BASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // 🎯 CRÍTICO: Força o fluxo PKCE no cliente
    },
    // 🎯 CONFIGURAÇÃO DE COOKIES PARA PKCE
    // O createBrowserClient usa cookieOptions (não a API cookies)
    cookieOptions: {
      // 🎯 SEM SUBDOMÍNIOS: domain deve ser undefined para permitir que o navegador use o host atual
      // Isso garante que o cookie seja armazenado e enviado corretamente no mesmo domínio
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined, // Sempre undefined quando não há subdomínios
      path: '/',
      sameSite: 'lax', // 'lax' é suficiente quando não há redirecionamentos cross-site
      secure: isProduction, // HTTPS obrigatório em produção para PKCE
      maxAge: 60 * 60 * 24 * 30, // 30 dias - tempo suficiente para o code verifier durante o fluxo OAuth
    },
  },
);
