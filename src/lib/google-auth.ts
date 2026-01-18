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
      // 🎯 Este é o culpado pelo seu TOKEN_NOT_FOUND
      console.error(
        `🚨 Usuário [${profile?.full_name || userId}] não possui refresh_token no banco.`,
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
      if (tokenData.error === 'invalid_grant') {
        console.error(`🚨 Token do usuário ${userId} expirou ou foi revogado.`);

        // 1. Marcar no banco que a conexão caiu (Crie essa coluna na tb_profiles)
        await supabase
          .from('tb_profiles')
          .update({
            google_auth_status: 'expired',
            google_auth_error_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // 2. Opcional: Aqui você dispararia seu serviço de e-mail (Resend, SendGrid, etc)
        // await sendEmailNotification(profile.email, 'Google Connection Expired');
      }

      console.error('Erro na renovação do Google:', tokenData);
      return null;
    }

    return tokenData.access_token || null;
  } catch (err) {
    console.error('Erro crítico em getDriveAccessTokenForUser:', err);
    return null;
  }
}
