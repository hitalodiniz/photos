// lib/google-auth.ts
import { createSupabaseClientForCache } from './supabase.server';
import { addSecondsToSaoPauloIso } from '@/core/utils/date-time';

/**
 * Gera um access token válido para o Google Drive
 * usando o refresh_token salvo na tb_profiles.
 * Quando o access token em cache expirou, renova com o refresh_token.
 * Em erro de renovação não limpamos o refresh_token (só o access token expira).
 */
export async function getDriveAccessTokenForUser(
  userId: string,
): Promise<string | null> {
  try {
    const supabase = await createSupabaseClientForCache();

    // 1. Buscar o refresh_token do usuário (incluindo status de autenticação)
    const { data: profile, error } = await supabase
      .from('tb_profiles')
      .select(
        'full_name, google_refresh_token, google_access_token, google_token_expires_at, google_auth_status',
      )
      .eq('id', userId)
      .single();

    if (error) {
      console.error(
        `[getDriveAccessTokenForUser] Erro de banco ao buscar token para ${userId}:`,
        error.message,
      );
      return null;
    }

    if (!profile?.google_refresh_token) {
      return null;
    }

    if (
      profile.google_auth_status === 'revoked' ||
      profile.google_auth_status === 'expired'
    ) {
      return null;
    }

    // 2. Cache: access token ainda válido?
    if (profile.google_access_token && profile.google_token_expires_at) {
      try {
        const expiresAt = new Date(profile.google_token_expires_at).getTime();
        const now = Date.now();
        const margin = 5 * 60 * 1000;

        if (expiresAt > now + margin) {
          return profile.google_access_token;
        }
      } catch (dateError) {
        console.warn(
          `[getDriveAccessTokenForUser] Erro ao validar data de expiração:`,
          dateError,
        );
      }
    }

    // 3. Renovar access_token com o refresh_token (não limpamos refresh_token em erro)
    const refreshToken = profile.google_refresh_token;
    const { fetchGoogleToken } =
      await import('@/core/utils/google-oauth-throttle');

    const tokenRes = await fetchGoogleToken(
      refreshToken,
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      // Só o access token expirou; refresh_token segue válido. Não limpamos o perfil.
      if (
        tokenData.error === 'invalid_grant' ||
        tokenData.error === 'invalid_request'
      ) {
        console.warn(
          `[getDriveAccessTokenForUser] Falha ao renovar access_token para userId ${userId} (${tokenData.error}). Refresh token mantido; tente novamente.`,
          tokenData.error_description || '',
        );
      } else {
        console.error(
          '[getDriveAccessTokenForUser] Erro na renovação do Google:',
          {
            error: tokenData.error,
            error_description: tokenData.error_description,
            status: tokenRes.status,
          },
        );
      }
      return null;
    }

    // 4. Persistir novo access_token (e rotação de refresh_token se vier)
    if (tokenData.access_token) {
      const expiresInSeconds = tokenData.expires_in || 3600;
      const updates: any = {
        google_access_token: tokenData.access_token,
        google_token_expires_at: addSecondsToSaoPauloIso(expiresInSeconds),
        google_auth_status: 'active',
      };
      if (tokenData.refresh_token) {
        updates.google_refresh_token = tokenData.refresh_token;
      }

      try {
        await supabase.from('tb_profiles').update(updates).eq('id', userId);
      } catch (updateError) {
        console.error(
          `[getDriveAccessTokenForUser] Erro ao salvar token renovado:`,
          updateError,
        );
      }
    }

    return tokenData.access_token || null;
  } catch {
    return null;
  }
}
