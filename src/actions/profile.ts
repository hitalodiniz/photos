"use server";

import { createSupabaseDbClient } from "@/lib/supabase.db";
import { suggestUsernameFromEmail } from "@/utils/userUtils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr"; // Use a versão limpa
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase.server";
// --------------------------------------------------------------------------
// 🔑 FUNÇÃO DE LEITURA (getProfileData) - CORRIGIDA
// --------------------------------------------------------------------------

/**
 * Busca o perfil existente do usuário logado de forma segura, usando o JWT para autenticar a consulta SQL.
 */
export async function getProfileData() {
  const cookieStore = cookies(); // Chamada síncrona

  // 1. INICIALIZAÇÃO: Usa o cliente centralizado que já trata a leitura do cookie
  const supabase = createSupabaseServerClient();

  // 2. Obtém a SESSÃO e o JWT
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  // 2. CRIA CLIENTE COM JWT (Garante que a QUERY SQL é autenticada)
  // 3. Busca o perfil na tb_profiles
  const { data: profile, error } = await supabase // 🚨 Usa o cliente DB autenticado
    .from("tb_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar perfil:", error);
    return {
      user_id: user.id,
      profile: null,
      email: user.email,
      error: error.message,
    };
  }

  const suggestedUsername = suggestUsernameFromEmail(user.email);

  return {
    user_id: user.id,
    profile: profile,
    email: user.email,
    suggestedUsername: suggestedUsername,
  };
}

// --------------------------------------------------------------------------
// 💾 FUNÇÃO DE ESCRITA (upsertProfile) - CORRIGIDA E INTEGRADA
// --------------------------------------------------------------------------

/**
 * Cria ou atualiza o perfil do fotógrafo de forma robusta (UPSERT), incluindo o upload de arquivo.
 */
export async function upsertProfile(formData: FormData) {
  console.log("formData received in upsertProfile:", formData);
  // 1. INICIALIZAÇÃO: Usa o cliente centralizado que já trata a leitura do cookie
  const supabase = createSupabaseServerClient();
  console.log("Supabase client created in upsertProfile.");
  // 2. Obtém a SESSÃO e o JWT
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("upsertProfile called by user:", user);
  if (!user) {
    console.error("Usuário não autenticado.");

    return { success: false, error: "Usuário não autenticado." };
  }

  // 3. EXTRAÇÃO DE DADOS
  const username = formData.get("username") as string;
  const full_name = formData.get("full_name") as string;
  const mini_bio = formData.get("mini_bio") as string;
  const phone_contact = formData.get("phone_contact") as string;
  const instagram_link = formData.get("instagram_link") as string;
  const operating_cities_str = formData.get("operating_cities_str") as string;

  let profile_picture_url = formData.get(
    "profile_picture_url_existing"
  ) as string;
  const profilePictureFile = formData.get("profile_picture_file") as File;

  // 4. UPLOAD DA FOTO (SE HOUVER NOVO ARQUIVO)
  if (profilePictureFile && profilePictureFile.size > 0) {
    const bucket = "profile_pictures";
    // Remove espaços e garante minúsculas para segurança do nome do arquivo
    const fileName = `avatar.${profilePictureFile.name.split(".").pop()}`
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
    // Caminho: id_do_usuario/avatar.extensão
    const filePath = `${user.id}/${fileName}`;

    // Upload
    const { error: uploadError } = await supabase.storage // Usa supabaseAuth para Storage
      .from(bucket)
      .upload(filePath, profilePictureFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Erro no upload da foto:", uploadError);
      return {
        success: false,
        error: "Falha ao enviar a foto de perfil: " + uploadError.message,
      };
    }

    // Obter URL Público
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    profile_picture_url = publicUrl;
  }

  // 5. VALIDAÇÃO E UPSERT

  // Validação de Unicidade do Username
  const { data: existingUser, error: checkError } = await supabase // 🚨 Usa supabaseDb autenticado
    .from("tb_profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (existingUser) {
    console.error("Este nome de usuário já está em uso.");

    return { success: false, error: "Este nome de usuário já está em uso." };
  }

  if (checkError) {
    console.error("Erro na verificação de unicidade:", checkError);

    return {
      success: false,
      error: "Erro interno na verificação do nome de usuário.",
    };
  }

  const operating_cities = operating_cities_str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // ATUALIZAÇÃO (UPSERT)
  const { error } = await supabase
    .from("tb_profiles")
    .update({
      // Não precisamos passar o ID aqui, pois usamos .eq() para identificação
      username: username,
      full_name: full_name,
      mini_bio: mini_bio,
      phone_contact: phone_contact.replace(/\D/g, "") || null,
      instagram_link: instagram_link,
      operating_cities: operating_cities,
      profile_picture_url: profile_picture_url,
      updated_at: new Date().toISOString(),
    })
    // 🔑 O filtro .eq() identifica a linha a ser atualizada
    .eq("id", user.id)
    .select();

  if (error) {
    // Se o perfil não existir, o erro será "no rows updated" ou similar,
    // mas o Supabase não retorna um erro HTTP/400 se zero linhas forem afetadas.
    console.error("Erro ao atualizar perfil (UPDATE):", error);
    return {
      success: false,
      error: "Erro ao atualizar perfil (UPDATE):" + error.message,
    };
  }

  // 6. Revalida e Redireciona
  revalidatePath("/dashboard");
  redirect("/app");
}
