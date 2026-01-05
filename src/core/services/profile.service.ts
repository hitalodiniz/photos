// src/services/profile.service.ts
import { supabase } from '@/lib/supabase.client';

export const profileService = {
  /**
   * Busca apenas a URL do avatar do fotógrafo
   */
  async getAvatarUrl(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('tb_profiles')
      .select('profile_picture_url')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar avatar no core:', error.message);
      return null;
    }

    return data?.profile_picture_url || null;
  },

  /**
   * Encerra a sessão e limpa cookies
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
};
