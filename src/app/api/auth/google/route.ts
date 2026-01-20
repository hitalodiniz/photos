/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Rota de login Google OAuth
 * - Redirecionamento para callback do Supabase
 * - Validação de parâmetros OAuth (code, state)
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Bug pode quebrar todo o fluxo de login
 * - Pode expor parâmetros OAuth incorretamente
 * - Pode causar redirecionamentos incorretos
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda fluxo OAuth completo
 * 4. Teste extensivamente
 * 5. Solicite revisão de código
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Se o Google redirecionar para cá sem esses itens, o erro acontece
  if (!code || !state) {
    console.error('DEBUG: Google retornou sem code ou state');
    return NextResponse.redirect(
      new URL('/?error=missing_parameters', request.url),
    );
  }

  // Pegamos a URL do projeto bdgqiy do seu .env.local
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; // http://localhost:3000

  const supabaseCallbackUrl = new URL(`${supabaseUrl}/auth/v1/callback`);

  supabaseCallbackUrl.searchParams.set('code', code);
  supabaseCallbackUrl.searchParams.set('state', state);

  // O redirecionamento final deve ser para o domínio principal (localhost:3000)
  // para que o cookie .localhost seja gravado corretamente
  supabaseCallbackUrl.searchParams.set(
    'redirect_to',
    `${baseUrl}/api/auth/callback`,
  );

  return NextResponse.redirect(supabaseCallbackUrl.toString());
}
