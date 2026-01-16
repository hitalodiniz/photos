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

  // 🛡️ CAPTURA E LIMPEZA DOS DADOS
  const username = (formData.get('username') as string)?.toLowerCase().trim();
  const full_name = (formData.get('full_name') as string)?.trim();
  const mini_bio = formData.get('mini_bio') as string;
  const phone_contact = formData.get('phone_contact') as string;
  const instagram_link = formData.get('instagram_link') as string;
  const website = formData.get('website') as string;

  // Note: No seu formulário anterior você definiu 'operating_cities'.
  // Ajustado para capturar o nome correto enviado.
  const operating_cities_json = formData.get('operating_cities') as string;

  // Validação estrita de servidor
  if (!username || !full_name) {
    return { success: false, error: 'Nome e Username são obrigatórios.' };
  }

  // 🌆 PROCESSAMENTO DE CIDADES
  let operating_cities: string[] = [];
  try {
    operating_cities = operating_cities_json
      ? JSON.parse(operating_cities_json)
      : [];
  } catch (e) {
    console.error('Erro ao processar cidades:', e);
    operating_cities = [];
  }

  // 📸 PROCESSAMENTO DE FOTO DE PERFIL
  let profile_picture_url = formData.get(
    'profile_picture_url_existing',
  ) as string;
  const profileFile = formData.get('profile_picture') as File; // Nome ajustado para bater com o formulário

  if (profileFile && profileFile.size > 0 && profileFile.name !== 'undefined') {
    if (profileFile.size > 5 * 1024 * 1024)
      return { success: false, error: 'Foto de perfil excede 5MB.' };

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

  // 🖼️ PROCESSAMENTO DE FOTO DE FUNDO (BACKGROUND)
  // 1. Primeiro, tentamos pegar a URL existente enviada pelo formulário
  let background_url = formData.get('background_url_existing') as string;

  // 2. Capturamos o arquivo (se houver)
  const backgroundFile = formData.get('background_image') as File;

  if (
    backgroundFile &&
    backgroundFile.size > 0 &&
    backgroundFile.name !== 'undefined'
  ) {
    if (backgroundFile.size > 5 * 1024 * 1024)
      return { success: false, error: 'Foto de fundo excede 5MB.' };

    const bgExt = backgroundFile.name.split('.').pop();
    const bgPath = `${user.id}/bg-${Date.now()}.${bgExt}`;

    const { error: bgUploadError } = await supabase.storage
      .from('profile_pictures')
      .upload(bgPath, backgroundFile, { upsert: true });

    if (!bgUploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile_pictures').getPublicUrl(bgPath);
      background_url = publicUrl; // Substitui pela nova URL após o upload
    }
  }

  // Criamos o objeto de atualização dinamicamente para maior segurança
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

  // 🎯 SÓ ATUALIZA O BACKGROUND SE ELE NÃO FOR UNDEFINED OU NULL
  // Isso evita que o valor suma se o campo 'background_url_existing' falhar no formulário
  if (background_url !== undefined && background_url !== null) {
    updateData.background_url = background_url;
  }
  // 💾 ATUALIZAÇÃO NO BANCO DE DADOS
  const { error } = await supabase
    .from('tb_profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505')
      return { success: false, error: 'Username já está em uso.' };
    return { success: false, error: error.message };
  }

  // 🔄 REVALIDAÇÃO DE CACHE
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
