'use server';

import { revalidatePath } from 'next/cache';
import {
  createSupabaseServerClient,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';
import { suggestUsernameFromEmail } from '@/core/utils/userUtils';

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

  if (error || !data) return null;
  return data;
}

/**
 * Busca apenas a URL do avatar (Versão de Servidor para Metadata)
 */
export async function getAvatarUrl(
  userId: string,
  supabaseClient?: any,
): Promise<string | null> {
  // Se o teste passar o mock, usa o mock. Se não, usa o cliente real.
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

  const { error } = await supabase
    .from('tb_profiles')
    .update({
      full_name,
      username,
      mini_bio,
      phone_contact: phone_contact?.replace(/\D/g, ''),
      instagram_link,
      operating_cities,
      profile_picture_url,
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
 * Nota: Como estamos em 'use server', o signOut deve ser chamado com cautela
 * ou mantido no client se for apenas para limpar o estado local.
 */
export async function signOutServer() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
