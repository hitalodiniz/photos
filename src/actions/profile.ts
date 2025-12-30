'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { suggestUsernameFromEmail } from '@/utils/userUtils';

export async function getProfileData(supabaseClient?: any) {
  const supabase = supabaseClient || (await createSupabaseServerClient());
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

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  return {
    success: true,
    user_id: user.id,
    profile: profile,
    email: user.email,
    suggestedUsername: suggestUsernameFromEmail(user.email),
  };
}

export async function upsertProfile(formData: FormData, supabaseClient?: any) {
  const supabase = supabaseClient || (await createSupabaseServerClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // 1. EXTRAÇÃO E HIGIENIZAÇÃO DE DADOS
  const username = (formData.get('username') as string)?.toLowerCase().trim();
  const full_name = formData.get('full_name') as string;
  const mini_bio = formData.get('mini_bio') as string;
  const phone_contact = formData.get('phone_contact') as string;
  const instagram_link = formData.get('instagram_link') as string;

  // Captura o JSON enviado pelo formulário revisado
  const operating_cities_json = formData.get('operating_cities_json') as string;

  // Tratamento de Imagem
  const profilePictureFile = formData.get('profile_picture_file') as File;
  let profile_picture_url = formData.get(
    'profile_picture_url_existing',
  ) as string;

  if (!username || !full_name) {
    return { success: false, error: 'Nome e Username são obrigatórios.' };
  }

  // 2. PROCESSAMENTO DE CIDADES (De JSON para Array)
  let operating_cities: string[] = [];
  try {
    operating_cities = operating_cities_json
      ? JSON.parse(operating_cities_json)
      : [];
  } catch (e) {
    console.error('Erro ao processar JSON de cidades:', e);
  }

  // 3. UPLOAD DE FOTO DE PERFIL
  if (profilePictureFile && profilePictureFile.size > 0) {
    const fileExt = profilePictureFile.name.split('.').pop();
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profile_pictures')
      .upload(filePath, profilePictureFile, { upsert: true });

    if (uploadError) {
      console.error('Erro upload:', uploadError);
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
      profile_picture_url = publicUrl;
    }
  }

  // 4. PERSISTÊNCIA NO BANCO DE DADOS
  const { error } = await supabase
    .from('tb_profiles')
    .update({
      full_name,
      username,
      mini_bio,
      phone_contact: phone_contact?.replace(/\D/g, ''), // Limpeza para WhatsApp
      instagram_link,
      operating_cities, // Salva o array processado
      profile_picture_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: 'Erro ao salvar: ' + error.message };
  }

  // 5. ATUALIZAÇÃO DE CACHE E REDIRECIONAMENTO
  revalidatePath('/dashboard');
  revalidatePath('/onboarding');
  revalidatePath(`/${username}`);

  return { success: true }; // Retorna sucesso para o formulário tratar o redirecionamento
}
