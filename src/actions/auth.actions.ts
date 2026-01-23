'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { authenticateGaleriaAccess } from '@/core/services/galeria.service';
import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';

/**
 * Server Action para capturar leads e autorizar acesso via cookie
 */
export async function captureLeadAction(
  galeriaId: string,
  data: { nome: string; email?: string | null; whatsapp?: string | null }
) {
  try {
    // 1. Limpeza e padronização dos dados
    const cleanWhatsapp = data.whatsapp ? data.whatsapp.replace(/\D/g, '') : null;

    const supabase = await createSupabaseServerClient();

    // 2. Salva o lead no banco
    const { data: insertedLead, error: leadError } = await supabase
      .from('tb_galeria_leads')
      .insert([
        {
          galeria_id: galeriaId,
          name: data.nome, // 🎯 Coluna corrigida de 'nome' para 'name'
          email: data.email || null,
          whatsapp: cleanWhatsapp,
        },
      ])
      .select('galeria_id, tb_galerias!galeria_id(user_id)')
      .single();

    // 3. Tratamento de deduplicação inteligente (erro 23505 = unique_violation)
    if (leadError) {
      if (leadError.code === '23505') {
        console.log(`[captureLeadAction] Lead já existente (deduplicado): ${data.email || cleanWhatsapp}`);
        
        // Para revalidar o cache mesmo em duplicidade, precisamos do userId do dono da galeria
        const { data: galeriaOwner } = await supabase
          .from('tb_galerias')
          .select('user_id')
          .eq('id', galeriaId)
          .single();
        
        if (galeriaOwner?.user_id) {
          revalidateTag(`user-galerias-${galeriaOwner.user_id}`);
        }
      } else {
        console.error('[captureLeadAction] Erro ao salvar lead:', leadError);
        return { 
          success: false, 
          error: `Erro ao salvar dados: ${leadError.message} (${leadError.code})` 
        };
      }
    } else if (insertedLead?.tb_galerias?.user_id) {
      // SUCESSO: Revalida o cache do dashboard do fotógrafo para atualizar o leads_count
      const userId = insertedLead.tb_galerias.user_id;
      console.log(`[captureLeadAction] Revalidando cache para userId: ${userId}`);
      revalidateTag(`user-galerias-${userId}`);
    }

    // 4. Define o cookie de acesso (válido por 24h)
    const cookieStore = await cookies();
    cookieStore.set(`galeria-${galeriaId}-lead`, 'captured', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    });

    return { 
      success: true, 
      message: leadError?.code === '23505' ? 'Reconhecido' : undefined 
    };
  } catch (error) {
    console.error('[captureLeadAction] Erro crítico:', error);
    return { success: false, error: 'Falha ao processar dados.' };
  }
}

/**
 * Verifica se o usuário tem um refresh token válido do Google
 * Retorna true se o token existe e não está expirado/revogado
 */
export async function checkGoogleRefreshTokenStatus(): Promise<{
  hasValidToken: boolean;
  needsConsent: boolean;
  reason?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Busca o usuário atual
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // Se não há usuário logado, não podemos verificar o token no banco porque não temos o userId
      // IMPORTANTE: Isso acontece quando:
      // 1. Primeiro login (usuário nunca fez login antes)
      // 2. Usuário fez logout e está fazendo login novamente
      // 
      // Neste caso, não podemos saber se o usuário já tem refresh_token no banco ou não.
      // Por segurança, usamos consent para garantir que sempre recebemos o refresh_token.
      // 
      // NOTA: O Google pode retornar refresh_token mesmo com select_account se o usuário já autorizou antes,
      // mas não podemos confiar nisso sem verificar o banco primeiro.
      console.log('[checkGoogleRefreshTokenStatus] ⚠️ Usuário não autenticado (sem sessão ativa)');
      console.log('[checkGoogleRefreshTokenStatus] Não é possível verificar token no banco sem userId');
      console.log('[checkGoogleRefreshTokenStatus] Situação: Primeiro login OU usuário fez logout e está fazendo login novamente');
      console.log('[checkGoogleRefreshTokenStatus] Decisão: Usando consent por segurança para garantir refresh_token');
      return {
        hasValidToken: false,
        needsConsent: true, // Usa consent quando não há sessão para garantir refresh_token
        reason: 'Usuário não autenticado - não é possível verificar token sem sessão (pode ser primeiro login ou re-login após logout)',
      };
    }
    
    console.log(`[checkGoogleRefreshTokenStatus] Usuário autenticado: ${user.id}, verificando token no banco...`);

    // Busca o perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('tb_profiles')
      .select('google_refresh_token, google_auth_status, google_access_token, google_token_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log(`[checkGoogleRefreshTokenStatus] Perfil não encontrado para userId: ${user.id}`);
      return {
        hasValidToken: false,
        needsConsent: true,
        reason: 'Perfil não encontrado',
      };
    }

    // Verifica se tem refresh token
    if (!profile.google_refresh_token) {
      console.log(`[checkGoogleRefreshTokenStatus] Refresh token não encontrado para userId: ${user.id}`);
      return {
        hasValidToken: false,
        needsConsent: true,
        reason: 'Refresh token não encontrado',
      };
    }

    console.log(`[checkGoogleRefreshTokenStatus] Refresh token encontrado para userId: ${user.id}`, {
      tokenLength: profile.google_refresh_token.length,
      tokenPreview: profile.google_refresh_token.substring(0, 15) + '...',
      authStatus: profile.google_auth_status,
    });

    // Verifica se o status indica problema
    // IMPORTANTE: Se o status for null ou undefined, assume que está ativo (compatibilidade com registros antigos)
    const authStatus = profile.google_auth_status;
    if (authStatus === 'revoked' || authStatus === 'expired') {
      console.log(`[checkGoogleRefreshTokenStatus] Status indica problema: ${authStatus}`);
      return {
        hasValidToken: false,
        needsConsent: true,
        reason: `Token ${authStatus}`,
      };
    }
    
    // Se o status for 'active' ou null/undefined (registros antigos), considera válido se tem token
    if (authStatus && authStatus !== 'active') {
      console.log(`[checkGoogleRefreshTokenStatus] Status desconhecido: ${authStatus}, assumindo válido se token existe`);
    }

    // 🎯 Validação adicional: Verifica se o refresh token tem formato válido do Google
    // Tokens do Google geralmente começam com "1//0" e têm 50+ caracteres
    const isValidFormat = profile.google_refresh_token && 
      (profile.google_refresh_token.startsWith('1//0') || profile.google_refresh_token.length > 30);
    
    if (!isValidFormat) {
      console.log(`[checkGoogleRefreshTokenStatus] Token tem formato inválido (pode ser token do Supabase)`);
      return {
        hasValidToken: false,
        needsConsent: true,
        reason: 'Token com formato inválido',
      };
    }

    // Token válido - não precisa de consent
    console.log(`[checkGoogleRefreshTokenStatus] ✅ Token válido encontrado para userId: ${user.id}`);
    return {
      hasValidToken: true,
      needsConsent: false,
    };
  } catch (error) {
    console.error('[checkGoogleRefreshTokenStatus] Erro ao verificar token:', error);
    // Em caso de erro, assume que precisa de consent para garantir
    return {
      hasValidToken: false,
      needsConsent: true,
      reason: 'Erro ao verificar token',
    };
  }
}

/**
 * Server Action para autenticação de acesso a galerias protegidas
 * Envolve authenticateGaleriaAccess para uso em componentes cliente
 */
export async function authenticateGaleriaAccessAction(
  galeriaId: string,
  fullSlug: string,
  password: string,
) {
  return authenticateGaleriaAccess(galeriaId, fullSlug, password);
}
