// src/services/auth.service.ts
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
};
