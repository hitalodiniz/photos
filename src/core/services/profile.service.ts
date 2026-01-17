'use server';

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import {
  createSupabaseClientForCache,
  createSupabaseServerClient,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';
import { suggestUsernameFromEmail } from '@/core/utils/user-helpers';
import { cache } from 'react';
import { GLOBAL_CACHE_REVALIDATE } from '../utils/url-helper';

// =========================================================================
// 1. LEITURA DE DADOS (READ)
// =========================================================================

/**
 * Busca dados completos do perfil logado (Privado)
 * MANTIDA DINÂMICA: Dados privados de sessão não podem ser colocados em unstable_cache.
 */
export async function getProfileData(supabaseClient?: any) {
  const supabase =
    supabaseClient || (await createSupabaseServerClientReadOnly());
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('tb_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) return { success: false, error: profileError.message };

  return {
    success: true,
    user_id: user.id,
    profile,
    email: user.email,
    suggestedUsername: suggestUsernameFromEmail(user.email!),
  };
}

/**
 * Busca um perfil público por username com Cache Persistente.
 * 🎯 CANDIDATA AO CACHE: Usa createSupabaseClientForCache para evitar erro de cookies.
 */
export const getPublicProfile = cache(async (username: string) => {
  return unstable_cache(
    async (uname: string) => {
      // 🛡️ Cliente específico para cache (sem acesso a cookies/auth)
      const supabase = createSupabaseClientForCache();
      const { data, error } = await supabase
        .from('tb_profiles')
        .select('*')
        .eq('username', uname)
        .single();

      if (error || !data) {
        console.error('Erro ao buscar perfil público para cache:', error);
        return null;
      }
      return data;
    },
    [`public-profile-${username}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE, // Background revalidation a cada 30 dias
      tags: [`profile-${username}`], // Tag para invalidação sob demanda via revalidateTag
    },
  )(username);
});

/**
 * Versão otimizada para metadados.
 * 🎯 CANDIDATA AO CACHE: Reutiliza o cache do getPublicProfile através da deduplicação do React.
 */
export const getProfileMetadataInfo = cache(async (username: string) => {
  const profile = await getPublicProfile(username);
  if (!profile) return null;

  return {
    full_name: profile.full_name,
    profile_picture_url: profile.profile_picture_url,
    username: profile.username,
  };
});

/**
 * Busca apenas a URL do avatar.
 * Nota: Pode ser substituída pelo uso de getProfileMetadataInfo para aproveitar o cache.
 */
export async function getAvatarUrl(
  userId: string,
  supabaseClient?: any,
): Promise<string | null> {
  const supabase =
    supabaseClient || (await createSupabaseServerClientReadOnly());

  const { data, error } = await supabase
    .from('tb_profiles')
    .select('profile_picture_url')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data?.profile_picture_url || null;
}

// =========================================================================
// 2. MUTAÇÕES (WRITE)
// =========================================================================

/**
 * Salva ou Atualiza o perfil (Upsert)
 */
export async function upsertProfile(formData: FormData, supabaseClient?: any) {
  const supabase = supabaseClient || (await createSupabaseServerClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Sessão expirada.' };

  const username = (formData.get('username') as string)?.toLowerCase().trim();
  const full_name = (formData.get('full_name') as string)?.trim();
  const mini_bio = formData.get('mini_bio') as string;
  const phone_contact = formData.get('phone_contact') as string;
  const instagram_link = formData.get('instagram_link') as string;
  const website = formData.get('website') as string;
  const operating_cities_json = formData.get('operating_cities') as string;

  if (!username || !full_name) {
    return { success: false, error: 'Nome e Username são obrigatórios.' };
  }

  let operating_cities: string[] = [];
  try {
    operating_cities = operating_cities_json
      ? JSON.parse(operating_cities_json)
      : [];
  } catch (e) {
    operating_cities = [];
  }

  // Processamento de Fotos (Profile e Background) permanece igual...
  let profile_picture_url = formData.get(
    'profile_picture_url_existing',
  ) as string;
  const profileFile = formData.get('profile_picture') as File;
  if (profileFile && profileFile.size > 0 && profileFile.name !== 'undefined') {
    const fileExt = profileFile.name.split('.').pop();
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('profile_pictures')
      .upload(filePath, profileFile, { upsert: true });

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
      profile_picture_url = publicUrl;
    }
  }

  let background_url = formData.get('background_url_existing') as string;
  const backgroundFile = formData.get('background_image') as File;
  if (
    backgroundFile &&
    backgroundFile.size > 0 &&
    backgroundFile.name !== 'undefined'
  ) {
    const bgExt = backgroundFile.name.split('.').pop();
    const bgPath = `${user.id}/bg-${Date.now()}.${bgExt}`;
    const { error: bgUploadError } = await supabase.storage
      .from('profile_pictures')
      .upload(bgPath, backgroundFile, { upsert: true });

    if (!bgUploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile_pictures').getPublicUrl(bgPath);
      background_url = publicUrl;
    }
  }

  const updateData: any = {
    full_name,
    username,
    mini_bio,
    phone_contact: phone_contact?.replace(/\D/g, ''),
    instagram_link,
    website,
    operating_cities,
    profile_picture_url,
    updated_at: new Date().toISOString(),
  };

  if (background_url !== undefined && background_url !== null) {
    updateData.background_url = background_url;
  }

  const { error } = await supabase
    .from('tb_profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505')
      return { success: false, error: 'Username já está em uso.' };
    return { success: false, error: error.message };
  }

  // 🔄 REVALIDAÇÃO ESTRATÉGICA
  // Invalida a tag específica do perfil para forçar o cache a atualizar na próxima visita
  revalidateTag(`profile-${username}`);

  revalidatePath('/dashboard');
  revalidatePath(`/${username}`);

  return { success: true };
}

/**
 * Encerra a sessão
 */
export async function signOutServer() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

/**
 * Atualiza a preferência de visualização da barra lateral
 */
export async function updateSidebarPreference(isCollapsed: boolean) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Sessão expirada.' };

  const { error } = await supabase
    .from('tb_profiles')
    .update({ sidebar_collapsed: isCollapsed })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };

  return { success: true };
}
