"use server";

import { createSupabaseServerClient } from "@/lib/supabase.server";
import { suggestUsernameFromEmail } from "@/utils/userUtils"; // Importe a função que criamos
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Tipagem básica para os dados que vêm do formulário
interface ProfileFormData {
  username: string;
  full_name: string;
  mini_bio: string;
  phone_contact: string;
  instagram_link: string;
  operating_cities: string[];
  profile_picture_url: string;
}

/**
 * Busca o perfil existente do usuário logado.
 */
export async function getProfileData() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redireciona para o login se não estiver autenticado
    redirect("/");
  }

  // Busca o perfil na tb_profiles
  const { data: profile, error } = await supabase
    .from("tb_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  console.log("DEBUG: Perfil Encontrado (Primeiro Login?):", profile);
  console.log("DEBUG: E-mail do Usuário:", user.email);

  if (error) {
    console.error("Erro ao buscar perfil:", error);
    // Retorna um objeto que permite ao frontend continuar
    return {
      user_id: user.id,
      profile: null,
      email: user.email,
      error: error.message,
    };
  }

  // Calcula o username sugerido caso o perfil não exista (primeiro login)
  const suggestedUsername = suggestUsernameFromEmail(user.email);

  return {
    user_id: user.id,
    profile: profile,
    email: user.email,
    suggestedUsername: suggestedUsername,
  };
}

/**
 * Cria ou atualiza o perfil do fotógrafo.
 * @param formData Dados do formulário
 */
export async function upsertProfile(formData: ProfileFormData) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  const {
    username,
    full_name,
    mini_bio,
    phone_contact,
    instagram_link,
    operating_cities,
    profile_picture_url,
  } = formData;

  // 1. Validação de Unicidade do Username (excluindo o usuário atual)
  const { data: existingUser, error: checkError } = await supabase
    .from("tb_profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id) // Ignora o próprio usuário se estiver editando
    .maybeSingle();

  if (existingUser) {
    return { success: false, error: "Este nome de usuário já está em uso." };
  }

  if (checkError) {
    console.error("Erro na verificação de unicidade:", checkError);
    return {
      success: false,
      error: "Erro interno na verificação do nome de usuário.",
    };
  }

  // 2. Inserção ou Atualização (UPSERT)
  // O trigger já criou um registro com ID e studio_id, então fazemos um UPDATE.
  // Usamos o ID do usuário como chave para o UPDATE.
  const { error } = await supabase
    .from("tb_profiles")
    .update({
      username: username,
      full_name: full_name,
      mini_bio: mini_bio,
      phone_contact: phone_contact.replace(/\D/g, "") || null, // Limpa o telefone
      instagram_link: instagram_link,
      operating_cities: operating_cities, // Assumindo que o frontend enviará um array
      profile_picture_url: profile_picture_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id); // Garante que apenas o próprio usuário possa atualizar

  if (error) {
    console.error("Erro ao salvar perfil:", error);
    return { success: false, error: error.message };
  }

  // 3. Revalida e Redireciona
  revalidatePath("/dashboard");
  redirect("/app"); // Redireciona para o App Gateway para re-verificação.
}
