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

// Interface para o objeto de atualização (Evita o erro de 'any')
interface GaleriaUpdatePayload {
  title?: string;
  client_name?: string;
  client_whatsapp?: string | null;
  date?: string;
  location?: string;
  drive_folder_id?: string;
  drive_folder_name?: string;
  cover_image_url?: string;
  is_public?: boolean;
  category?: string;
  has_contracting_client?: boolean;
  password?: string | null;
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

interface GaleriaWithCover extends GaleriaRecord {
  coverImageUrl?: string | null;
}

// Se você tiver uma constante para o nome do cookie de acesso:
const ACCESS_COOKIE_KEY = 'galeria_access_';

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

  // 1. Obter usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado ao gerar slug.');
  }

  // 2. Buscar username e se usa subdomínio
  const { data: profile, error: profileError } = await supabase
    .from('tb_profiles')
    .select('username, use_subdomain')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Não foi possível carregar o profile do usuário.');
  }

  const username = profile.username;
  const usesSubdomain = profile.use_subdomain === true;

  // 3. Montar partes do slug
  const safeTitle = slugify(title, { lower: true, strict: true, locale: 'pt' });
  const datePart = dateStr.substring(0, 10).replace(/-/g, '/');

  // 4. Se NÃO usa subdomínio → incluir username
  const prefix = usesSubdomain ? '' : `${username}/`;

  const baseSlug = `${prefix}${datePart}/${safeTitle}`;
  let uniqueSlug = baseSlug;
  let suffix = 0;

  // 5. Garantir unicidade
  while (true) {
    const { data: existing, error } = await supabase
      .from('tb_galerias')
      .select('id')
      .eq('slug', uniqueSlug)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar slug existente:', error);
      break;
    }

    if (!existing || (currentId && existing.id === currentId)) {
      return uniqueSlug;
    }

    suffix++;
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

  // 1. Tentar tornar a pasta pública no Google Drive - não utilizada, pois o escopo é somente de leitura do drive - 01-01-2026
  /*const accessToken = await getDriveAccessTokenForUser(userId);
  if (accessToken) {
    try {
      await makeFolderPublicLib(driveFolderId, accessToken);
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Erro desconhecido';
      console.warn('Google Drive Permission Warning:', errorMsg);
      // Não interrompemos o fluxo, apenas logamos.
    }
  }*/

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

  // Capturando conforme os nomes definidos no Modal (data.set)
  const title = formData.get('title') as string;
  const driveFolderId = formData.get('drive_folder_id') as string; // era driveFolderId
  const clientName = formData.get('clientName') as string;

  // Log para debug caso falte algo
  if (!title || !driveFolderId || !clientName) {
    console.log('Validação falhou:', { title, driveFolderId, clientName });
    return { success: false, error: 'Campos obrigatórios ausentes.' };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // GARANTE PERMISSÃO NO DRIVE  - não utilizada, pois o escopo é somente de leitura do drive - 01-01-2026
    /*const accessToken = await getDriveAccessTokenForUser(userId);
    if (accessToken && driveFolderId) {
      try {
        await makeFolderPublicLib(driveFolderId, accessToken);
      } catch (e) {
        console.warn('Aviso: Falha ao atualizar permissões da pasta no Drive.');
      }
    }*/

    // Montando o objeto de update com os nomes corretos do FormData
    const updates = {
      title,
      client_name: clientName,
      client_whatsapp:
        (formData.get('client_whatsapp') as string)?.replace(/\D/g, '') || null,
      date: new Date(formData.get('date') as string).toISOString(),
      location: formData.get('location') as string,
      drive_folder_id: driveFolderId,
      drive_folder_name: formData.get('drive_folder_name') as string, // era driveFolderName
      cover_image_url: formData.get('cover_image_url') as string, // era coverFileId
      is_public: formData.get('is_public') === 'true', // era isPublic
      category: (formData.get('category') as string) || 'esporte',
      has_contracting_client: formData.get('has_contracting_client') as string,
    };

    // Lógica da senha: só atualiza se for enviado algo no campo password
    const newPassword = formData.get('password') as string;
    if (formData.get('is_public') === 'true') {
      (updates as any).password = null;
    } else if (newPassword && newPassword.trim() !== '') {
      (updates as any).password = newPassword;
    }
    // Se is_public for false e password for nulo/vazio, o Supabase mantém a senha antiga
    // porque não incluímos o campo 'password' no objeto 'updates'.

    const { error } = await supabase
      .from('tb_galerias')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, message: 'Galeria atualizada com sucesso!' };
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
): Promise<ActionResult<GaleriaWithCover[]>> {
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
    const { data, error } = await supabase
      .from('tb_galerias')
      .select(
        `
          *,
          tb_profiles!tb_galerias_user_id_fkey(username)
        `,
      )
      .eq('user_id', userId)
      // Se quiser multi-tenant real:
      // .eq("studio_id", studioId)
      .order('date', { ascending: false });

    if (error) throw error;

    const galerias = (data || []) as GaleriaRecord[];

    const galeriasWithCovers: GaleriaWithCover[] = galerias.map((galeria) => ({
      ...galeria,
      coverImageUrl: galeria.cover_image_url || null,
    }));

    return { success: true, data: galeriasWithCovers };
  } catch (err) {
    console.error('Erro ao buscar galerias:', err);
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
export async function deleteGaleria(
  id: string,
  supabaseClient?: any,
): Promise<ActionResult> {
  try {
    const supabase = supabaseClient || (await createSupabaseServerClient());
    const { userId } = await getAuthAndStudioIds(supabase);
    const { error } = await supabase
      .from('tb_galerias')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    // Atualiza o cache do servidor para a rota do dashboard
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Galeria movida para a lixeira com sucesso!',
    };
  } catch (err) {
    console.error('Erro ao deletar galeria:', err);
    return { success: false, error: 'Não foi possível excluir a galeria.' };
  }
}
// =========================================================================
// 7. AUTENTICAÇÃO DE ACESSO À GALERIA POR SENHA (COOKIE)
// =========================================================================

export async function authenticateGaleriaAccess(
  galeriaId: string,
  fullSlug: string,
  password: string,
) {
  const supabase = await createSupabaseServerClientReadOnly();

  // 1. Busca a galeria para validar a senha
  const { data: galeria, error } = await supabase
    .from('tb_galerias')
    .select('password')
    .eq('id', galeriaId)
    .single();

  if (error || !galeria) {
    return { success: false, error: 'Galeria não encontrada.' };
  }

  // 2. Valida a senha
  if (galeria.password !== password) {
    return { success: false, error: 'Senha incorreta. Tente novamente.' };
  }

  // 3. Define o Cookie de Acesso
  // O nome do cookie deve bater com o que a page.tsx procura: `galeria-${id}-auth`
  const cookieStore = await cookies();
  cookieStore.set(`galeria-${galeriaId}-auth`, password, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // Acesso por 24 horas
    sameSite: 'lax',
  });

  // 4. Redireciona para a mesma página para disparar o re-render do Servidor
  // Agora o Servidor vai ler o cookie e liberar o acesso
  redirect(`/${fullSlug}`);
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
      error: 'Galeria não encontrada ou pasta do Drive não definida.',
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

  if (photos.length === 0) {
    return { success: true, data: [] }; // Retorna sucesso, mas com lista vazia.
  }

  return { success: true, data: photos };
}
