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

// 🛠️ IMPORTS DE HELPERS
import {
  validateRequiredFields,
  extractFormData,
  parseOperatingCities,
  parseBackgroundUrls,
  buildTrialData,
} from '../utils/profile-helpers';
import {
  uploadProfilePicture,
  uploadBackgroundImages,
} from '../utils/profile-upload.helper';

import { revalidateProfile } from '@/actions/revalidate.actions';
import { normalizePhoneNumber } from '../utils/masks-helpers';
import { profile } from 'console';

// =========================================================================
// 1. LEITURA DE DADOS (READ)
// =========================================================================

/**
 * Esta função toca o banco de dados diretamente.
 * 🎯 USE ESTA NO MIDDLEWARE (Middleware não aceita unstable_cache)
 */
export async function fetchProfileDirectDB(username: string) {
  const supabase = await createSupabaseClientForCache();
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
 * Salva ou Atualiza o perfil (Upsert) - VERSÃO REFATORADA
 */
export async function upsertProfile(formData: FormData, supabaseClient?: any) {
  const supabase = supabaseClient || (await createSupabaseServerClient());

  // 1. Autenticação (Execução imediata necessária)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sessão expirada.' };

  // 2. Validação e Extração (Síncronos - baixo custo)
  const validation = validateRequiredFields(formData);
  if (!validation.isValid) return { success: false, error: validation.error };

  const formFields = extractFormData(formData);

  // 3. Paralelismo de Busca e Uploads (Otimização de Performance)
  // Iniciamos a verificação do profile e os uploads simultaneamente
  const [profileRes, profilePictureUrl, backgroundUrls] = await Promise.all([
    supabase.from('tb_profiles').select('plan_key').eq('id', user.id).single(),

    uploadProfilePicture(
      supabase,
      formFields.profile_picture,
      user.id,
      formFields.profile_picture_url_existing,
    ),

    uploadBackgroundImages(
      supabase,
      formFields.background_images,
      user.id,
      parseBackgroundUrls(formFields.background_urls_existing),
    ),
  ]);

  const isFirstSetup = !profileRes.data?.plan_key;

  // 4. Montagem dos dados (Separação de lógica)
  const updateData = {
    full_name: formFields.full_name,
    username: formFields.username,
    mini_bio: formFields.mini_bio,
    phone_contact: normalizePhoneNumber(formFields.phone_contact),
    instagram_link: formFields.instagram_link,
    website: formFields.website,
    operating_cities: parseOperatingCities(formFields.operating_cities_json),
    profile_picture_url: profilePictureUrl,
    accepted_terms: formFields.accepted_terms,
    accepted_at: formFields.accepted_terms ? new Date().toISOString() : null,
    background_url: backgroundUrls,
    updated_at: new Date().toISOString(),
    specialty: parseOperatingCities(formFields.specialty),
    custom_specialties: parseOperatingCities(formFields.custom_specialties),

    ...(isFirstSetup ? buildTrialData() : {}), // Merge condicional limpo
  };

  // 5. Persistência
  const { error } = await supabase
    .from('tb_profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) {
    return {
      success: false,
      error:
        error.code === '23505' ? 'Username já está em uso.' : error.message,
    };
  }

  // 6. Revalidação (Não precisa bloquear o retorno se o update foi sucesso)
  // Se o seu ambiente suportar, pode rodar sem await ou usar edge functions
  if (formFields.username) {
    await revalidateProfile(formFields.username, user.id);
  }
  return { success: true };
}
/**
 * Atualiza as configurações e templates de mensagem do perfil
 * ✅ REFATORADA: Usa helper de revalidação
 */
export async function updateProfileSettings(data: {
  settings: UserSettings;
  message_templates: MessageTemplates;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sessão expirada.' };

  const { error } = await supabase
    .from('tb_profiles')
    .update({
      settings: data.settings,
      message_templates: data.message_templates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (profile?.username) {
    // ✅ Centralizado: Limpa perfil público, privado e força layout das galerias
    await revalidateProfile(profile.username, user.id);
  }

  return { success: true };
}
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

/**
 * Atualiza a preferência de visualização da barra lateral
 * ✅ REFATORADA: Usa helper de revalidação
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

  if (profile?.username) {
    await revalidateProfile(profile.username, user.id);
  }
  return { success: true };
}

/**
 * Atualiza ou Adiciona categorias personalizadas no perfil do usuário
 * Armazena no campo JSONB 'custom_categories'
 * ✅ REFATORADA: Usa helper de revalidação
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

  // ✅ USA HELPER: Revalidação centralizada
  if (profile?.username) {
    revalidateProfile(profile.username, user.id);
  } else {
    revalidateTag(`profile-private-${user.id}`);
  }

  return { success: true };
}

/**
 * 🎯 BUSCA PERFIL POR USERNAME (Com Cache de 30 dias)
 * Esta função é a "Fonte da Verdade" para as páginas públicas e subdomínios.
 * Utiliza tags para que o cache possa ser invalidado instantaneamente no update.
 */
export const getProfileByUsername = cache(async (username: string) => {
  const cleanUsername = username.toLowerCase().trim();

  return unstable_cache(
    async (uname: string) => {
      const supabase = await createSupabaseClientForCache();

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

/**
 * Atualiza push notificações do usuário
 */
export async function updatePushSubscriptionAction(subscription: any) {
  const supabase = await createSupabaseServerClient();

  // Busca o usuário atual da sessão
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Usuário não autenticado' };

  const { error } = await supabase
    .from('tb_profiles')
    .update({
      push_subscription: subscription,
      notifications_enabled: !!subscription,
    })
    .eq('id', user.id);

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Erro ao salvar assinatura:', error);
    return { success: false, error: 'Falha ao sincronizar notificações' };
  }
  if (profile?.username) {
    await revalidateProfile(profile.username, user.id);
  }

  return { success: true };
}

/**
 * 🎯 CENTRALIZADOR DE MUDANÇA DE PLANOS
 * Válido para: Ativação pós-trial, Upgrade e Downgrade.
 * ✅ REFATORADA: Usa helper de revalidação
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

  // Ele vai limpar o cache das galerias do usuário, o que é vital
  // para remover banners de "Upgrade necessário".
  if (profile?.username) {
    await revalidateProfile(profile.username, profileId);
  }

  return { success: true, data };
}

/**
 * 📝 REGISTRA LOG DE MUDANÇA DE PLANO
 * Função auxiliar interna para auditoria.
 */
async function logPlanChange(
  supabase: any,
  profileId: string,
  oldPlan: string,
  newPlan: string,
  reason: string,
) {
  await supabase.from('tb_plan_history').insert({
    profile_id: profileId,
    old_plan: oldPlan,
    new_plan: newPlan,
    reason: reason,
    created_at: new Date().toISOString(),
  });
}

// Adicione no final do arquivo profile.service.ts

/**
 * 🔑 Busca o Google Refresh Token do usuário autenticado
 * Retorna o token ou null se não existir/não estiver autenticado
 */
export async function getGoogleRefreshToken(): Promise<{
  success: boolean;
  token?: string | null;
  userId?: string;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();

  // 1️⃣ Verifica autenticação
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: 'Usuário não autenticado',
    };
  }

  // 2️⃣ Busca o refresh token do perfil
  const { data: profile, error: profileError } = await supabase
    .from('tb_profiles')
    .select('google_refresh_token')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error(
      '[getGoogleRefreshToken] Erro ao buscar perfil:',
      profileError,
    );
    return {
      success: false,
      error: 'Erro ao buscar dados do perfil',
    };
  }

  if (!profile?.google_refresh_token) {
    return {
      success: false,
      error: 'Token do Google não encontrado. Reconecte sua conta.',
    };
  }

  return {
    success: true,
    token: profile.google_refresh_token,
    userId: user.id,
  };
}
