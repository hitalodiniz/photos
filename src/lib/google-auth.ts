// lib/google-auth.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Gera um access token válido para o Google Drive
 * usando o refresh_token salvo na tb_profiles.
 */
export async function getDriveAccessTokenForUser(
  userId: string,
): Promise<string | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    },
  );

  // 1. Buscar o refresh_token do usuário
  const { data: profile, error } = await supabase
    .from('tb_profiles')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  if (error || !profile || !profile.google_refresh_token) {
    console.warn('Refresh token não encontrado para o usuário:', userId);
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

  if (!tokenRes.ok) {
    console.error('Erro ao renovar access token:', await tokenRes.text());
    return null;
  }

  const tokenData = await tokenRes.json();

  return tokenData.access_token || null;
}
