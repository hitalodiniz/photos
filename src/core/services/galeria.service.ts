'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import slugify from 'slugify';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

import {
  DrivePhoto,
  //makeFolderPublic as makeFolderPublicLib,
} from '@/lib/google-drive';
import { getFolderPhotos } from './google-drive.service';
import { formatGalleryData } from '@/core/logic/galeria-logic';
import { Galeria } from '@/core/types/galeria';
import { SignJWT } from 'jose';

// =========================================================================
// TIPOS AUXILIARES
// =========================================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =========================================================================
// 1. AUTENTICAÇÃO E CONTEXTO (userId + studioId)
// =========================================================================

import { getAuthAndStudioIds } from './auth-context.service';
import {
  createSupabaseServerClient,
  createSupabaseClientForCache,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';
import { PlanKey, PERMISSIONS_BY_PLAN } from '../config/plans';

// =========================================================================
// 2. SLUG ÚNICO POR DATA
// =========================================================================

/**
 * Gera um slug único no formato AAAA/MM/DD/titulo-galeria
 * Se estiver editando, passa o currentId para não conflitar com o próprio registro.
 */
export async function generateUniqueDatedSlug(
  title: string,
  dateStr: string,
  currentId?: string,
  supabaseClient?: any,
): Promise<string> {
  const supabase = supabaseClient || (await createSupabaseServerClient());

  // 1 e 2. (Mantenha sua lógica de Usuário e Profile igual...)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const username = profile?.username || 'user';

  // --- AJUSTE AQUI: Limitação do Título ---
  const MAX_TITLE_LENGTH = 60; // Limite razoável para a parte do título

  let safeTitle = slugify(title, { lower: true, strict: true, locale: 'pt' });

  // Trunca o título se for maior que o limite
  if (safeTitle.length > MAX_TITLE_LENGTH) {
    safeTitle = safeTitle.substring(0, MAX_TITLE_LENGTH);
    // Remove hífen residual no final após o corte, se existir
    safeTitle = safeTitle.replace(/-+$/, '');
  }

  const datePart = dateStr.substring(0, 10).replace(/-/g, '/');
  const baseSlug = `${username}/${datePart}/${safeTitle}`;
  // ---------------------------------------

  let uniqueSlug = baseSlug;
  let suffix = 0;

  // 5. Garantir unicidade (Sua lógica de loop permanece excelente)
  while (true) {
    const { data: existing, error } = await supabase
      .from('tb_galerias')
      .select('id')
      .eq('slug', uniqueSlug)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar slug:', error);
      break;
    }

    if (!existing || (currentId && existing.id === currentId)) {
      return uniqueSlug;
    }

    suffix++;
    // O sufixo entra após o título truncado
    uniqueSlug = `${baseSlug}-${suffix}`;
  }

  return uniqueSlug;
}

// =========================================================================
// 3. CREATE GALERIA
// =========================================================================
export async function createGaleria(
  formData: FormData,
  supabaseClient?: any,
): Promise<ActionResult> {
  const supabase = supabaseClient || (await createSupabaseServerClient());
  const { success: authSuccess, userId } = await getAuthAndStudioIds(supabase);

  if (!authSuccess || !userId)
    return { success: false, error: 'Não autorizado' };

  const slug = await generateUniqueDatedSlug(
    formData.get('title') as string,
    new Date(formData.get('date') as string).toISOString(),
  );

  try {
    const data = {
      user_id: userId, // ID do criador
      slug: slug,
      //studio_id: studioId,
      title: formData.get('title') as string,
      show_on_profile: formData.get('show_on_profile') === 'true',
      client_name: (formData.get('client_name') as string) || 'Cobertura',
      client_whatsapp: (() => {
        let val =
          (formData.get('client_whatsapp') as string)?.replace(/\D/g, '') || '';
        if (
          val &&
          (val.length === 10 || val.length === 11) &&
          !val.startsWith('55')
        ) {
          val = `55${val}`;
        }
        return val || null;
      })(),
      date: new Date(formData.get('date') as string).toISOString(),
      location: (formData.get('location') as string) || '',
      drive_folder_id: formData.get('drive_folder_id') as string,
      drive_folder_name: formData.get('drive_folder_name') as string,
      cover_image_url: formData.get('cover_image_url') as string,
      is_public: formData.get('is_public') === 'true',
      category: (formData.get('category') as string) || 'evento',
      has_contracting_client: formData.get('has_contracting_client') === 'true',

      // 🎯 Customização Visual Inicial
      show_cover_in_grid: formData.get('show_cover_in_grid') === 'true',
      grid_bg_color: (formData.get('grid_bg_color') as string) || '#F3E5AB',
      columns_mobile: Number(formData.get('columns_mobile')) || 2,
      columns_tablet: Number(formData.get('columns_tablet')) || 3,
      columns_desktop: Number(formData.get('columns_desktop')) || 4,

      // 🎯 Links armazenados como JSON (array de strings) no campo zip_url_full
      zip_url_full: (formData.get('zip_url_full') as string) || null,
      zip_url_social: null, // Mantido para compatibilidade, mas não usado mais

      // 🎯 Captura de Leads
      leads_enabled: formData.get('leads_enabled') === 'true',
      leads_require_name: formData.get('leads_require_name') === 'true',
      leads_require_email: formData.get('leads_require_email') === 'true',
      leads_require_whatsapp: formData.get('leads_require_whatsapp') === 'true',
      lead_purpose: (formData.get('lead_purpose') as string) || null,
      rename_files_sequential:
        formData.get('rename_files_sequential') === 'true',

      // Senha inicial (se houver)
      password:
        formData.get('is_public') === 'true'
          ? null
          : (formData.get('password') as string),
    };

    const { error, data: insertedData } = await supabase
      .from('tb_galerias')
      .insert([data])
      .select(
        'id, slug, drive_folder_id, photographer:tb_profiles!user_id(username)',
      )
      .single();

    if (error) throw error;

    // 🔄 REVALIDAÇÃO ESTRATÉGICA COMPLETA: Limpa o cache da galeria, fotos e perfil
    if (insertedData?.slug) {
      revalidateTag(`gallery-${insertedData.slug}`);
    }
    if (insertedData?.drive_folder_id) {
      revalidateTag(`drive-${insertedData.drive_folder_id}`);
    }
    if (insertedData?.id) {
      revalidateTag(`photos-${insertedData.id}`);
    }
    // 🎯 CRÍTICO: Revalida a lista de galerias do usuário para aparecer no dashboard
    // console.log(`[createGaleria] Revalidando cache para userId: ${userId}`);
    revalidateTag(`user-galerias-${userId}`);
    // Busca o username para revalidar o perfil público
    const { data: profile } = await supabase
      .from('tb_profiles')
      .select('username')
      .eq('id', userId)
      .single();
    if (profile?.username) {
      revalidateTag(`profile-${profile.username}`);
      revalidateTag(`profile-galerias-${profile.username}`);
    }

    // 🎯 FORÇA REVALIDAÇÃO COMPLETA: Revalida o dashboard e todas as rotas relacionadas
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard');
    return {
      success: true,
      message: 'Nova galeria criada com sucesso!',
      data: insertedData,
    };
  } catch (error) {
    console.error('Erro no create:', error);
    return { success: false, error: 'Falha ao criar a galeria.' };
  }
}

// =========================================================================
// 4. UPDATE GALERIA
// =========================================================================

export async function updateGaleria(
  id: string,
  formData: FormData,
  supabaseClient?: any,
): Promise<ActionResult> {
  const supabase = supabaseClient || (await createSupabaseServerClient());
  const { success: authSuccess, userId } = await getAuthAndStudioIds(supabase);

  if (!authSuccess || !userId)
    return { success: false, error: 'Não autorizado' };

  try {
    // 1. Extração segura de dados com fallbacks
    const updates: any = {
      title: formData.get('title') as string,
      show_on_profile: formData.get('show_on_profile') === 'true',
      client_name: (formData.get('client_name') as string) || 'Cobertura',
      client_whatsapp: (() => {
        let val =
          (formData.get('client_whatsapp') as string)?.replace(/\D/g, '') || '';
        if (
          val &&
          (val.length === 10 || val.length === 11) &&
          !val.startsWith('55')
        ) {
          val = `55${val}`;
        }
        return val || null;
      })(),
      date: new Date(formData.get('date') as string).toISOString(),
      location: (formData.get('location') as string) || '',
      drive_folder_id: formData.get('drive_folder_id') as string,
      drive_folder_name: formData.get('drive_folder_name') as string,
      cover_image_url: formData.get('cover_image_url') as string,
      is_public: formData.get('is_public') === 'true',
      category: (formData.get('category') as string) || 'evento',
      has_contracting_client: formData.get('has_contracting_client') === 'true',

      // 🎯 Customização Visual (Garantindo que nunca vá vazio)
      show_cover_in_grid: formData.get('show_cover_in_grid') === 'true',
      grid_bg_color: (formData.get('grid_bg_color') as string) || '#F3E5AB',
      columns_mobile: Number(formData.get('columns_mobile')) || 2,
      columns_tablet: Number(formData.get('columns_tablet')) || 3,
      columns_desktop: Number(formData.get('columns_desktop')) || 4,

      // 🎯 Links armazenados como JSON (array de strings) no campo zip_url_full
      zip_url_full: (formData.get('zip_url_full') as string) || null,
      zip_url_social: null, // Mantido para compatibilidade, mas não usado mais

      // 🎯 Captura de Leads
      leads_enabled: formData.get('leads_enabled') === 'true',
      leads_require_name: formData.get('leads_require_name') === 'true',
      leads_require_email: formData.get('leads_require_email') === 'true',
      leads_require_whatsapp: formData.get('leads_require_whatsapp') === 'true',
      lead_purpose: (formData.get('lead_purpose') as string) || null,
      rename_files_sequential:
        formData.get('rename_files_sequential') === 'true',
    };

    // 2. Validação básica de integridade
    if (!updates.title || !updates.drive_folder_id) {
      return {
        success: false,
        error: 'Dados essenciais ausentes (Título/Drive).',
      };
    }

    // 3. Lógica de senha refinada
    const newPassword = formData.get('password') as string;
    if (updates.is_public) {
      updates.password = null; // Se tornou pública, remove a senha
    } else if (newPassword && newPassword.trim() !== '') {
      updates.password = newPassword; // Só atualiza se o usuário digitou uma nova
    }

    // Busca o slug antes de atualizar para revalidar o cache
    const { data: galeriaAntes } = await supabase
      .from('tb_galerias')
      .select('slug, drive_folder_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('tb_galerias')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // 🔄 REVALIDAÇÃO ESTRATÉGICA: Limpa o cache da galeria, fotos e perfil
    if (galeriaAntes?.slug) {
      revalidateTag(`gallery-${galeriaAntes.slug}`);
    }
    if (galeriaAntes?.drive_folder_id) {
      revalidateTag(`drive-${galeriaAntes.drive_folder_id}`);
    }
    revalidateTag(`photos-${id}`);
    // Revalida todas as galerias do usuário
    revalidateTag(`user-galerias-${userId}`);
    // Busca o username para revalidar o perfil público
    const { data: profile } = await supabase
      .from('tb_profiles')
      .select('username')
      .eq('id', userId)
      .single();
    if (profile?.username) {
      revalidateTag(`profile-${profile.username}`);
      revalidateTag(`profile-galerias-${profile.username}`);
    }

    revalidatePath('/dashboard');
    return {
      success: true,
      message: 'Galeria refinada com sucesso!',
      data: { id, ...updates },
    };
  } catch (error) {
    console.error('Erro no update:', error);
    return { success: false, error: 'Falha ao atualizar a galeria.' };
  }
}
// =========================================================================
// 5. GET GALERIAS (Apenas do usuário logado)
// =========================================================================

/**
 * 🎯 CACHE: Busca galerias do usuário logado com cache de 30 dias
 * O cache é limpo automaticamente via revalidateTag quando galerias são criadas/atualizadas
 *
 * 🎯 CORREÇÃO: Cria cliente Supabase ANTES do cache e usa createSupabaseClientForCache
 * dentro do cache para evitar erro de cookies dentro de unstable_cache
 */
export async function getGalerias(
  supabaseClient?: any,
): Promise<ActionResult<Galeria[]>> {
  // 🎯 PASSO 1: Autenticação e obtenção do userId FORA do cache
  // Isso é necessário porque getAuthAndStudioIds usa cookies
  const {
    success,
    userId,
    error: authError,
  } = await getAuthAndStudioIds(supabaseClient);

  if (!success || !userId) {
    return {
      success: false,
      error: authError || 'Usuário não autenticado.',
      data: [],
    };
  }

  // 🎯 PASSO 2: Cache da busca de dados (sem cookies dentro)
  return unstable_cache(
    async (cachedUserId: string) => {
      try {
        // 🎯 USA createSupabaseClientForCache (sem cookies) dentro do cache
        const supabase = createSupabaseClientForCache();

        // 🎯 AJUSTE NO SELECT: Agora traz todos os campos necessários do perfil
        const { data, error } = await supabase
          .from('tb_galerias')
          .select(
            `
            *,
            leads:tb_galeria_leads(count),
            photographer:tb_profiles!user_id (
              id,
              full_name,
              username,
              use_subdomain,
              profile_picture_url,
              phone_contact,
              instagram_link,
              email
            )
          `,
          )
          .eq('user_id', cachedUserId)
          .order('date', { ascending: false });

        if (error) {
          console.error('[getGalerias] Erro na query:', error);
          throw error;
        }

        // 🎯 DEBUG: Verificação detalhada de leads
        // console.log(`[getGalerias] userId: ${cachedUserId}, Found: ${data?.length || 0}`);

        // AJUSTE NO MAP: Usa a função formatGalleryData para garantir que o objeto photographer exista
        const galeriasFormatadas = (data || []).map((raw) =>
          formatGalleryData(raw as any, raw.photographer?.username || ''),
        );

        return { success: true, data: galeriasFormatadas };
      } catch (error) {
        console.error('[getGalerias] Erro ao buscar galerias:', error);

        if (
          error.message === 'AUTH_RECONNECT_REQUIRED' ||
          error.message.includes('Google expirou')
        ) {
          return { success: false, error: 'AUTH_RECONNECT_REQUIRED' };
        }

        return {
          success: false,
          error: 'Falha ao buscar galerias.',
          data: [],
        };
      }
    },
    [`user-galerias-${userId}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [`user-galerias-${userId}`],
    },
  )(userId);
}

// =========================================================================
// 5.1. BUSCAR GALERIA POR ID (para edição)
// =========================================================================
export async function getGaleriaById(
  id: string,
  userId: string,
): Promise<ActionResult<Galeria | null>> {
  try {
    const supabase = await createSupabaseServerClientReadOnly();
    const { data, error } = await supabase
      .from('tb_galerias')
      .select(
        `
        *,
        leads:tb_galeria_leads(count),
        photographer:tb_profiles!user_id (
          id,
          full_name,
          username,
          use_subdomain,
          profile_picture_url,
          phone_contact,
          instagram_link,
          email
        )
      `,
      )
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { success: false, error: 'Galeria não encontrada.', data: null };
    }

    const galeria = formatGalleryData(
      data as any,
      data.photographer?.username || '',
    );
    return { success: true, data: galeria };
  } catch (error) {
    console.error('[getGaleriaById] Erro:', error);
    return { success: false, error: 'Erro ao buscar galeria.', data: null };
  }
}

// =========================================================================
// 6. DELETE GALERIA
// =========================================================================
export async function deleteGalleryPermanently(id: string) {
  const supabase = await createSupabaseServerClient(); // ou client-side dependendo de onde chama
  const { error } = await supabase.from('tb_galerias').delete().eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * ⚠️⚠️⚠️ FUNÇÃO CRÍTICA DE SEGURANÇA ⚠️⚠️⚠️
 *
 * Autentica o acesso a uma galeria protegida por senha.
 * Gerencia a criação do cookie JWT e redireciona para a URL correta no subdomínio.
 *
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Bug pode permitir acesso não autorizado a galerias privadas
 * - Pode expor senhas ou tokens JWT
 * - Pode quebrar validação de acesso
 *
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda validação de senha e JWT
 * 4. Teste extensivamente
 * 5. Solicite revisão de código
 *
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */
export async function authenticateGaleriaAccess(
  galeriaId: string,
  fullSlug: string,
  passwordInput: string,
) {
  const supabase = await createSupabaseServerClientReadOnly();

  // 1. Busca dados da galeria
  const { data: galeria } = await supabase
    .from('tb_galerias')
    .select(
      'id, password, user_id, tb_profiles!user_id(username, use_subdomain)',
    )
    .eq('id', galeriaId)
    .single();

  if (!galeria || galeria.password !== passwordInput) {
    return { success: false, error: 'Senha incorreta.' };
  }

  // 2. JWT (Mantido)
  const secretKey = new TextEncoder().encode(
    process.env.JWT_GALLERY_SECRET || 'chave-padrao',
  );
  const token = await new SignJWT({ galeriaId: String(galeria.id) })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secretKey);

  // 3. COOKIE - O PONTO CRÍTICO
  const cookieStore = await cookies();
  const host = (await headers()).get('host') || '';

  const cookieOptions: any = {
    path: '/', // 🎯 OBRIGATÓRIO: Permite que /hitalodiniz80/slug leia o cookie
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  };

  // Se estiver em localhost, forçamos o domínio para abranger subdomínios de teste
  if (host.includes('localhost')) {
    // Não defina 'domain' em localhost a menos que precise de cross-subdomain estrito.
    // Se estiver usando hitalo.localhost:3000, o cookie deve ser setado sem domain
    // para ser "Host-only" ou explicitamente para 'localhost'.
    cookieOptions.domain = undefined;
  } else if (process.env.NEXT_PUBLIC_MAIN_DOMAIN) {
    // O ponto antes do domínio permite que subdomínios acessem o cookie
    cookieOptions.domain = `.${process.env.NEXT_PUBLIC_MAIN_DOMAIN.replace('https://', '').replace('http://', '')}`;
  }

  cookieStore.set(`galeria-${galeriaId}-auth`, token, cookieOptions);

  // 3. Lógica de Redirecionamento (DEFINA AQUI PRIMEIRO)
  const profile = galeria.tb_profiles as any;
  // Remove o domínio e garante que não existam barras duplas
  const cleanPath = fullSlug
    .replace(/^(https?:\/\/[^\/]+)?/, '')
    .replace(
      new RegExp(`^/${profile?.username}/${profile?.username}`),
      `/${profile?.username}`,
    )
    .replace(/\/+/g, '/');

  // Garante que o caminho comece com /
  const finalRedirectPath = cleanPath.startsWith('/')
    ? cleanPath
    : `/${cleanPath}`;

  // Importante: Invalide o cache ANTES do redirect
  revalidatePath('/', 'layout');

  redirect(finalRedirectPath);
}
/**
 * =========================================================================
 * 8. BUSCAR FOTOS DA GALERIA NO GOOGLE DRIVE
 * =========================================================================
 */

/**
 * Autentica o usuário logado, busca o ID da pasta do Drive no DB,
 * renova o Access Token do Google e lista as fotos.
 * * @param galeriaId O ID da galeria que contém o driveFolderId.
 * @returns A lista de fotos (DrivePhoto[]) ou um objeto de erro.
 */
export async function getGaleriaPhotos(
  galeriaId: string,
): Promise<ActionResult<DrivePhoto[]>> {
  try {
    // 1. AUTENTICAÇÃO E CONTEXTO
    const { success, userId, error: authError } = await getAuthAndStudioIds();

    if (!success || !userId) {
      return {
        success: false,
        error: authError || 'Usuário não autenticado.',
        data: [],
      };
    }

    const supabase = await createSupabaseServerClientReadOnly();

    // 2. BUSCAR O ID DA PASTA DA GALERIA
    const { data: galeria, error: galeriaError } = await supabase
      .from('tb_galerias')
      .select('drive_folder_id')
      .eq('id', galeriaId)
      .eq('user_id', userId) // RLS: Garante que o usuário só acesse suas próprias galerias
      .maybeSingle();

    if (galeriaError || !galeria || !galeria.drive_folder_id) {
      return {
        success: false,
        error: 'Galeria não encontrada.',
        data: [],
      };
    }

    const driveFolderId = galeria.drive_folder_id;

    // 3. USAR O SERVICE UNIFICADO PARA BUSCAR FOTOS
    const result = await getFolderPhotos(driveFolderId, userId);

    if (!result.success) {
      // Se for erro de autenticação, redireciona o usuário
      if (result.error === 'AUTH_RECONNECT_REQUIRED') {
        redirect('/');
      }
      return result;
    }

    if (result.data && result.data.length === 0) {
      return { success: true, data: [] }; // Retorna sucesso, mas com lista vazia.
    }

    return result;
  } catch (error: any) {
    console.error('Erro ao buscar fotos:', error.message);

    // SOLUÇÃO 1: Se for erro de autenticação, redireciona o usuário
    if (error.message.includes('Sua sessão expirou')) {
      // Redireciona para a página de reconexão do Google
      redirect('/');
    }

    // SOLUÇÃO 2: Se for outro erro, retorna um estado seguro para o Componente
    // Isso evita que a página inteira quebre (White Screen of Death)
    return {
      success: false,
      error: error.message || 'Não foi possível carregar as fotos.',
    };
  }
}

// galeria.actions.ts
/**
 * 🎯 CACHE: Busca galerias públicas do perfil com cache de 30 dias
 * O cache é limpo automaticamente via revalidateTag quando o perfil ou galerias são atualizados
 */
export async function getPublicProfileGalerias(
  username: string,
  page: number = 1,
  pageSize: number = 12,
) {
  return unstable_cache(
    async () => {
      // 🎯 USA CLIENTE PARA CACHE: Não usa cookies (dados públicos)
      const supabase = createSupabaseClientForCache();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // 1. Buscamos o ID do fotógrafo pelo username
      const { data: profile } = await supabase
        .from('tb_profiles')
        .select('id')
        .eq('username', username)

        .single();

      if (!profile) return { success: false, data: [], hasMore: false };

      // 2. Buscamos as galerias incluindo o objeto 'photographer'
      const { data, count, error } = await supabase
        .from('tb_galerias')
        .select(
          `
          *,
          photographer:tb_profiles (
            id,
            full_name,
            username,
            profile_picture_url,
            phone_contact,
            instagram_link,
            use_subdomain
          )
        `,
          { count: 'exact' },
        )
        .eq('user_id', profile.id)
        .eq('show_on_profile', true)
        .eq('is_archived', false)
        .eq('is_deleted', false)
        .order('date', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Erro ao buscar galerias do perfil:', error);
        return { success: false, data: [], hasMore: false };
      }

      return {
        success: true,
        data: data || [],
        hasMore: count ? to < count - 1 : false,
      };
    },
    [`profile-galerias-${username}-page-${page}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [`profile-${username}`, `profile-galerias-${username}`],
    },
  )();
}
// =========================================================================
// FUNÇÕES DE STATUS E EXCLUSÃO (SUPABASE)
// =========================================================================

/**
 * Função genérica para atualizar status via Supabase (Server Action)
 */
async function updateGaleriaStatus(id: string, updates: any) {
  try {
    const supabase = await createSupabaseServerClient();
    const { success: authSuccess, userId } =
      await getAuthAndStudioIds(supabase);

    if (!authSuccess || !userId)
      return { success: false, error: 'Não autenticado' };

    // Busca o slug e drive_folder_id antes de atualizar para revalidar o cache
    const { data: galeriaAntes } = await supabase
      .from('tb_galerias')
      .select('slug, drive_folder_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabase
      .from('tb_galerias')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single(); // Use single para garantir que pegamos o objeto atualizado

    if (error) throw error;

    // 🔄 REVALIDAÇÃO ESTRATÉGICA: Limpa o cache da galeria, fotos e perfil
    if (galeriaAntes?.slug) {
      revalidateTag(`gallery-${galeriaAntes.slug}`);
    }
    if (galeriaAntes?.drive_folder_id) {
      revalidateTag(`drive-${galeriaAntes.drive_folder_id}`);
    }
    revalidateTag(`photos-${id}`);
    // Revalida todas as galerias do usuário
    revalidateTag(`user-galerias-${userId}`);
    // Busca o username para revalidar o perfil público
    const { data: profile } = await supabase
      .from('tb_profiles')
      .select('username')
      .eq('id', userId)
      .single();
    if (profile?.username) {
      revalidateTag(`profile-${profile.username}`);
      revalidateTag(`profile-galerias-${profile.username}`);
    }

    // O revalidatePath limpa o cache do servidor.
    // No Next.js 14/15, isso força o componente pai a enviar novas props.
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ARQUIVAR: Alterna o estado de arquivamento
 */
export async function toggleArchiveGaleria(id: string, currentStatus: boolean) {
  return updateGaleriaStatus(id, { is_archived: !currentStatus });
}

/**
 * PERFIL: Alterna a visibilidade da galeria no portfólio público
 */
export async function toggleShowOnProfile(id: string, currentStatus: boolean) {
  // Reutiliza a função base de update que você já possui
  return updateGaleriaStatus(id, { show_on_profile: !currentStatus });
}
/**
 * MOVER PARA LIXEIRA (Soft Delete)
 */
export async function moveToTrash(id: string) {
  return updateGaleriaStatus(id, {
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  });
}

/**
 * RESTAURAR: Tira da lixeira e do arquivo, voltando para "Ativas"
 */
export async function restoreGaleria(id: string) {
  return updateGaleriaStatus(id, {
    is_deleted: false,
    is_archived: false,
    deleted_at: null,
  });
}

/**
 * EXCLUIR PERMANENTEMENTE (Hard Delete)
 */
export async function permanentDelete(id: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { userId } = await getAuthAndStudioIds(supabase);

    // Busca o slug e drive_folder_id antes de deletar para revalidar o cache
    const { data: galeriaAntes } = await supabase
      .from('tb_galerias')
      .select('slug, drive_folder_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    const { error } = await supabase
      .from('tb_galerias')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    // 🔄 REVALIDAÇÃO ESTRATÉGICA: Limpa o cache da galeria, fotos e perfil
    if (galeriaAntes?.slug) {
      revalidateTag(`gallery-${galeriaAntes.slug}`);
    }
    if (galeriaAntes?.drive_folder_id) {
      revalidateTag(`drive-${galeriaAntes.drive_folder_id}`);
    }
    revalidateTag(`photos-${id}`);
    // Revalida todas as galerias do usuário
    revalidateTag(`user-galerias-${userId}`);
    // Busca o username para revalidar o perfil público
    const { data: profile } = await supabase
      .from('tb_profiles')
      .select('username')
      .eq('id', userId)
      .single();
    if (profile?.username) {
      revalidateTag(`profile-${profile.username}`);
      revalidateTag(`profile-galerias-${profile.username}`);
    }

    revalidatePath('/dashboard');
    return { success: true, message: 'Galeria excluída permanentemente.' };
  } catch (error: any) {
    console.error('Erro ao excluir permanentemente:', error);
    return { success: false, error: 'Erro ao excluir permanentemente' };
  }
}

/**
 * 🎯 BUSCAR LEADS DA GALERIA
 */
export async function getGaleriaLeads(
  galeriaId: string,
): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createSupabaseServerClientReadOnly();
    const { success, userId } = await getAuthAndStudioIds(supabase);

    if (!success || !userId) {
      return { success: false, error: 'Não autorizado' };
    }

    const { data, error } = await supabase
      .from('tb_galeria_leads')
      .select('*')
      .eq('galeria_id', galeriaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('[getGaleriaLeads] Erro:', error);
    return { success: false, error: 'Erro ao buscar leads.' };
  }
}

/**
 * 🛠️ SERVICE: Gerencia o arquivamento por limite de galerias.
 */
export async function archiveExceedingGalleries(
  userId: string,
  limit: number,
  supabaseClient?: any,
) {
  const supabase = supabaseClient || (await createSupabaseServerClient());

  // 🎯 ORDENAÇÃO DESCENDENTE (DESC):
  // Coloca a galeria de 'hoje' no topo (index 0).
  // Coloca a galeria de '2023' no final da lista.
  const { data: active, error: fetchError } = await supabase
    .from('tb_galerias')
    .select('id, title')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .order('date', { ascending: false }); // 👈 CRÍTICO: false para manter as novas

  if (fetchError) throw fetchError;

  if (active && active.length > limit) {
    // 🔪 O slice(limit) pula as 'limit' primeiras (as mais novas)
    // e pega tudo o que sobrou (as mais antigas).
    const toArchive = active.slice(limit);
    const idsToArchive = toArchive.map((g) => g.id);

    const { error: updateError } = await supabase
      .from('tb_galerias')
      .update({ is_archived: true })
      .in('id', idsToArchive);

    if (updateError) throw updateError;

    return idsToArchive.length;
  }

  return 0;
}
