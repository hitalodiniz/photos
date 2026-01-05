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

  /**
   * Busca um perfil público por username, validando se ele pode ser exibido
   */
  async getPublicProfile(username: string) {
    const { data, error } = await supabase
      .from('tb_profiles')
      .select('*')
      .eq('username', username)
      .single();

    // Se houver erro ou não existir, o "Back" retorna null
    if (error || !data) return null;

    // Se for um acesso via subdomínio, você pode adicionar travas extras aqui
    // Mas para o [username] padrão, apenas retornamos os dados
    return data;
  },
};
