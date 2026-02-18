// lib/google-auth.ts
import { createSupabaseClientForCache } from './supabase.server';

/**
 * Gera um access token válido para o Google Drive
 * usando o refresh_token salvo na tb_profiles.
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
      // Aviso: Token não encontrado, tentando acesso público via API Key
      /* console.log(
        `[getDriveAccessTokenForUser] Aviso: Usuário [${profile?.full_name || userId}] não possui refresh_token. A pasta será acessada via API Key (pública).`,
      ); */
      return null;
    }

    // 🎯 Verifica se o status de autenticação indica problema
    if (
      profile.google_auth_status === 'revoked' ||
      profile.google_auth_status === 'expired'
    ) {
      // console.log(`[getDriveAccessTokenForUser] Status de autenticação indica token revogado/expirado para userId: ${userId}`);
      return null;
    }

    // 🎯 VERIFICAÇÃO DE CACHE: O token no banco ainda é válido?
    // Usa a mesma lógica do getValidGoogleTokenService para consistência
    if (profile.google_access_token && profile.google_token_expires_at) {
      try {
        const expiresAt = new Date(profile.google_token_expires_at).getTime();
        const now = Date.now();
        const margin = 5 * 60 * 1000; // 5 minutos de margem

        if (expiresAt > now + margin) {
          // console.log(`[getDriveAccessTokenForUser] Token em cache ainda válido para userId: ${userId}`);
          return profile.google_access_token;
        }
      } catch (dateError) {
        console.warn(
          `[getDriveAccessTokenForUser] Erro ao validar data de expiração:`,
          dateError,
        );
      }
    }

    const refreshToken = profile.google_refresh_token;

    // 2. Chamar Google OAuth para renovar o access_token
    // 🎯 USA HELPER DE RATE LIMITING: Previne 429 errors
    const { fetchGoogleToken } =
      await import('@/core/utils/google-oauth-throttle');

    const tokenRes = await fetchGoogleToken(
      refreshToken,
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      // 🎯 TRATAMENTO DE ERRO CRÍTICO: Token Inválido/Revogado
      if (
        tokenData.error === 'invalid_grant' ||
        tokenData.error === 'invalid_request'
      ) {
        console.error(
          `[getDriveAccessTokenForUser] Token do usuário ${userId} expirou ou foi revogado. Erro:`,
          tokenData.error,
        );

        // Limpa o refresh_token inválido do banco e marca status
        try {
          await supabase
            .from('tb_profiles')
            .update({
              google_refresh_token: null,
              google_access_token: null,
              google_token_expires_at: null,
              google_auth_status: 'expired', // Marca como expirado
            })
            .eq('id', userId);
          // console.log(`[getDriveAccessTokenForUser] Refresh token inválido removido do banco para userId: ${userId}`);
        } catch (dbError) {
          console.error(
            '[getDriveAccessTokenForUser] Erro ao limpar token do banco:',
            dbError,
          );
        }
      }

      console.error(
        '[getDriveAccessTokenForUser] Erro na renovação do Google:',
        {
          error: tokenData.error,
          error_description: tokenData.error_description,
          status: tokenRes.status,
        },
      );
      return null;
    }

    // 🎯 PERSISTÊNCIA: Salva o novo token no banco (consistência com getValidGoogleTokenService)
    if (tokenData.access_token) {
      const expiresInSeconds = tokenData.expires_in || 3600;
      const updates: any = {
        google_access_token: tokenData.access_token,
        google_token_expires_at: new Date(
          Date.now() + expiresInSeconds * 1000,
        ).toISOString(),
        google_auth_status: 'active', // Marca como ativo
      };

      // Se o Google rotacionar o refresh_token, salvamos também
      if (tokenData.refresh_token) {
        updates.google_refresh_token = tokenData.refresh_token;
        // console.log(`[getDriveAccessTokenForUser] Google rotacionou o refresh_token para userId: ${userId}`);
      }

      try {
        await supabase.from('tb_profiles').update(updates).eq('id', userId);
        // console.log(`[getDriveAccessTokenForUser] Token renovado e salvo com sucesso para userId: ${userId}`);
      } catch (updateError) {
        console.error(
          `[getDriveAccessTokenForUser] Erro ao salvar token renovado:`,
          updateError,
        );
        // Ainda retorna o token mesmo se falhar ao salvar
      }
    }

    return tokenData.access_token || null;
  } catch {
    // console.log('[getDriveAccessTokenForUser] Aviso: Erro ao obter token, tentando acesso público via API Key:', err?.message || err);
    return null;
  }
}
