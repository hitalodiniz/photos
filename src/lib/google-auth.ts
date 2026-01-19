// lib/google-auth.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseClientForCache } from './supabase.server';

/**
 * Gera um access token válido para o Google Drive
 * usando o refresh_token salvo na tb_profiles.
 */
export async function getDriveAccessTokenForUser(
  userId: string,
): Promise<string | null> {
  try {
    const supabase = createSupabaseClientForCache();

    // 1. Buscar o refresh_token do usuário
    const { data: profile, error } = await supabase
      .from('tb_profiles')
      .select('full_name, google_refresh_token')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(
        `🚨 Erro de banco ao buscar token para ${userId}:`,
        error.message,
      );
      return null;
    }

    if (!profile?.google_refresh_token) {
      // Aviso: Token não encontrado, tentando acesso público via API Key
      console.log(
        `[getDriveAccessTokenForUser] Aviso: Usuário [${profile?.full_name || userId}] não possui refresh_token. A pasta será acessada via API Key (pública).`,
      );
      return null;
    }

    const refreshToken = profile.google_refresh_token;

    // 2. Chamar Google OAuth para renovar o access_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      // 🎯 TRATAMENTO DE ERRO CRÍTICO: Token Inválido/Revogado
      if (tokenData.error === 'invalid_grant' || tokenData.error === 'invalid_request') {
        console.error(`🚨 Token do usuário ${userId} expirou ou foi revogado. Erro:`, tokenData.error);

        // 1. Limpa o refresh_token inválido do banco
        try {
          await supabase
            .from('tb_profiles')
            .update({
              google_refresh_token: null,
              google_access_token: null,
              google_token_expires_at: null,
            })
            .eq('id', userId);
          console.log(`[google-auth] Refresh token inválido removido do banco para userId: ${userId}`);
        } catch (dbError) {
          console.error('[google-auth] Erro ao limpar token do banco:', dbError);
        }
      }

      console.error('[google-auth] Erro na renovação do Google:', {
        error: tokenData.error,
        error_description: tokenData.error_description,
        status: tokenRes.status,
      });
      return null;
    }

    return tokenData.access_token || null;
  } catch (err) {
    console.log('[getDriveAccessTokenForUser] Aviso: Erro ao obter token, tentando acesso público via API Key:', err?.message || err);
    return null;
  }
}
