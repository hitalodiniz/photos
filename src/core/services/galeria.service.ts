'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import slugify from 'slugify';
import { revalidatePath } from 'next/cache';

import {
  createSupabaseServerClient,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';
import {
  DrivePhoto,
  listPhotosFromDriveFolder,
  //makeFolderPublic as makeFolderPublicLib,
} from '@/lib/google-drive';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { formatGalleryData } from '@/core/logic/galeria-logic';
import { Galeria } from '@/core/types/galeria';
import { SignJWT } from 'jose';

// =========================================================================
// TIPOS AUXILIARES
// =========================================================================

interface AuthContext {
  success: boolean;
  userId: string | null;
  studioId: string | null;
  error?: string;
}
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface GaleriaRecord {
  id: string;
  user_id: string;
  studio_id: string;
  title: string;
  slug: string;
  date: string; // ISO string vinda do Supabase
  location: string | null;
  drive_folder_id: string;
  client_name: string;
  client_whatsapp: string | null;
  is_public: boolean;
  password: string | null;
  cover_image_url?: string | null;
  category: string;
  has_contracting_client: boolean;
  // relacionamento opcional
  tb_profiles?: {
    username: string;
  };
}

// =========================================================================
// 1. AUTENTICAÇÃO E CONTEXTO (userId + studioId)
// =========================================================================

/**
 * Obtém o ID do usuário logado (fotógrafo) e o studio_id associado.
 */
async function getAuthAndStudioIds(supabaseClient?: any): Promise<AuthContext> {
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
/*
export async function createGaleria(
  formData: FormData,
  supabaseClient?: any,
): Promise<ActionResult> {
  const {
    success,
    userId,
    studioId,
    error: authError,
  } = await getAuthAndStudioIds(supabaseClient);

  if (!success || !userId || !studioId) {
    return { success: false, error: authError || 'Não autenticado.' };
  }

  // Extração segura dos dados
  const title = String(formData.get('title') || '');
  const driveFolderId = String(formData.get('drive_folder_id') || '');
  const dateStr = String(formData.get('date') || '');

  if (!title || !driveFolderId || !dateStr) {
    return {
      success: false,
      error: 'Título, Data e Pasta do Drive são obrigatórios.',
    };
  }

  const slug = await generateUniqueDatedSlug(
    title,
    dateStr,
    undefined,
    supabaseClient,
  );

  try {
    const supabase = supabaseClient || (await createSupabaseServerClient());
    const isPublic = formData.get('is_public') === 'true';

    const { error } = await supabase.from('tb_galerias').insert({
      user_id: userId,
      studio_id: studioId,
      title,
      slug,
      date: new Date(dateStr).toISOString(),
      location: String(formData.get('location') || ''),
      drive_folder_id: driveFolderId,
      drive_folder_name: String(formData.get('drive_folder_name') || ''),
      client_name: String(formData.get('clientName') || ''),
      client_whatsapp:
        String(formData.get('client_whatsapp') || '').replace(/\D/g, '') ||
        null,
      is_public: isPublic,
      password: isPublic
        ? null
        : String(formData.get('password') || '') || null,
      cover_image_url: String(formData.get('cover_image_url') || ''),
      category: String(formData.get('category') || 'esporte'),
      has_contracting_client: formData.get('has_contracting_client') === 'true',
    });

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Galeria criada com sucesso!' };
  } catch (err) {
    console.error('Erro ao salvar galeria:', err);
    return {
      success: false,
      error: 'Erro interno ao salvar no banco de dados.',
    };
  }
}*/

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
      client_name: (formData.get('client_name') as string) || 'Cobertura',
      client_whatsapp: (formData.get('client_whatsapp') as string)?.replace(
        /\D/g,
        '',
      ),
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

      // Senha inicial (se houver)
      password:
        formData.get('is_public') === 'true'
          ? null
          : (formData.get('password') as string),
    };

    const { error } = await supabase.from('tb_galerias').insert([data]);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Nova galeria criada com sucesso!' };
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
      client_name: (formData.get('client_name') as string) || 'Cobertura',
      client_whatsapp: (formData.get('client_whatsapp') as string)?.replace(
        /\D/g,
        '',
      ),
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

    const { error } = await supabase
      .from('tb_galerias')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Galeria refinada com sucesso!' };
  } catch (error) {
    console.error('Erro no update:', error);
    return { success: false, error: 'Falha ao atualizar a galeria.' };
  }
}
// =========================================================================
// 5. GET GALERIAS (Apenas do usuário logado)
// =========================================================================

export async function getGalerias(
  supabaseClient?: any,
): Promise<ActionResult<Galeria[]>> {
  // Alterado para retornar Galeria[]
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

  try {
    const supabase = supabaseClient || (await createSupabaseServerClient());

    // 🎯 AJUSTE NO SELECT: Agora traz todos os campos necessários do perfil
    const { data, error } = await supabase
      .from('tb_galerias')
      .select(
        `
        *,
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
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    // AJUSTE NO MAP: Usa a função formatGalleryData para garantir que o objeto photographer exista
    // Importe a formatGalleryData aqui
    const galeriasFormatadas = (data || []).map((raw) =>
      formatGalleryData(raw as any, raw.photographer?.username || ''),
    );

    return { success: true, data: galeriasFormatadas };
  } catch (error) {
    console.error('Erro ao buscar galerias:', error);

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

export async function authenticateGaleriaAccess(
  galeriaId: string,
  fullSlug: string,
  passwordInput: string,
) {
  const supabase = await createSupabaseServerClientReadOnly();

  // 1. Busca a galeria
  const { data: galeria, error: fetchError } = await supabase
    .from('tb_galerias')
    .select(
      'id, password, user_id, tb_profiles!user_id(username, use_subdomain)',
    )
    .eq('id', galeriaId)
    .single();

  if (fetchError || !galeria || galeria.password !== passwordInput) {
    return { success: false, error: 'Senha incorreta.' };
  }

  // 2. Configuração da Secret
  const secretString = process.env.JWT_GALLERY_SECRET;
  if (!secretString) {
    console.error('ERRO: JWT_GALLERY_SECRET não configurada.');
  }

  const secretKey = new TextEncoder().encode(
    secretString || 'chave-padrao-de-seguranca-minimo-32-caracteres',
  );

  // 3. Geração do Token
  let token;
  try {
    token = await new SignJWT({ galeriaId: String(galeria.id) })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);
  } catch (jwtError) {
    console.error('Erro ao assinar JWT:', jwtError);
    return { success: false, error: 'Erro interno ao gerar acesso.' };
  }

  // 4. Salva o Cookie
  const cookieStore = await cookies();
  cookieStore.set(`galeria-${galeriaId}-auth`, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  });

  // 5. Lógica de Redirecionamento
  const profile = galeria.tb_profiles as any;
  let targetPath = fullSlug.startsWith('/') ? fullSlug : `/${fullSlug}`;

  if (profile?.use_subdomain) {
    // Remove o username do path se for subdomínio
    const usernamePrefix = `${profile.username}/`;
    if (targetPath.includes(usernamePrefix)) {
      targetPath = targetPath.replace(usernamePrefix, '');
    }
  }

  // IMPORTANTE: O redirect deve estar FORA de qualquer bloco try/catch
  redirect(targetPath);
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

    // 3. RENOVAR O ACCESS TOKEN
    // Esta função (em lib/google-auth.ts) busca o refresh token no DB e o troca por um novo access token.
    const accessToken = await getDriveAccessTokenForUser(userId);

    if (!accessToken) {
      return {
        success: false,
        error: 'Falha na integração Google Drive. Refaça o login/integração.',
        data: [],
      };
    }

    // 4. LISTAR FOTOS DO DRIVE
    // Esta função (em lib/google-drive.ts) faz a requisição final ao Google Drive.
    const photos = await listPhotosFromDriveFolder(driveFolderId, accessToken);

    // Ordenação: Data (mais recente) > Nome (alfabético)
    photos.sort((a, b) => {
      // Cast para any para garantir acesso caso a interface importada de lib/google-drive esteja desatualizada
      const pA = a as any;
      const pB = b as any;

      const dateAStr = pA.createdTime || pA.imageMediaMetadata?.time;
      const dateBStr = pB.createdTime || pB.imageMediaMetadata?.time;

      const dateA = dateAStr ? new Date(dateAStr).getTime() : 0;
      const dateB = dateBStr ? new Date(dateBStr).getTime() : 0;

      if (dateA !== dateB) return dateB - dateA; // Data: Decrescente
      return a.name.localeCompare(b.name, undefined, { numeric: true }); // Nome: Crescente
    });

    if (photos.length === 0) {
      return { success: true, data: [] }; // Retorna sucesso, mas com lista vazia.
    }

    return { success: true, data: photos };
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

    const { data, error } = await supabase
      .from('tb_galerias')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single(); // Use single para garantir que pegamos o objeto atualizado

    if (error) throw error;

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

    const { error } = await supabase
      .from('tb_galerias')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Galeria excluída permanentemente.' };
  } catch (error: any) {
    console.error('Erro ao excluir permanentemente:', error);
    return { success: false, error: 'Erro ao excluir permanentemente' };
  }
}
