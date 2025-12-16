"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  createSupabaseServerClientReadOnly,
} from "@/lib/supabase.server";
import { listPhotosFromDriveFolder, DrivePhoto } from "@/lib/google-drive";
import { getDriveAccessTokenForUser } from "@/lib/google-auth";

// =========================================================================
// TIPOS AUXILIARES
// =========================================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthContext {
  success: boolean;
  userId: string | null;
  studioId: string | null;
  error?: string;
}

interface GaleriaInputCreate {
  clientName: string;
  clientWhatsapp?: string;
  title: string;
  date: string; // string de formulário, ex: "2025-12-30"
  location?: string;
  driveFolderId: string;
  coverFileId: string;
  isPublic: boolean;
  password?: string | null;
}

interface GaleriaInputUpdate {
  title: string;
  date: string;
  location?: string;
  driveFolderId: string;
  clientName: string;
  clientWhatsapp?: string;
  isPublic: boolean | string;
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
  // relacionamento opcional
  tb_profiles?: {
    username: string;
  };
}

interface GaleriaWithCover extends GaleriaRecord {
  coverImageUrl?: string | null;
}

// Se você tiver uma constante para o nome do cookie de acesso:
const ACCESS_COOKIE_KEY = "galeria_access_";

// =========================================================================
// 1. AUTENTICAÇÃO E CONTEXTO (userId + studioId)
// =========================================================================

/**
 * Obtém o ID do usuário logado (fotógrafo) e o studio_id associado.
 */
async function getAuthAndStudioIds(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClientReadOnly();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      userId: null,
      studioId: null,
      error: "Usuário não autenticado.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("tb_profiles")
    .select("studio_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Erro ao buscar profile do usuário logado:", profileError);
    return {
      success: false,
      userId: null,
      studioId: null,
      error: "Profile do usuário não encontrado ou incompleto.",
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
async function generateUniqueDatedSlug(
  title: string,
  dateStr: string,
  currentId?: string
): Promise<string> {
  const supabase = await createSupabaseServerClient();

  // 1. Obter usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado ao gerar slug.");
  }

  // 2. Buscar username e se usa subdomínio
  const { data: profile, error: profileError } = await supabase
    .from("tb_profiles")
    .select("username, use_subdomain")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Não foi possível carregar o profile do usuário.");
  }

  const username = profile.username;
  const usesSubdomain = profile.use_subdomain === true;

  // 3. Montar partes do slug
  const safeTitle = slugify(title, { lower: true, strict: true, locale: "pt" });
  const datePart = dateStr.substring(0, 10).replace(/-/g, "/");

  // 4. Se NÃO usa subdomínio → incluir username
  const prefix = usesSubdomain ? "" : `${username}/`;

  let baseSlug = `${prefix}${datePart}/${safeTitle}`;
  let uniqueSlug = baseSlug;
  let suffix = 0;

  // 5. Garantir unicidade
  while (true) {
    const { data: existing, error } = await supabase
      .from("tb_galerias")
      .select("id")
      .eq("slug", uniqueSlug)
      .maybeSingle();

    if (error) {
      console.error("Erro ao verificar slug existente:", error);
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

export async function createGaleria(formData: FormData): Promise<ActionResult> {
  const {
    success,
    userId,
    studioId,
    error: authError,
  } = await getAuthAndStudioIds();

  if (!success || !userId || !studioId) {
    return {
      success: false,
      error: authError || "Usuário não autenticado ou profile incompleto.",
    };
  }

  const clientName = (formData.get("clientName") as string) || "";
  const clientWhatsapp = (formData.get("clientWhatsapp") as string) || "";
  const title = (formData.get("title") as string) || "";
  const dateStr = (formData.get("date") as string) || "";
  const location = (formData.get("location") as string) || "";
  const driveFolderId = (formData.get("driveFolderId") as string) || "";
  const coverFileId = (formData.get("coverFileId") as string) || "";
  const isPublicString = (formData.get("isPublic") as string) || "false";
  const isPublic = isPublicString === "true";
  const password = (formData.get("password") as string) || "";

  if (!title || !driveFolderId || !clientName || !dateStr || !coverFileId) {
    return {
      success: false,
      error: "Preencha todos os campos obrigatórios.",
    };
  }

  const slug = await generateUniqueDatedSlug(title, dateStr);

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("tb_galerias").insert({
      user_id: userId,
      studio_id: studioId,
      title,
      slug,
      date: new Date(dateStr).toISOString(),
      location,
      drive_folder_id: driveFolderId,
      client_name: clientName,
      client_whatsapp: clientWhatsapp.replace(/\D/g, "") || null,
      is_public: isPublic,
      password: isPublic ? null : password || null,
      cover_image_url: coverFileId, // se essa for sua coluna
    });

    if (error) throw error;

    revalidatePath("/dashboard");
    return { success: true, message: "Galeria criada com sucesso!", data: {} };
  } catch (err) {
    console.error("Erro real ao salvar no banco:", err);
    return { success: false, error: "Falha ao salvar a nova galeria." };
  }
}

// =========================================================================
// 4. UPDATE GALERIA
// =========================================================================

export async function updateGaleria(
  galeriaId: string,
  data: GaleriaInputUpdate
): Promise<ActionResult> {
  const { success, userId, error: authError } = await getAuthAndStudioIds();

  if (!success || !userId) {
    return { success: false, error: authError || "Usuário não autenticado." };
  }

  if (!galeriaId) {
    return {
      success: false,
      error: "ID da galeria é obrigatório para atualização.",
    };
  }

  const isPublic =
    data.isPublic === true || data.isPublic === "true" ? true : false;

  const newSlug = await generateUniqueDatedSlug(
    data.title,
    data.date,
    galeriaId
  );

  const updateData: Partial<GaleriaRecord> = {
    title: data.title,
    date: new Date(data.date).toISOString(),
    location: data.location || null,
    drive_folder_id: data.driveFolderId,
    client_name: data.clientName,
    client_whatsapp: data.clientWhatsapp
      ? data.clientWhatsapp.replace(/\D/g, "")
      : null,
    is_public: isPublic,
    slug: newSlug,
  };

  if (isPublic) {
    updateData.password = null;
  } else {
    updateData.password = data.password || null;
  }

  try {
    const supabase = createSupabaseServerClient();

    const { error, data: updated } = await supabase
      .from("tb_galerias")
      .update(updateData)
      .eq("id", galeriaId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    revalidatePath("/dashboard");
    redirect("/dashboard");

    return { success: true, data: updated };
  } catch (err) {
    console.error("Erro ao atualizar galeria:", err);
    return { success: false, error: "Falha ao atualizar a galeria." };
  }
}

// =========================================================================
// 5. GET GALERIAS (Apenas do usuário logado)
// =========================================================================

export async function getGalerias(): Promise<ActionResult<GaleriaWithCover[]>> {
  const {
    success,
    userId,
    studioId,
    error: authError,
  } = await getAuthAndStudioIds();

  if (!success || !userId) {
    return {
      success: false,
      error: authError || "Usuário não autenticado.",
      data: [],
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tb_galerias")
      .select(
        `
          *,
          tb_profiles!tb_galerias_user_id_fkey(username)
        `
      )
      .eq("user_id", userId)
      // Se quiser multi-tenant real:
      // .eq("studio_id", studioId)
      .order("date", { ascending: false });

    if (error) throw error;

    const galerias = (data || []) as GaleriaRecord[];

    const galeriasWithCovers: GaleriaWithCover[] = galerias.map((galeria) => ({
      ...galeria,
      coverImageUrl: galeria.cover_image_url || null,
    }));

    return { success: true, data: galeriasWithCovers };
  } catch (err) {
    console.error("Erro ao buscar galerias:", err);
    return {
      success: false,
      error: "Falha ao buscar galerias.",
      data: [],
    };
  }
}

// =========================================================================
// 6. DELETE GALERIA
// =========================================================================

export async function deleteGaleria(id: string): Promise<ActionResult> {
  const { success, userId, error: authError } = await getAuthAndStudioIds();

  if (!success || !userId) {
    return { success: false, error: authError || "Usuário não autenticado." };
  }

  if (!id) {
    return { success: false, error: "ID da galeria não fornecido." };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("tb_galerias")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/dashboard");
    redirect("/dashboard");

    return { success: true };
  } catch (err) {
    console.error("Erro ao deletar galeria:", err);
    return { success: false, error: "Falha ao deletar a galeria." };
  }
}

// =========================================================================
// 7. AUTENTICAÇÃO DE ACESSO À GALERIA POR SENHA (COOKIE)
// =========================================================================

export async function authenticateGaleriaAccess(
  galeriaSlug: string,
  fullSlug: string,
  password: string
): Promise<ActionResult> {
  const supabase = createSupabaseServerClient();

  const { data: galeria, error } = await supabase
    .from("tb_galerias")
    .select("id, password, is_public")
    .eq("slug", galeriaSlug)
    .single();

  if (error || !galeria) {
    return { success: false, error: "Galeria não encontrada." };
  }

  if (galeria.is_public) {
    return {
      success: false,
      error: "Galeria é pública e não requer senha.",
    };
  }

  if (galeria.password === password) {
    const cookieStore = cookies();

    cookieStore.set(ACCESS_COOKIE_KEY + galeria.id, password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: `/galeria/${fullSlug}`,
    });

    redirect(`/galeria/${fullSlug}`);
  }

  return { success: false, error: "Senha incorreta." };
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
  galeriaId: string
): Promise<ActionResult<DrivePhoto[]>> {
  // 1. AUTENTICAÇÃO E CONTEXTO
  const { success, userId, error: authError } = await getAuthAndStudioIds();

  if (!success || !userId) {
    return {
      success: false,
      error: authError || "Usuário não autenticado.",
      data: [],
    };
  }

  const supabase = await createSupabaseServerClientReadOnly();

  // 2. BUSCAR O ID DA PASTA DA GALERIA
  const { data: galeria, error: galeriaError } = await supabase
    .from("tb_galerias")
    .select("drive_folder_id")
    .eq("id", galeriaId)
    .eq("user_id", userId) // RLS: Garante que o usuário só acesse suas próprias galerias
    .maybeSingle();

  if (galeriaError || !galeria || !galeria.drive_folder_id) {
    return {
      success: false,
      error: "Galeria não encontrada ou pasta do Drive não definida.",
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
      error: "Falha na integração Google Drive. Refaça o login/integração.",
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
