// actions/token-cleanup.actions.ts
'use server';

import {
  cleanupGoogleTokens,
  quickCleanupGoogleTokens,
  fullCleanupGoogleTokens,
} from '@/core/services/token-cleanup.service';

/**
 * 🧹 AÇÃO DE LIMPEZA RÁPIDA DE TOKENS
 * Remove tokens expirados sem validação ativa (mais rápido)
 */
export async function quickCleanupTokens() {
  try {
    const result = await quickCleanupGoogleTokens();
    return result;
  } catch (error: any) {
    console.error('[token-cleanup.actions] Erro na limpeza rápida:', error);
    return {
      success: false,
      cleaned: 0,
      validated: 0,
      failed: 0,
      errors: [error.message || 'Erro desconhecido'],
      message: `Falha na limpeza: ${error.message}`,
    };
  }
}

/**
 * 🧹 AÇÃO DE LIMPEZA COMPLETA DE TOKENS
 * Valida todos os tokens ativos (mais lento, mais preciso)
 */
export async function fullCleanupTokens() {
  try {
    const result = await fullCleanupGoogleTokens();
    return result;
  } catch (error: any) {
    console.error('[token-cleanup.actions] Erro na limpeza completa:', error);
    return {
      success: false,
      cleaned: 0,
      validated: 0,
      failed: 0,
      errors: [error.message || 'Erro desconhecido'],
      message: `Falha na limpeza: ${error.message}`,
    };
  }
}

/**
 * 🧹 AÇÃO DE LIMPEZA PERSONALIZADA DE TOKENS
 */
export async function customCleanupTokens(options: {
  removeExpiredAccessTokensDays?: number;
  validateRefreshTokens?: boolean;
  removeInactiveTokensDays?: number;
  onlyStatus?: 'expired' | 'revoked' | 'active' | null;
}) {
  try {
    const result = await cleanupGoogleTokens(options);
    return result;
  } catch (error: any) {
    console.error('[token-cleanup.actions] Erro na limpeza personalizada:', error);
    return {
      success: false,
      cleaned: 0,
      validated: 0,
      failed: 0,
      errors: [error.message || 'Erro desconhecido'],
      message: `Falha na limpeza: ${error.message}`,
    };
  }
}
