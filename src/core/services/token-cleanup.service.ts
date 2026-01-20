// core/services/token-cleanup.service.ts
import { createSupabaseServerClient } from '@/lib/supabase.server';

interface TokenCleanupResult {
  success: boolean;
  cleaned: number;
  validated: number;
  failed: number;
  errors: string[];
  message: string;
}

interface TokenValidationResult {
  userId: string;
  email?: string;
  status: 'valid' | 'expired' | 'revoked' | 'invalid';
  action: 'kept' | 'cleaned' | 'updated';
}

/**
 * 🧹 ROTINA DE LIMPEZA E VALIDAÇÃO DE TOKENS GOOGLE
 * 
 * Esta função:
 * 1. Remove tokens de acesso expirados (baseado em google_token_expires_at)
 * 2. Valida refresh tokens ativos
 * 3. Remove tokens com status 'expired' ou 'revoked'
 * 4. Atualiza google_auth_status conforme necessário
 * 
 * @param options Opções de limpeza
 * @returns Resultado da operação
 */
export async function cleanupGoogleTokens(options: {
  /**
   * Remove tokens de acesso expirados há mais de X dias (padrão: 7)
   * Se 0, remove todos os expirados
   */
  removeExpiredAccessTokensDays?: number;
  
  /**
   * Valida refresh tokens ativos (faz chamada ao Google)
   * Se false, apenas limpa baseado em status e data
   */
  validateRefreshTokens?: boolean;
  
  /**
   * Remove tokens que não foram usados há X dias (padrão: 90)
   * Se 0, não remove por inatividade
   */
  removeInactiveTokensDays?: number;
  
  /**
   * Limpa apenas tokens com status específico
   * Se não especificado, processa todos
   */
  onlyStatus?: 'expired' | 'revoked' | 'active' | null;
} = {}): Promise<TokenCleanupResult> {
  const {
    removeExpiredAccessTokensDays = 7,
    validateRefreshTokens = false,
    removeInactiveTokensDays = 90,
    onlyStatus = null,
  } = options;

  const supabase = await createSupabaseServerClient();
  const errors: string[] = [];
  let cleaned = 0;
  let validated = 0;
  let failed = 0;

  try {
    // 1. Busca todos os perfis com tokens Google
    let query = supabase
      .from('tb_profiles')
      .select('id, email, google_refresh_token, google_access_token, google_token_expires_at, google_auth_status, updated_at')
      .not('google_refresh_token', 'is', null);

    // Filtra por status se especificado
    if (onlyStatus) {
      query = query.eq('google_auth_status', onlyStatus);
    }

    const { data: profiles, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Erro ao buscar perfis: ${fetchError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        cleaned: 0,
        validated: 0,
        failed: 0,
        errors: [],
        message: 'Nenhum perfil com tokens Google encontrado.',
      };
    }

    const now = Date.now();
    const expiredThreshold = removeExpiredAccessTokensDays > 0
      ? now - (removeExpiredAccessTokensDays * 24 * 60 * 60 * 1000)
      : 0;
    const inactiveThreshold = removeInactiveTokensDays > 0
      ? now - (removeInactiveTokensDays * 24 * 60 * 60 * 1000)
      : 0;

    const validationResults: TokenValidationResult[] = [];

    // 2. Processa cada perfil
    for (const profile of profiles) {
      try {
        let shouldClean = false;
        let shouldUpdate = false;
        let newStatus: 'active' | 'expired' | 'revoked' | null = null;
        const updates: any = {};

        // 2.1. Verifica se o access token está expirado há muito tempo
        if (profile.google_token_expires_at) {
          try {
            const expiresAt = new Date(profile.google_token_expires_at).getTime();
            if (expiresAt < expiredThreshold) {
              // Token expirado há muito tempo - remove
              updates.google_access_token = null;
              updates.google_token_expires_at = null;
              shouldClean = true;
            }
          } catch (dateError) {
            // Data inválida - remove
            updates.google_access_token = null;
            updates.google_token_expires_at = null;
            shouldClean = true;
          }
        }

        // 2.2. Verifica status de autenticação
        if (profile.google_auth_status === 'expired' || profile.google_auth_status === 'revoked') {
          // Limpa todos os tokens se status indica problema
          updates.google_refresh_token = null;
          updates.google_access_token = null;
          updates.google_token_expires_at = null;
          shouldClean = true;
        }

        // 2.3. Verifica inatividade (última atualização)
        if (removeInactiveTokensDays > 0 && profile.updated_at) {
          try {
            const lastUpdate = new Date(profile.updated_at).getTime();
            if (lastUpdate < inactiveThreshold) {
              // Token inativo há muito tempo - remove
              updates.google_refresh_token = null;
              updates.google_access_token = null;
              updates.google_token_expires_at = null;
              updates.google_auth_status = 'expired';
              shouldClean = true;
            }
          } catch (dateError) {
            // Ignora erro de data
          }
        }

        // 2.4. Valida refresh token se solicitado
        if (validateRefreshTokens && profile.google_refresh_token && !shouldClean) {
          try {
            const isValid = await validateRefreshToken(profile.google_refresh_token);
            validated++;

            if (!isValid) {
              // Token inválido - limpa tudo
              updates.google_refresh_token = null;
              updates.google_access_token = null;
              updates.google_token_expires_at = null;
              updates.google_auth_status = 'revoked';
              shouldClean = true;
              validationResults.push({
                userId: profile.id,
                email: profile.email || undefined,
                status: 'revoked',
                action: 'cleaned',
              });
            } else {
              // Token válido - atualiza status se necessário
              if (profile.google_auth_status !== 'active') {
                updates.google_auth_status = 'active';
                shouldUpdate = true;
                validationResults.push({
                  userId: profile.id,
                  email: profile.email || undefined,
                  status: 'valid',
                  action: 'updated',
                });
              } else {
                validationResults.push({
                  userId: profile.id,
                  email: profile.email || undefined,
                  status: 'valid',
                  action: 'kept',
                });
              }
            }
          } catch (validationError: any) {
            failed++;
            errors.push(`Erro ao validar token de ${profile.email || profile.id}: ${validationError.message}`);
            validationResults.push({
              userId: profile.id,
              email: profile.email || undefined,
              status: 'invalid',
              action: 'kept',
            });
          }
        }

        // 2.5. Aplica atualizações
        if (shouldClean || shouldUpdate) {
          const { error: updateError } = await supabase
            .from('tb_profiles')
            .update(updates)
            .eq('id', profile.id);

          if (updateError) {
            failed++;
            errors.push(`Erro ao atualizar perfil ${profile.email || profile.id}: ${updateError.message}`);
          } else {
            if (shouldClean) {
              cleaned++;
            }
            if (shouldUpdate) {
              validated++;
            }
          }
        }
      } catch (profileError: any) {
        failed++;
        errors.push(`Erro ao processar perfil ${profile.email || profile.id}: ${profileError.message}`);
      }
    }

    const message = `Limpeza concluída: ${cleaned} token(s) removido(s), ${validated} token(s) validado(s), ${failed} erro(s).`;

    return {
      success: true,
      cleaned,
      validated,
      failed,
      errors,
      message,
    };
  } catch (error: any) {
    console.error('[token-cleanup.service] Erro na limpeza de tokens:', error);
    return {
      success: false,
      cleaned,
      validated,
      failed,
      errors: [error.message || 'Erro desconhecido na limpeza de tokens'],
      message: `Falha na limpeza: ${error.message}`,
    };
  }
}

/**
 * Valida um refresh token fazendo uma chamada de teste ao Google
 */
async function validateRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    // Se retornou access_token, o refresh token é válido
    if (data.access_token) {
      return true;
    }

    // Se retornou erro de token inválido, não é válido
    if (data.error === 'invalid_grant' || data.error === 'invalid_request') {
      return false;
    }

    // Outros erros são tratados como falha de validação (não como token inválido)
    throw new Error(data.error || 'Erro desconhecido na validação');
  } catch (error: any) {
    // Erros de rede ou outros são tratados como falha, não como token inválido
    throw error;
  }
}

/**
 * 🎯 LIMPEZA RÁPIDA: Remove apenas tokens claramente expirados/inválidos
 * Sem validação ativa (mais rápido, menos preciso)
 */
export async function quickCleanupGoogleTokens(): Promise<TokenCleanupResult> {
  return cleanupGoogleTokens({
    removeExpiredAccessTokensDays: 0, // Remove todos os expirados
    validateRefreshTokens: false, // Não valida (mais rápido)
    removeInactiveTokensDays: 0, // Não remove por inatividade
  });
}

/**
 * 🎯 LIMPEZA COMPLETA: Valida todos os tokens ativos
 * Mais lento, mas mais preciso
 */
export async function fullCleanupGoogleTokens(): Promise<TokenCleanupResult> {
  return cleanupGoogleTokens({
    removeExpiredAccessTokensDays: 7,
    validateRefreshTokens: true, // Valida todos os refresh tokens
    removeInactiveTokensDays: 90,
  });
}
