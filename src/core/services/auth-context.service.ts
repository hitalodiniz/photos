'use server';

import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { cache } from 'react';
import { PlanKey } from '../config/plans';

export interface UserProfile {
  id: string;
  plan_key: PlanKey;
  username: string;
  studio_id: string;
  full_name: string;
  profile_picture_url: string | null;
  phone_contact: string | null;
  instagram_link: string | null;
  use_subdomain: boolean;
  profile_url: string;
  roles?: string[];
}

/**
 * Service para obter contexto de autenticação (userId + studioId)
 * Centralizado para evitar duplicação e dependências circulares
 */
export interface AuthContext {
  success: boolean;
  userId: string | null;
  studioId: string | null;
  error?: string;
}

/**
 * Obtém o ID do usuário logado (autor) e o studio_id associado.
 * Esta função é usada em múltiplos services para evitar duplicação.
 * O 'cache' do React garante Request Memoization.
 */
export const getAuthAndStudioIds = cache(
  async (supabaseClient?: any): Promise<AuthContext> => {
    const supabase =
      supabaseClient || (await createSupabaseServerClientReadOnly());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        userId: null,
        studioId: null,
        error: 'Usuário não autenticado.',
      };
    }

    // 🎯 SELECT '*' para trazer plan_key, username e demais dados do profile
    const { data: profile, error: profileError } = await supabase
      .from('tb_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Erro ao buscar profile do usuário logado:', profileError);
      return {
        success: false,
        userId: user.id, // Retornamos o ID do auth mesmo se o profile falhar
        studioId: null,
        error: 'Profile do usuário não encontrado ou incompleto.',
      };
    }

    return {
      success: true,
      userId: user.id,
      studioId: profile.studio_id,
    };
  },
);

/**
 * 🎯 Única Fonte de Verdade para Usuário Logado
 * Usa 'cache' do React para memorizar o resultado durante a requisição (Request Memoization).
 * Não toca o banco mais de uma vez por carregamento de página.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createSupabaseServerClientReadOnly();

  // 1. Obtém o usuário do Auth (Sessão rápida)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, profile: null, userId: null };
  }

  // 2. Busca o perfil completo apenas se o usuário estiver autenticado
  const { data: profile, error: profileError } = await supabase
    .from('tb_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, profile: null, userId: user.id };
  }

  return {
    success: true,
    userId: user.id,
    profile, // Aqui você tem o plan_key, studio_id, etc.
    email: user.email,
  };
});
