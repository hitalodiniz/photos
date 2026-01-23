/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Callback OAuth do Google
 * - Troca de código por sessão Supabase
 * - Salvamento de tokens do Google (refresh_token, access_token)
 * - Criação de sessão de autenticação
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Qualquer bug pode quebrar todo o fluxo de login
 * - Pode expor tokens sensíveis
 * - Pode permitir acesso não autorizado
 * - Pode salvar tokens inválidos no banco
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda o fluxo OAuth completo
 * 4. Crie/atualize testes unitários
 * 5. Teste extensivamente localmente
 * 6. Solicite revisão de código
 * 
 * 📋 CHECKLIST OBRIGATÓRIO:
 * [ ] Testes unitários criados/atualizados
 * [ ] Testado fluxo completo de login
 * [ ] Validado salvamento de tokens
 * [ ] Testado tratamento de erros
 * [ ] Revisão de código aprovada
 * [ ] Documentação atualizada
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 * 
 * Fluxo: Login -> Google -> Callback -> /dashboard (ou subdomínio)
 */

// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const cookieStore = await cookies();

  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // 🎯 CRÍTICO: Lê todos os cookies ANTES de criar o cliente Supabase
  // Isso força o Next.js a ler os cookies do request, incluindo o code verifier
  const allCookies = cookieStore.getAll();

  // 🎯 DEBUG: Log detalhado dos cookies recebidos
  if (isProduction) {
    /* console.log('[auth/callback] 📋 Cookies recebidos no callback:', {
      totalCookies: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      requestUrl: requestUrl.toString(),
      requestHost: requestUrl.host,
    }); */
  }

  // 🎯 DEBUG: Verifica se o code verifier cookie está presente
  const codeVerifierCookie = allCookies.find(cookie => 
    cookie.name.includes('code-verifier') || 
    cookie.name.includes('verifier') ||
    cookie.name.includes('auth-token')
  );
  
  if (!codeVerifierCookie) {
    console.error('[auth/callback] ❌ Code verifier cookie não encontrado!', {
      isProduction,
      totalCookies: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      requestHost: requestUrl.host,
      cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN || 'não configurado',
    });
  } else if (isProduction) {
    /* console.log('[auth/callback] ✅ Code verifier cookie encontrado:', {
      cookieName: codeVerifierCookie.name,
      hasValue: !!codeVerifierCookie.value,
      valueLength: codeVerifierCookie.value?.length || 0,
    }); */
  }
  
  // 🎯 SEM SUBDOMÍNIOS: domain deve ser undefined para permitir que o navegador use o host atual
  // Isso garante que o cookie seja armazenado e enviado corretamente no mesmo domínio
  const finalCookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;; // Sempre undefined quando não há subdomínios

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 🎯 COOKIE OPTIONS: Deve ser igual ao cliente para garantir que o code verifier seja encontrado
      cookieOptions: {
        domain: finalCookieDomain, // undefined quando não há subdomínios
        path: '/',
        sameSite: 'lax', // 'lax' é suficiente quando não há redirecionamentos cross-site
        secure: isProduction,
      },
      cookies: {
        getAll: () => {
          // 🎯 GARANTE QUE TODOS OS COOKIES SEJAM RETORNADOS
          // Isso é crítico para o PKCE code verifier ser encontrado
          return cookieStore.getAll();
        },
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 🎯 USA AS MESMAS OPÇÕES DO COOKIE OPTIONS ACIMA
            // Isso garante consistência entre cliente e servidor
            const cookieOptions: any = {
              ...options,
              path: '/',
              sameSite: 'lax' as const, // 'lax' é suficiente quando não há redirecionamentos cross-site
              secure: isProduction,
              // 🎯 SEM SUBDOMÍNIOS: domain deve ser undefined
              domain: undefined,
            };
            
            cookieStore.set(name, value, cookieOptions);
          });
        },
      },
    },
  );

  // 1. TROCA DE CÓDIGO (Grava cookies de sessão no domínio correto)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  // 2. CHECAGEM DE ERRO (PKCE / Credenciais)
  if (error || !data.session) {
    // 🎯 LOG EM PRODUÇÃO: Ajuda a debugar problemas de autenticação
    console.error('[auth/callback] ❌ Erro na troca de código por sessão:', {
      error: error?.message || 'Sessão não encontrada',
      errorCode: error?.status,
      hasCode: !!code,
      codeLength: code?.length,
      isProduction,
      cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN || 'não configurado',
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'não configurado',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configurado' : 'não configurado',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', request.url),
    );
  }

  // 🎯 DEBUG: Log completo da sessão antes de desestruturar
  // console.log('[auth/callback] Sessão completa recebida:', {
  //   hasSession: !!data.session,
  //   sessionType: typeof data.session,
  //   sessionKeys: data.session ? Object.keys(data.session) : [],
  // });

  const { user, provider_refresh_token, provider_token, expires_in } =
    data.session;

  // 🎯 VERIFICAÇÃO ALTERNATIVA: Tenta acessar o refresh token de outras formas
  // IMPORTANTE: Não usar refresh_token (token interno do Supabase), apenas provider_refresh_token (token do Google)
  const sessionAny = data.session as any;
  
  // ⚠️ NÃO usar sessionAny.refresh_token - esse é o token interno do Supabase, não o do Google!
  // O token do Google deve começar com "1//0" e ser muito mais longo
  const alternativeRefreshToken = 
    sessionAny?.provider_refresh_token || 
    sessionAny?.providerRefreshToken;
    // NÃO incluir: sessionAny?.refresh_token (é token do Supabase, não do Google!)

  // console.log('[auth/callback] Tentativas de encontrar refresh token:', {
  //   provider_refresh_token: !!provider_refresh_token,
  //   provider_refresh_token_length: provider_refresh_token?.length || 0,
  //   provider_refresh_token_preview: provider_refresh_token ? `${provider_refresh_token.substring(0, 10)}...` : 'null',
  //   alternativeRefreshToken: !!alternativeRefreshToken,
  //   alternativeRefreshToken_length: alternativeRefreshToken?.length || 0,
  //   sessionAnyKeys: Object.keys(sessionAny || {}),
  //   // ⚠️ AVISO: refresh_token na sessão é do Supabase, não do Google!
  //   hasSupabaseRefreshToken: 'refresh_token' in sessionAny,
  // });

  // 🎯 DEBUG: Log detalhado do que está vindo na sessão
  // console.log('[auth/callback] Dados da sessão recebidos:', {
  //   userId: user?.id,
  //   hasProviderRefreshToken: !!provider_refresh_token,
  //   hasProviderToken: !!provider_token,
  //   expiresIn: expires_in,
  //   providerRefreshTokenLength: provider_refresh_token?.length || 0,
  //   providerTokenLength: provider_token?.length || 0,
  //   sessionKeys: Object.keys(data.session || {}),
  // });

  // 🎯 Verifica se o refresh token está vindo em outro lugar
  // const sessionData = data.session as any;
  // console.log('[auth/callback] Estrutura completa da sessão:', {
  //   hasProviderRefreshToken: 'provider_refresh_token' in sessionData,
  //   hasProviderToken: 'provider_token' in sessionData,
  //   allKeys: Object.keys(sessionData || {}),
  //   // Não logamos valores sensíveis, apenas estrutura
  // });

  // 3. PERSISTÊNCIA DO REFRESH TOKEN
  if (user?.id) {
    const updates: any = {};

    // Salva o Refresh Token se disponível (essencial para futuras renovações)
    // ⚠️ CRÍTICO: Usar APENAS provider_refresh_token (token do Google), NÃO refresh_token (token do Supabase)
    // O token do Google geralmente começa com "1//0" e tem ~50+ caracteres
    // O token do Supabase é muito mais curto e não serve para renovar tokens do Google
    const refreshTokenToSave = provider_refresh_token || alternativeRefreshToken;
    
    // Validação: Verifica se o token parece ser um token do Google (formato típico: "1//0...")
    const isValidGoogleRefreshToken = refreshTokenToSave && 
      (refreshTokenToSave.startsWith('1//0') || refreshTokenToSave.length > 30);
    
    // console.log(`[auth/callback] Validação do refresh token:`, {
    //   hasRefreshTokenToSave: !!refreshTokenToSave,
    //   refreshTokenLength: refreshTokenToSave?.length || 0,
    //   startsWith1Slash0: refreshTokenToSave?.startsWith('1//0') || false,
    //   lengthGreaterThan30: (refreshTokenToSave?.length || 0) > 30,
    //   isValid: isValidGoogleRefreshToken,
    // });
    
    if (refreshTokenToSave && isValidGoogleRefreshToken) {
      updates.google_refresh_token = refreshTokenToSave;
      // console.log(`[auth/callback] ✅ Refresh token do Google encontrado e será salvo para userId: ${user.id}`);
      // console.log(`[auth/callback] Token length: ${refreshTokenToSave.length}, Preview: ${refreshTokenToSave.substring(0, 15)}...`);
      // console.log(`[auth/callback] Fonte do refresh token: ${provider_refresh_token ? 'provider_refresh_token' : 'alternativeRefreshToken'}`);
      // console.log(`[auth/callback] Token adicionado ao objeto updates: ${!!updates.google_refresh_token}`);
    } else if (refreshTokenToSave && !isValidGoogleRefreshToken) {
      // Token encontrado mas formato inválido - pode ser token do Supabase
      // console.error(`[auth/callback] ❌ Token encontrado mas formato inválido para userId: ${user.id}`);
      // console.error(`[auth/callback] Token recebido: "${refreshTokenToSave}" (length: ${refreshTokenToSave.length})`);
      // console.error(`[auth/callback] ⚠️ Este parece ser um token do Supabase, não do Google!`);
      // console.error(`[auth/callback] Tokens do Google geralmente começam com "1//0" e têm 50+ caracteres`);
      // console.error(`[auth/callback] NÃO salvando token inválido no banco`);
      // NÃO salva o token inválido
    } else {
      // console.warn(`[auth/callback] ⚠️ Refresh token do Google NÃO encontrado na sessão para userId: ${user.id}`);
      // console.warn(`[auth/callback] provider_refresh_token: ${provider_refresh_token ? 'existe' : 'null/undefined'}`);
      // console.warn(`[auth/callback] alternativeRefreshToken: ${alternativeRefreshToken ? 'existe' : 'null/undefined'}`);
      // console.warn('[auth/callback] Possíveis causas:');
      // console.warn('  1. Google não retornou refresh token (pode acontecer se usuário já autorizou antes)');
      // console.warn('  2. Configuração OAuth no Supabase pode estar incorreta');
      // console.warn('  3. É necessário usar prompt: "consent" para forçar novo refresh token');
      // console.warn('  4. Supabase pode não estar expondo provider_refresh_token na sessão');
      // console.warn('[auth/callback] Dica: Tente fazer logout completo e login novamente com forceConsent=true');
    }

    // Salva o Access Token inicial para o service já ler do banco
    if (provider_token) {
      updates.google_access_token = provider_token;

      // Calcula a expiração (expires_in costuma ser 3600 segundos para o Google)
      const expiresInSeconds = expires_in || 3600;
      updates.google_token_expires_at = new Date(
        Date.now() + expiresInSeconds * 1000,
      ).toISOString();
      // console.log(`[auth/callback] ✅ Access token encontrado e será salvo para userId: ${user.id}`);
    } else {
      // console.warn(`[auth/callback] ⚠️ Access token NÃO encontrado na sessão para userId: ${user.id}`);
    }

    // 🎯 Marca status de autenticação como ativo quando tokens são salvos
    if (provider_refresh_token || provider_token) {
      updates.google_auth_status = 'active';
    }

    try {
      await supabase
        .from('tb_profiles')
        .update(updates)
        .eq('id', user.id)
        .select('google_refresh_token, google_auth_status, google_access_token');
    } catch {
      // console.error('[auth/callback] ❌ Erro ao salvar tokens iniciais:');
    }
  } else {
    // console.error('[auth/callback] ❌ User ID não encontrado na sessão');
  }

  // 4. VERIFICAÇÃO DO REFRESH TOKEN APÓS LOGIN
  // Se o refresh token não foi salvo, redireciona com parâmetro para mostrar alerta
  let needsConsent = false;
  
  if (user?.id) {
    // Verifica se o refresh token foi realmente salvo no banco
    const { data: profile } = await supabase
      .from('tb_profiles')
      .select('google_refresh_token, google_auth_status')
      .eq('id', user.id)
      .single();

    const hasValidRefreshToken = profile?.google_refresh_token && 
      (profile.google_refresh_token.startsWith('1//0') || profile.google_refresh_token.length > 30);
    
    const isTokenRevokedOrExpired = profile?.google_auth_status === 'revoked' || 
      profile?.google_auth_status === 'expired';

    if (!hasValidRefreshToken || isTokenRevokedOrExpired) {
      needsConsent = true;
      // console.log('[auth/callback] ⚠️ Refresh token não encontrado ou inválido após login');
      // console.log('[auth/callback] Redirecionando com needsConsent=true para mostrar alerta ao usuário');
    } else {
      // console.log('[auth/callback] ✅ Refresh token válido encontrado no banco');
    }
  }

  // 5. REDIRECIONAMENTO FINAL
  // Se precisa de consent, redireciona com parâmetro para mostrar alerta
  const redirectUrl = new URL('/dashboard', request.url);
  if (needsConsent) {
    redirectUrl.searchParams.set('needsConsent', 'true');
  }
  
  return NextResponse.redirect(redirectUrl);
}
