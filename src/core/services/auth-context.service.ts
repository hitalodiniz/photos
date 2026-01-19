'use server';

import {
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';

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
 */
export async function getAuthAndStudioIds(
  supabaseClient?: any,
): Promise<AuthContext> {
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

  const { data: profile, error: profileError } = await supabase
    .from('tb_profiles')
    .select('studio_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Erro ao buscar profile do usuário logado:', profileError);
    return {
      success: false,
      userId: null,
      studioId: null,
      error: 'Profile do usuário não encontrado ou incompleto.',
    };
  }

  return {
    success: true,
    userId: user.id,
    studioId: profile.studio_id,
  };
}
