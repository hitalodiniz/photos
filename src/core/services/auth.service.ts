// src/services/auth.service.ts
import { getBaseUrl } from '@/lib/get-base-url';
import { supabase } from '@/lib/supabase.client';
import { Session } from '@supabase/supabase-js';

export const authService = {
  // Busca a sessão atual
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  // Escuta mudanças de autenticação
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void,
  ) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  },

  // Logout
  async signOut() {
    await supabase.auth.signOut();
  },

  async signInWithGoogle(forceConsent: boolean = false) {
    const baseUrl = getBaseUrl();
    const redirectTo = `${baseUrl}/api/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',

      options: {
        scopes:
          'email profile openid https://www.googleapis.com/auth/drive.readonly',
        redirectTo,
        queryParams: {
          access_type: 'offline',
          // 🎯 Lógica Condicional: Se forceConsent for true, usa 'consent' para garantir o refresh_token
          prompt: forceConsent ? 'consent' : 'select_account',
        },
      },
    });

    if (error) throw error;
  },
};
