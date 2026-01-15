'use server';

import { revalidatePath } from 'next/cache';
import {
  createSupabaseServerClient,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';
import { suggestUsernameFromEmail } from '@/core/utils/user-helpers';

// =========================================================================
// 1. LEITURA DE DADOS (READ)
// =========================================================================

/**
 * Busca dados completos do perfil logado (Privado)
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
 * Busca um perfil público por username (Para SEO e páginas públicas)
 */
export async function getPublicProfile(username: string, supabaseClient?: any) {
  const supabase =
    supabaseClient || (await createSupabaseServerClientReadOnly());

  const { data, error } = await supabase
    .from('tb_profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    console.error(error);
    return null;
  }
  return data;
}

/**
 * Busca apenas a URL do avatar (Versão de Servidor para Metadata)
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
  const full_name = formData.get('full_name') as string;
  const mini_bio = formData.get('mini_bio') as string;
  const phone_contact = formData.get('phone_contact') as string;
  const instagram_link = formData.get('instagram_link') as string;
  const website = formData.get('website') as string; //Captura o campo website
  const operating_cities_json = formData.get('operating_cities_json') as string;
  const profilePictureFile = formData.get('profile_picture_file') as File;

  let profile_picture_url = formData.get(
    'profile_picture_url_existing',
  ) as string;

  if (!username || !full_name)
    return { success: false, error: 'Nome e Username são obrigatórios.' };

  // Processamento Cidades
  let operating_cities: string[] = [];
  try {
    operating_cities = operating_cities_json
      ? JSON.parse(operating_cities_json)
      : [];
  } catch (e) {
    console.error(e);
  }

  // Upload de Foto
  if (profilePictureFile && profilePictureFile.size > 0) {
    if (profilePictureFile.size > 5 * 1024 * 1024)
      return { success: false, error: 'Foto muito grande (máx 5MB).' };

    const fileExt = profilePictureFile.name.split('.').pop();
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile_pictures')
      .upload(filePath, profilePictureFile, { upsert: true });

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
      profile_picture_url = publicUrl;
    }
  }

  // Captura dos novos campos do FormData
  const backgroundFile = formData.get('background_file') as File;
  let background_url =
    formData.get('background_url_existing')?.toString() || '';

  // --- LÓGICA REPLICADA PARA FOTO DE FUNDO ---
  if (
    backgroundFile &&
    backgroundFile.size > 0 &&
    backgroundFile.name !== 'undefined'
  ) {
    if (backgroundFile.size > 5 * 1024 * 1024)
      return { success: false, error: 'Foto de fundo muito grande (máx 5MB).' };

    const bgExt = backgroundFile.name.split('.').pop();
    const bgPath = `${user.id}/bg-${Date.now()}.${bgExt}`;

    const { error: bgUploadError } = await supabase.storage
      .from('profile_pictures') // Reutilizando o mesmo bucket
      .upload(bgPath, backgroundFile, { upsert: true });

    if (!bgUploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile_pictures').getPublicUrl(bgPath);
      background_url = publicUrl;
    }
  }

  const { error } = await supabase
    .from('tb_profiles')
    .update({
      full_name,
      username,
      mini_bio,
      phone_contact: phone_contact?.replace(/\D/g, ''),
      instagram_link,
      website,
      operating_cities,
      profile_picture_url,
      background_url, // 🎯 Adicionado aqui para persistir no banco

      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };

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
