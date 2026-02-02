'use server';

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import {
  createSupabaseClientForCache,
  createSupabaseServerClient,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';
import { suggestUsernameFromEmail } from '@/core/utils/user-helpers';
import { cache } from 'react';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';
import { MessageTemplates, UserSettings } from '../types/profile';
import { PlanKey } from '../config/plans';

// =========================================================================
// 1. LEITURA DE DADOS (READ)
// =========================================================================

/**
 * Esta função toca o banco de dados diretamente.
 * 🎯 USE ESTA NO MIDDLEWARE (Middleware não aceita unstable_cache)
 */
export async function fetchProfileDirectDB(username: string) {
  const supabase = createSupabaseClientForCache();
  const { data, error } = await supabase
    .from('tb_profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar perfil no DB:', error);
  }
  return data || null;
}

/**
 * Busca dados completos do perfil logado (Privado) com cache.
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

  // 🎯 Implementa unstable_cache para os dados privados do perfil
  const profile = await unstable_cache(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('tb_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    [`profile-private-${user.id}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE, // 30 dias
      tags: [`profile-private-${user.id}`],
    },
  )(user.id);

  return {
    success: true,
    user_id: user.id,
    profile,
    email: user.email,
    suggestedUsername: suggestUsernameFromEmail(user.email!),
  };
}

/**
 * Busca o perfil diretamente no banco.
 * Esta função NÃO usa unstable_cache, por isso pode ser chamada no Middleware.
 */
export async function fetchProfileRaw(username: string) {
  // O unstable_cache deve ser definido fora ou retornado imediatamente executado
  return unstable_cache(
    async (uname: string) => fetchProfileDirectDB(uname),
    [`profile-${username}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [`profile-${username}`],
    },
  )(username);
}

// =========================================================================
// 2. FUNÇÕES COM CACHE (Apenas para Server Components / Pages)
// =========================================================================

/**
 * Busca um perfil público com Cache Persistente.
 * USO: Apenas em Pages e Server Components.
 */
// React Cache para evitar múltiplas chamadas na mesma renderização (Request Memoization)
export const getPublicProfile = cache(async (username: string) => {
  return fetchProfileRaw(username);
});

/**
 * Versão para Middleware: Verifica permissão sem quebrar o Edge Runtime.
 * IMPORTANTE: No Middleware, use esta função.
 * 🎯 MIDDLEWARE: Usa fetchProfileDirectDB (sem cache) pois Middleware não suporta unstable_cache
 */
export async function checkSubdomainPermission(
  username: string,
): Promise<boolean> {
  // Chamamos a função DIRECT DB, pois o Middleware não aceita unstable_cache
  const profile = await fetchProfileDirectDB(username);
  return !!(profile && profile.use_subdomain === true);
}

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

  // 1. Verificar se é Onboarding (Novo Usuário) para liberar Trial
  const { data: existingProfile } = await supabase
    .from('tb_profiles')
    .select('plan_key, plan_trial_expires')
    .eq('id', user.id)
    .single();

  const isFirstSetup = !existingProfile?.plan_key;

  const username = (formData.get('username') as string)?.toLowerCase().trim();
  const full_name = (formData.get('full_name') as string)?.trim();
  const mini_bio = formData.get('mini_bio') as string;
  const phone_contact = formData.get('phone_contact') as string;
  const instagram_link = formData.get('instagram_link') as string;
  const website = formData.get('website') as string;
  const operating_cities_json = formData.get('operating_cities') as string;
  const background_url = formData.get('background_url_existing') as string;

  if (!username || !full_name) {
    return { success: false, error: 'Nome e Username são obrigatórios.' };
  }

  let operating_cities: string[] = [];
  try {
    operating_cities = operating_cities_json
      ? JSON.parse(operating_cities_json)
      : [];
  } catch {
    operating_cities = [];
  }

  // Processamento de Fotos (Profile e Background) permanece igual...
  let profile_picture_url = formData.get(
    'profile_picture_url_existing',
  ) as string;
  const profileFile = formData.get('profile_picture') as File;
  if (profileFile && profileFile.size > 0) {
    // 🎯 Segurança: Fallback para extensões se o nome for inválido ou ausente
    const fileName = profileFile.name || 'avatar.webp';
    const fileExt = fileName.includes('.') ? fileName.split('.').pop() : 'webp';
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    // console.log('[upsertProfile] Uploading avatar:', filePath);

    const { error: uploadError } = await supabase.storage
      .from('profile_pictures')
      .upload(filePath, profileFile, { upsert: true });

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
      profile_picture_url = publicUrl;
    } else {
      console.error('[upsertProfile] Error uploading avatar:', uploadError);
    }
  }

  // let background_url = formData.get('background_url_existing') as string;
  // const backgroundFile = formData.get('background_image') as File;
  // if (backgroundFile && backgroundFile.size > 0) {
  //   const bgName = backgroundFile.name || 'bg.webp';
  //   const bgExt = bgName.includes('.') ? bgName.split('.').pop() : 'webp';
  //   const bgPath = `${user.id}/bg-${Date.now()}.${bgExt}`;

  //   // console.log('[upsertProfile] Uploading background:', bgPath);

  //   const { error: bgUploadError } = await supabase.storage
  //     .from('profile_pictures')
  //     .upload(bgPath, backgroundFile, { upsert: true });

  //   if (!bgUploadError) {
  //     const {
  //       data: { publicUrl },
  //     } = supabase.storage.from('profile_pictures').getPublicUrl(bgPath);
  //     background_url = publicUrl;
  //   } else {
  //     console.error(
  //       '[upsertProfile] Error uploading background:',
  //       bgUploadError,
  //     );
  //   }
  // }

  // 1. Recuperar URLs existentes para não sobrescrever se não houver novo upload
  const existingBgsJson = formData.get('background_urls_existing') as string;
  let finalBackgroundUrls: string[] = existingBgsJson
    ? JSON.parse(existingBgsJson)
    : [];

  // 2. Recuperar todos os novos arquivos (input multiple)
  const backgroundFiles = formData.getAll('background_images') as File[];

  // 3. Se houver novos arquivos com conteúdo, processamos o upload
  if (backgroundFiles.length > 0 && backgroundFiles[0].size > 0) {
    const uploadedUrls: string[] = [];

    for (const file of backgroundFiles) {
      if (file.size === 0) continue;

      const bgName = file.name || 'bg.webp';
      const bgExt = bgName.includes('.') ? bgName.split('.').pop() : 'webp';
      // Adicionamos um random para evitar colisão em uploads múltiplos simultâneos
      const bgPath = `${user.id}/bg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${bgExt}`;

      const { error: bgUploadError } = await supabase.storage
        .from('profile_pictures')
        .upload(bgPath, file, { upsert: true });

      if (!bgUploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('profile_pictures').getPublicUrl(bgPath);
        uploadedUrls.push(publicUrl);
      } else {
        console.error(
          '[upsertProfile] Error uploading background:',
          bgUploadError,
        );
      }
    }

    // Se o upload teve sucesso, as novas URLs substituem as antigas
    if (uploadedUrls.length > 0) {
      finalBackgroundUrls = uploadedUrls;
    }
  }

  // 1. Limpeza e padronização do telefone (Garante prefixo 55 para WhatsApp)
  let cleanPhone = phone_contact ? phone_contact.replace(/\D/g, '') : '';
  if (
    cleanPhone &&
    (cleanPhone.length === 10 || cleanPhone.length === 11) &&
    !cleanPhone.startsWith('55')
  ) {
    cleanPhone = `55${cleanPhone}`;
  }

  const updateData: any = {
    full_name,
    username,
    mini_bio,
    phone_contact: cleanPhone,
    instagram_link,
    website,
    operating_cities,
    profile_picture_url,
    updated_at: new Date().toISOString(),
    background_urls: finalBackgroundUrls,
  };

  // 🛡️ Lógica de Ativação do Trial PRO (14 Dias)
  if (isFirstSetup) {
    const trialDays = 14;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + trialDays);

    updateData.plan_key = 'PRO' as PlanKey;
    updateData.plan_trial_expires = expirationDate.toISOString();
    updateData.is_trial = true;
  }

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

  // 🔄 REVALIDAÇÃO ESTRATÉGICA COMPLETA
  // Invalida a tag específica do perfil (público e privado)
  revalidateTag(`profile-${username}`);
  revalidateTag(`profile-private-${user.id}`);
  // Revalida as galerias públicas do perfil
  revalidateTag(`profile-galerias-${username}`);
  // Busca todas as galerias do usuário para revalidar individualmente
  const { data: galerias } = await supabase
    .from('tb_galerias')
    .select('id, slug, drive_folder_id')
    .eq('user_id', user.id);

  if (galerias && galerias.length > 0) {
    // Revalida cada galeria individualmente
    galerias.forEach((galeria) => {
      if (galeria.slug) {
        revalidateTag(`gallery-${galeria.slug}`);
      }
      if (galeria.drive_folder_id) {
        revalidateTag(`drive-${galeria.drive_folder_id}`);
      }
      if (galeria.id) {
        revalidateTag(`photos-${galeria.id}`);
      }
    });
    // Revalida a lista de galerias do usuário
    revalidateTag(`user-galerias-${user.id}`);
  }

  // Revalida as rotas físicas
  revalidatePath('/dashboard');
  revalidatePath(`/${username}`);

  return { success: true };
}

/**
 * Atualiza as configurações e templates de mensagem do perfil
 */
import { revalidateUserGalleries } from '@/actions/revalidate.actions';

export async function updateProfileSettings(data: {
  settings: UserSettings;
  message_templates: MessageTemplates;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Sessão expirada.' };

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const { error } = await supabase
    .from('tb_profiles')
    .update({
      settings: data.settings,
      message_templates: data.message_templates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[updateProfileSettings] Erro:', error);
    return { success: false, error: error.message };
  }

  if (profile?.username) {
    revalidateTag(`profile-${profile.username}`);
  }
  revalidateTag(`profile-private-${user.id}`);

  // Revalida o cache de todas as galerias do usuário
  await revalidateUserGalleries(user.id);

  revalidatePath('/dashboard/settings');

  return { success: true };
}

export async function signOut() {
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

  // Busca o username antes de atualizar para revalidar o cache
  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const { error } = await supabase
    .from('tb_profiles')
    .update({ sidebar_collapsed: isCollapsed })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };

  // 🔄 REVALIDAÇÃO: Limpa o cache do perfil (público e privado)
  if (profile?.username) {
    revalidateTag(`profile-${profile.username}`);
  }
  revalidateTag(`profile-private-${user.id}`);

  return { success: true };
}

/**
 * Atualiza ou Adiciona categorias personalizadas no perfil do usuário
 * Armazena no campo JSONB 'custom_categories'
 */
export async function updateCustomCategories(categories: string[]) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Sessão expirada.' };

  // 1. Busca o username atual para revalidação de cache posterior
  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  // 2. Realiza o update no campo JSONB
  const { error } = await supabase
    .from('tb_profiles')
    .update({
      custom_categories: categories,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[updateCustomCategories] Erro:', error);
    return { success: false, error: error.message };
  }

  // 🔄 REVALIDAÇÃO: Garante que o perfil em cache reflita as novas categorias
  if (profile?.username) {
    revalidateTag(`profile-${profile.username}`);
  }
  revalidateTag(`profile-private-${user.id}`);

  return { success: true };
}

// src/actions/profile.service.ts

/**
 * 🎯 BUSCA PERFIL POR USERNAME (Com Cache de 30 dias)
 * Esta função é a "Fonte da Verdade" para as páginas públicas e subdomínios.
 * Utiliza tags para que o cache possa ser invalidado instantaneamente no update.
 */
export const getProfileByUsername = cache(async (username: string) => {
  const cleanUsername = username.toLowerCase().trim();

  return unstable_cache(
    async (uname: string) => {
      const supabase = createSupabaseClientForCache();

      const { data, error } = await supabase
        .from('tb_profiles')
        .select('*')
        .eq('username', uname)
        .maybeSingle();

      if (error) {
        console.error(`[getProfileByUsername] Erro ao buscar ${uname}:`, error);
        return null;
      }

      return data;
    },
    [`profile-data-${cleanUsername}`], // Chave única do cache
    {
      revalidate: GLOBAL_CACHE_REVALIDATE, // 30 dias (definido no seu url-helper)
      tags: [`profile-${cleanUsername}`], // Tag para revalidateTag
    },
  )(cleanUsername);
});

// Atualiza push notificações do usuário
export async function updatePushSubscriptionAction(subscription: any) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autorizado' };

  const { error } = await supabase
    .from('tb_profiles')
    .update({
      push_subscription: subscription,
      notifications_enabled: true, // Campo extra para controle visual no front
    })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/perfil');
  return { success: true };
}

/**
 * 🎯 CENTRALIZADOR DE MUDANÇA DE PLANOS
 * Válido para: Ativação pós-trial, Upgrade e Downgrade.
 */
export async function processSubscriptionAction(
  profileId: string,
  newPlan: PlanKey,
) {
  const supabase = await createSupabaseServerClient();

  // 1. Busca username para invalidar tags de cache público
  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('username')
    .eq('id', profileId)
    .single();

  // 2. Executa a mutação centralizada
  const { data, error } = await supabase
    .from('tb_profiles')
    .update({
      plan_key: newPlan,
      is_trial: false, // 🛡️ SEMPRE desativa trial ao mudar de plano manualmente ou via pagamento
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error(
      '[processSubscriptionAction] Erro na transição:',
      error.message,
    );
    return { success: false, error: error.message };
  }

  // 3. 🔄 Invalidação em cascata (Garante que o app reflita a mudança na hora)
  revalidateTag(`profile-private-${profileId}`);
  if (profile?.username) {
    revalidateTag(`profile-${profile.username}`);
  }

  // Força o Next.js a re-renderizar componentes de layout (Sidebar, Header)
  revalidatePath('/dashboard', 'layout');

  return { success: true, data };
}

/**
 * 📝 REGISTRA LOG DE MUDANÇA DE PLANO
 * Função auxiliar interna para auditoria.
 */
// async function logPlanChange(
//   supabase: any,
//   profileId: string,
//   oldPlan: string,
//   newPlan: string,
//   reason: string,
// ) {
//   await supabase.from('tb_plan_history').insert({
//     profile_id: profileId,
//     old_plan: oldPlan,
//     new_plan: newPlan,
//     reason: reason,
//     created_at: new Date().toISOString(),
//   });
// }

// -- Criação da tabela de histórico de planos
// CREATE TABLE IF NOT EXISTS public.tb_plan_history (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     profile_id UUID NOT NULL REFERENCES public.tb_profiles(id) ON DELETE CASCADE,
//     old_plan TEXT NOT NULL,
//     new_plan TEXT NOT NULL,
//     reason TEXT NOT NULL,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
// );

// -- Índices para performance em consultas de auditoria por usuário
// CREATE INDEX IF NOT EXISTS idx_plan_history_profile_id ON public.tb_plan_history(profile_id);

// -- Habilitar RLS (Row Level Security) - Apenas leitura pelo dono do perfil
// ALTER TABLE public.tb_plan_history ENABLE ROW LEVEL SECURITY;

// CREATE POLICY "Usuários podem ver seu próprio histórico de planos"
// ON public.tb_plan_history FOR SELECT
// USING (auth.uid() = profile_id);
