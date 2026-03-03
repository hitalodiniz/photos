'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import slugify from 'slugify';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { GLOBAL_CACHE_REVALIDATE } from '@/core/utils/url-helper';

import {
  DrivePhoto,
  getSelectionMetadataAction,
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

import {
  getAuthAndStudioIds,
  getAuthenticatedUser,
} from './auth-context.service';
import {
  createSupabaseServerClient,
  createSupabaseClientForCache,
  createSupabaseServerClientReadOnly,
  createSupabaseAdmin,
} from '@/lib/supabase.server';
import {
  PlanKey,
  PERMISSIONS_BY_PLAN,
  resolveGalleryLimitByPlan,
} from '../config/plans';
import { syncUserGalleriesAction } from '@/actions/galeria.actions';
import {
  extractGalleryFormData,
  validateGalleryData,
  processPassword,
} from '../utils/galeria-form.helper';
import {
  checkGalleryLimit,
  checkReactivationLimit,
} from '../utils/galeria-limit.helper';
import { revalidateGalleryCache } from '@/actions/revalidate.actions';
import { cache } from 'react';
import { registerFolderWatch } from './drive-watch.service';
import { getGoogleRefreshToken } from './profile.service';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';

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
// 3. CREATE GALERIA - VERSÃO REFATORADA
// =========================================================================
export async function createGaleria(
  formData: FormData,
  supabaseClient?: any,
): Promise<ActionResult> {
  const supabase = supabaseClient || (await createSupabaseServerClient());

  // 1. AUTENTICAÇÃO E PERFIL
  const {
    success: authSuccess,
    userId,
    profile,
  } = await getAuthenticatedUser();

  if (!authSuccess || !userId || !profile) {
    return { success: false, error: 'Não autorizado ou perfil não carregado.' };
  }

  // 2. EXTRAÇÃO E VALIDAÇÃO DE DADOS
  const formFields = extractGalleryFormData(formData);
  const validation = validateGalleryData(formFields);

  if (!validation.isValid) {
    return { success: false, error: validation.firstError };
  }

  // 3. VALIDAÇÃO DE LIMITE
  try {
    const limitCheck = await checkGalleryLimit(
      supabase,
      userId,
      profile.plan_key,
    );

    if (!limitCheck.canCreate) {
      return { success: false, error: limitCheck.error };
    }
  } catch (err) {
    console.error('[createGaleria] Erro ao validar limites:', err);
    return { success: false, error: 'Falha ao validar limites do plano.' };
  }

  // 4. GERAÇÃO DE SLUG
  const slug = await generateUniqueDatedSlug(formFields.title, formFields.date);

  // 5. MONTAGEM DE DADOS PARA INSERT
  const { _password, ...dataWithoutPassword } = formFields;
  const password = processPassword(formFields, false);

  const insertData = {
    ...dataWithoutPassword,
    user_id: userId,
    slug,
    password,
    zip_url_social: null, // Mantido para compatibilidade
  };

  // 6. INSERT NO BANCO
  try {
    const { error, data: insertedData } = await supabase
      .from('tb_galerias')
      .insert([insertData])
      .select(
        'id, slug, drive_folder_id, photographer:tb_profiles!user_id(username)',
      )
      .single();

    if (error) throw error;

    await revalidateGalleryCache({
      galeriaId: insertedData.id,
      slug: insertedData.slug,
      driveFolderId: insertedData.drive_folder_id,
      userId,
      username: profile.username,
    });

    if (insertedData.drive_folder_id) {
      // 1️⃣ Busca refresh token (profile.service)
      const tokenResult = await getGoogleRefreshToken();

      if (tokenResult.success && tokenResult.token) {
        try {
          // 2️⃣ Troca por access token (google-auth)
          const accessToken = await getDriveAccessTokenForUser(userId);

          if (accessToken) {
            // 3️⃣ Registra o watch (drive-watch.service)
            await registerFolderWatch(
              accessToken,
              insertedData.drive_folder_id,
              insertedData.id,
              tokenResult.userId!,
            );

            console.log('[createGaleria] ✅ Watch registrado com sucesso');
          } else {
            console.warn('[createGaleria] Não foi possível obter access token');
          }
        } catch (error) {
          // Não falha a criação da galeria se o watch falhar
          console.error('[createGaleria] Erro ao registrar watch:', error);
        }
      }
    }

    return {
      success: true,
      message: 'Nova galeria criada com sucesso!',
      data: insertedData,
    };
  } catch (error) {
    console.error('[createGaleria] Erro no insert:', error);
    return { success: false, error: 'Falha ao criar a galeria.' };
  }
}
// =========================================================================
// 4. UPDATE GALERIA - VERSÃO REFATORADA
// =========================================================================
export async function updateGaleria(
  id: string,
  formData: FormData,
  supabaseClient?: any,
): Promise<ActionResult> {
  const supabase = supabaseClient || (await createSupabaseServerClient());

  // 1. AUTENTICAÇÃO E PERFIL
  const {
    success: authSuccess,
    userId,
    profile,
  } = await getAuthenticatedUser();

  if (!authSuccess || !userId || !profile) {
    return { success: false, error: 'Não autorizado' };
  }

  // 2. BUSCAR DADOS ATUAIS DA GALERIA
  const { data: currentGallery, error: fetchError } = await supabase
    .from('tb_galerias')
    .select('slug, drive_folder_id, is_archived')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !currentGallery) {
    return { success: false, error: 'Galeria não encontrada.' };
  }

  // 3. VALIDAR SE NÃO ESTÁ ARQUIVADA
  if (currentGallery.is_archived) {
    return {
      success: false,
      error: 'Esta galeria está arquivada e não pode ser editada.',
    };
  }

  // 4. EXTRAÇÃO E VALIDAÇÃO DE DADOS
  const formFields = extractGalleryFormData(formData);
  const validation = validateGalleryData(formFields);

  if (!validation.isValid) {
    return { success: false, error: validation.firstError };
  }

  // 5. MONTAGEM DE DADOS PARA UPDATE
  const { _password, ...dataWithoutPassword } = formFields;
  const password = processPassword(formFields, true);

  const updateData = {
    ...dataWithoutPassword,
    zip_url_social: null, // Mantido para compatibilidade
    ...(password !== undefined && { password }), // Só inclui se houver mudança
  };

  // 6. UPDATE NO BANCO
  try {
    const { error } = await supabase
      .from('tb_galerias')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    await revalidateGalleryCache({
      galeriaId: id,
      slug: currentGallery.slug,
      driveFolderId: currentGallery.drive_folder_id,
      userId,
      username: profile.username,
    });

    if (updateData.drive_folder_id) {
      // 1️⃣ Busca refresh token (profile.service)
      const tokenResult = await getGoogleRefreshToken();

      if (tokenResult.success && tokenResult.token) {
        try {
          // 2️⃣ Troca por access token (google-auth)
          const accessToken = await getDriveAccessTokenForUser(
            tokenResult.userId!,
          );
          console.log('accessToken', 'tem token no update');

          if (accessToken) {
            // 3️⃣ Registra o watch (drive-watch.service)
            await registerFolderWatch(
              accessToken,
              updateData.drive_folder_id,
              id,
              tokenResult.userId!,
            );

            console.log('[updateGaleria] ✅ Watch registrado com sucesso');
          } else {
            console.warn('[updateGaleria] Não foi possível obter access token');
          }
        } catch (error) {
          // Não falha a criação da galeria se o watch falhar
          console.error('[updateGaleria] Erro ao registrar watch:', error);
        }
      } else {
        console.warn(
          '[updateGaleria] Token do Google não disponível:',
          tokenResult.error,
        );
      }
    }
    return {
      success: true,
      message: 'Galeria atualizada com sucesso!',
      data: { id, ...updateData },
    };
  } catch (error) {
    console.error('[updateGaleria] Erro no update:', error);
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
        const supabase = await createSupabaseClientForCache();

        // 🎯 USA SELECT '*' PARA EVITAR ERROS DE JOIN
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

/**
 * Busca galeria por id sem exigir sessão (uso em webhook/cron).
 * Usa createSupabaseAdmin para leitura.
 */
export async function getGaleriaByIdForServer(
  id: string,
): Promise<Galeria | null> {
  try {
    const supabase = createSupabaseAdmin();
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
      .single();

    if (error || !data) return null;

    return formatGalleryData(
      data as any,
      (data as any).photographer?.username || '',
    );
  } catch {
    return null;
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
    // Use .meudominio.com para que sub.meudominio.com e meudominio.com compartilhem o JWT
    const domain = process.env.NEXT_PUBLIC_MAIN_DOMAIN.replace(
      /https?:\/\//,
      '',
    ).split(':')[0]; // Remove porta se houver
    cookieOptions.domain = `.${domain}`;
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
    const result = await getFolderPhotos(driveFolderId);

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

/**
 * =========================================================================
 * 8.1 SINCRONIZAR PHOTO_COUNT DA GALERIA
 * =========================================================================
 */
export async function syncGaleriaPhotoCount(
  galeria: Galeria,
): Promise<ActionResult<{ photo_count: number }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { success, userId, error: authError } = await getAuthAndStudioIds();

    if (!success || !userId) {
      return {
        success: false,
        error: authError || 'Usuário não autenticado.',
      };
    }

    const photosResult = await getFolderPhotos(galeria.drive_folder_id);
    if (!photosResult.success) {
      return {
        success: false,
        error:
          photosResult.error || 'Não foi possível sincronizar fotos do Drive.',
      };
    }

    const count = photosResult.data?.length || 0;
    const { error: updateError } = await supabase
      .from('tb_galerias')
      .update({
        photo_count: count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galeria.id)
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, data: { photo_count: count } };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erro ao sincronizar contagem de fotos.',
    };
  }
}

/**
 * Sincroniza photo_count da galeria por id (uso em webhook/cron, sem sessão).
 * Usa createSupabaseAdmin para leitura e update.
 */
export async function syncGaleriaPhotoCountByGaleriaId(
  galeriaId: string,
): Promise<ActionResult<{ photo_count: number }>> {
  try {
    const supabase = createSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from('tb_galerias')
      .select('id, drive_folder_id')
      .eq('id', galeriaId)
      .single();

    if (fetchError || !row?.drive_folder_id) {
      return {
        success: false,
        error: 'Galeria não encontrada ou sem pasta vinculada.',
      };
    }

    const photosResult = await getFolderPhotos(row.drive_folder_id);
    if (!photosResult.success) {
      return {
        success: false,
        error:
          photosResult.error || 'Não foi possível sincronizar fotos do Drive.',
      };
    }

    const count = photosResult.data?.length || 0;
    const { error: updateError } = await supabase
      .from('tb_galerias')
      .update({
        photo_count: count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galeriaId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, data: { photo_count: count } };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erro ao sincronizar contagem de fotos.',
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
      const supabase = await createSupabaseClientForCache();
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
    [`profile-galerias-${username}-p-${page}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [
        `profile-${username}`,
        `profile-galerias-${username}`,
        // Adicione esta para revalidação via ID do fotógrafo:
        `user-galerias-${(await getAuthenticatedUser()).userId}`,
      ],
    },
  )();
}
// =========================================================================
// FUNÇÕES DE STATUS E EXCLUSÃO (SUPABASE)
// =========================================================================

/**
 * Função genérica para atualizar status via Supabase (Server Action)
 */
async function updateGaleriaStatus(
  id: string,
  updates: any,
  shouldCheckLimit: boolean = false,
) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      success: authSuccess,
      userId,
      profile,
    } = await getAuthenticatedUser();

    if (!authSuccess || !userId || !profile) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data: galleryData, error: fetchError } = await supabase
      .from('tb_galerias')
      .select('user_id, slug, drive_folder_id')
      .eq('id', id)
      .single();

    if (fetchError || !galleryData) {
      return {
        success: false,
        error: 'Galeria não encontrada ou você não tem permissão.',
      };
    }

    if (galleryData.user_id !== userId) {
      return { success: false, error: 'Operação não autorizada.' };
    }

    if (shouldCheckLimit) {
      const limitCheck = await checkReactivationLimit(
        supabase,
        userId,
        profile.plan_key,
        id,
      );

      if (!limitCheck.canCreate) {
        return { success: false, error: limitCheck.error };
      }
    }

    const { data, error: updateError } = await supabase
      .from('tb_galerias')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await revalidateGalleryCache({
      galeriaId: id,
      slug: data.slug,
      driveFolderId: data.drive_folder_id,
      userId,
      username: profile.username,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('[updateGaleriaStatus] Erro:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ARQUIVAR: Alterna o estado de arquivamento
 * Se currentStatus for true (arquivada), tentará desarquivar (passa pela validação de limite).
 */
export async function toggleArchiveGaleria(id: string, currentStatus: boolean) {
  const isUnarchiving = currentStatus === true;

  const result = await updateGaleriaStatus(
    id,
    { is_archived: !currentStatus },
    isUnarchiving, // Valida limite apenas ao desarquivar
  );

  // Sincroniza após desarquivar
  if (result.success && isUnarchiving) {
    await syncUserGalleriesAction();
  }

  return result;
}

/**
 * PERFIL: Alterna a visibilidade da galeria no portfólio público
 */
export async function toggleShowOnProfile(id: string, currentStatus: boolean) {
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
 * RESTAURAR: Tira da lixeira e garante conformidade com o plano
 */
export async function restoreGaleria(id: string): Promise<ActionResult> {
  // 1. Executa a restauração básica via update genérico
  // O updateGaleriaStatus já possui a trava de limite que implementamos
  const result = await updateGaleriaStatus(
    id,
    {
      is_deleted: false,
      is_archived: false,
      deleted_at: null,
    },
    true, // Valida o limite ao restaurar
  );

  if (!result.success) return result;

  // 2. ⚡ Sincronização Automática
  // Chamamos a Action de sincronização para garantir que o
  // status de todas as galerias esteja correto e gerar o log de auditoria
  await syncUserGalleriesAction();

  return {
    success: true,
    message: 'Galeria restaurada e limites do plano sincronizados.',
  };
}

/**
 * EXCLUIR PERMANENTEMENTE (Hard Delete)
 */
export async function permanentDelete(id: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { userId, profile } = await getAuthenticatedUser();

    if (!userId) return { success: false, error: 'Não autorizado' };

    // 1. Fetch gallery data to verify ownership
    const { data: galeria, error: fetchError } = await supabase
      .from('tb_galerias')
      .select('user_id, slug, drive_folder_id')
      .eq('id', id)
      .single();

    if (fetchError || !galeria) {
      return { success: false, error: 'Galeria não encontrada.' };
    }

    // 2. Explicit ownership check
    if (galeria.user_id !== userId) {
      return { success: false, error: 'Operação não autorizada.' };
    }

    // 3. Proceed with deletion
    const { error: deleteError } = await supabase
      .from('tb_galerias')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await revalidateGalleryCache({
      galeriaId: id,
      slug: galeria.slug,
      driveFolderId: galeria.drive_folder_id,
      userId,
      username: profile?.username,
    });

    return { success: true, message: 'Galeria excluída permanentemente.' };
  } catch (error: any) {
    console.error('[permanentDelete] Erro crítico:', error);
    return {
      success: false,
      error: error.message || 'Erro ao processar exclusão no banco de dados.',
    };
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

    // 1. Obtém Auth e Perfil (que contém o plan_key)
    const {
      success: authSuccess,
      userId,
      profile,
    } = await getAuthenticatedUser();

    if (!authSuccess || !userId) {
      return { success: false, error: 'Não autorizado' };
    }

    // 2. 🛡️ VALIDAÇÃO DE PLANO NO SERVER-SIDE
    const planKey = (profile?.plan_key?.toUpperCase() as PlanKey) || 'FREE';
    const permissions = PERMISSIONS_BY_PLAN[planKey];

    if (!permissions?.canCaptureLeads) {
      console.warn(
        `[getGaleriaLeads] Tentativa de acesso bloqueada. Plano: ${planKey}`,
      );
      return {
        success: false,
        error: 'UPGRADE_REQUIRED',
        message: 'Acesso negado. Seu plano atual não permite visualizar leads.',
      };
    }

    // 3. Busca os dados apenas se autorizado
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
 * 🎯 BUSCAR CONTAGEM DE GALERIAS NO PERFIL
 */
export async function getProfileListCount(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClientReadOnly();
  const { count, error } = await supabase
    .from('tb_galerias')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('show_on_profile', true)
    .eq('is_deleted', false)
    .eq('is_archived', false);

  if (error) {
    console.error('[getProfileListCount] Erro:', error);
    return 0;
  }

  return count || 0;
}

/**
 * 🛠️ SERVICE: Gerencia arquivamento por limite e registra auditoria.
 */
export async function archiveExceedingGalleries(
  userId: string,
  limit: number,
  planInfo: { oldPlan?: string; newPlan: string },
  supabaseClient?: any,
) {
  const supabase = supabaseClient || (await createSupabaseServerClient());

  // 1. Busca galerias ativas (mais recentes no topo)
  const { data: active, error: fetchError } = await supabase
    .from('tb_galerias')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .order('date', { ascending: false });

  if (fetchError) throw fetchError;

  let archivedCount = 0;

  if (active && active.length > limit) {
    const idsToArchive = active.slice(limit).map((g: any) => g.id);
    archivedCount = idsToArchive.length;

    const { error: updateError } = await supabase
      .from('tb_galerias')
      .update({ is_archived: true })
      .in('id', idsToArchive);

    if (updateError) throw updateError;
  }

  // 🎯 LOG DE AUDITORIA: Registra o evento mesmo que 0 galerias tenham sido arquivadas
  await supabase.from('tb_plan_sync_logs').insert({
    user_id: userId,
    old_plan: planInfo.oldPlan || 'N/A',
    new_plan: planInfo.newPlan,
    archived_count: archivedCount,
  });

  return archivedCount;
}

/**
 * 🧹 SERVICE: Limpeza de Lixeira
 * Remove permanentemente galerias com is_deleted = true e deleted_at > 30 dias.
 */
export async function purgeOldDeletedGalleries(supabaseClient?: any) {
  const supabase = supabaseClient || (await createSupabaseServerClient());

  // Calcula a data de corte (30 dias atrás)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  // 1. Busca galerias para exclusão (apenas para log e revalidação se necessário)
  const { data: toDelete, error: fetchError } = await supabase
    .from('tb_galerias')
    .select('id, user_id, slug')
    .eq('is_deleted', true)
    .lt('deleted_at', cutoffDate.toISOString());

  if (fetchError) throw fetchError;

  if (toDelete && toDelete.length > 0) {
    const ids = toDelete.map((g: any) => g.id);

    // Log preventivo no servidor antes de apagar
    console.log(`[Cron] Removendo ${ids.length} galerias da lixeira.`);

    // 2. Hard Delete no banco
    const { count, error: deleteError } = await supabase
      .from('tb_galerias')
      .delete()
      .in('id', ids);

    if (deleteError) throw deleteError;

    return toDelete; // Retorna os metadados para a Action revalidar caches
  }

  return [];
}
export async function updateGaleriaTagsAction(
  galeria: any, // 🎯 Recebe o objeto completo agora
  photo_tags: any,
  gallery_tags: any,
  supabaseClient?: any,
) {
  const supabase = supabaseClient || (await createSupabaseServerClient());

  try {
    // 1. Apenas executa o update, sem necessidade de .select()
    const { error } = await supabase
      .from('tb_galerias')
      .update({
        photo_tags:
          typeof photo_tags === 'string' ? JSON.parse(photo_tags) : photo_tags,
        gallery_tags:
          typeof gallery_tags === 'string'
            ? JSON.parse(gallery_tags)
            : gallery_tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galeria.id);

    if (error) throw error;

    // 2. Usa os dados do objeto passado para revalidar o cache
    await revalidateGalleryCache({
      galeriaId: galeria.id,
      slug: galeria.slug,
      userId: galeria.user_id,
      username: galeria.photographer?.username,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[updateGaleriaTagsAction] Erro:', error.message);
    return {
      success: false,
      error: error.message || 'Erro ao atualizar marcações.',
    };
  }
}

/**
 * 🎯 BUSCA TODAS AS CATEGORIAS ÚNICAS DAS GALERIAS DE UM PERFIL
 * Traz do banco de dados mesmo que a galeria não esteja na primeira página.
 */
export const getProfileCategories = cache(async (userId: string) => {
  return unstable_cache(
    async (id: string) => {
      const supabase = await createSupabaseClientForCache();

      // Busca apenas a coluna 'category' de todas as galerias do usuário
      const { data, error } = await supabase
        .from('tb_galerias')
        .select('category')
        .eq('user_id', id)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .eq('show_on_profile', true)
        .order('category');

      if (error) {
        console.error('[getProfileCategories] Erro:', error);
        return [];
      }

      // Filtra únicos e remove nulos
      const uniqueIds = Array.from(new Set(data.map((g) => g.category))).filter(
        Boolean,
      );
      return uniqueIds;
    },
    [`profile-categories-${userId}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [`profile-galerias-${userId}`], // Revalida quando uma galeria nova é criada
    },
  )(userId);
});

/**
 * 🎯 SALVA A SELEÇÃO DE FOTOS (IDs) DO CLIENTE
 */
export async function saveGaleriaSelectionAction(
  galeria: Galeria,
  selectionIds: string[],
) {
  const metadata = await getSelectionMetadataAction(
    galeria.drive_folder_id,
    selectionIds,
  );
  const supabase = await createSupabaseServerClient();

  try {
    // 1. Update no banco
    const { data, error, status } = await supabase
      .from('tb_galerias')
      .update({
        // Garante que estamos enviando um array limpo
        selection_ids: Array.isArray(selectionIds) ? selectionIds : [],
        selection_metadata: metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galeria.id)
      .select(); // Adicionamos select para confirmar que houve alteração

    // Se o status for 204 ou data estiver vazio, o RLS bloqueou ou o ID não existe
    if (error) throw error;

    if (!data || data.length === 0) {
      console.error(
        '[saveGaleriaSelectionAction] Nenhuma linha afetada. Verifique as políticas de RLS.',
      );
      return {
        success: false,
        error: 'Permissão negada ou galeria não encontrada.',
      };
    }

    // 2. Revalidação de cache (Usa dados do objeto galeria recebido)
    await revalidateGalleryCache({
      galeriaId: galeria.id,
      slug: galeria.slug,
      userId: galeria.user_id,
      username: galeria.photographer?.username,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[saveGaleriaSelectionAction] Erro Crítico:', error.message);
    return { success: false, error: error.message };
  }
}
