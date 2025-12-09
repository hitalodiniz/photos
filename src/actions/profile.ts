// src/actions/profile.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase.server";
import { createSupabaseDbClient } from "@/lib/supabase.db"; 
import { suggestUsernameFromEmail } from "@/utils/userUtils"; 
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// --- Tipagem ---
interface ProfileFormData {
    username: string;
    full_name: string;
    mini_bio: string;
    phone_contact: string;
    instagram_link: string;
    operating_cities: string[];
    profile_picture_url: string;
}

// --------------------------------------------------------------------------
// 🔑 FUNÇÃO DE LEITURA (Usada pelo OnboardingPage)
// --------------------------------------------------------------------------

/**
 * Busca o perfil existente do usuário logado de forma segura, usando o JWT para autenticar a consulta SQL.
 */
export async function getProfileData() {
    const supabase = createSupabaseServerClient();
    
    // Obtém a sessão do usuário logado
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { userId: null, studioId: null };
    }
    
    // 3. Busca o perfil na tb_profiles
    const { data: profile, error } = await supabaseDb
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

    // Calcula o username sugerido caso o perfil não exista (primeiro login)
    const suggestedUsername = suggestUsernameFromEmail(user.email);

    return {
        user_id: user.id,
        profile: profile, // Será nulo se for o primeiro login, mas a função não falha.
        email: user.email,
        suggestedUsername: suggestedUsername,
    };
}

// --------------------------------------------------------------------------
// 💾 FUNÇÃO DE ESCRITA (Usada pelo OnboardingForm.tsx)
// --------------------------------------------------------------------------

/**
 * Cria ou atualiza o perfil do fotógrafo de forma robusta (UPSERT).
 */
export async function upsertProfile(formData: ProfileFormData) {
    // 1. Obtém a SESSÃO e o JWT
    const supabaseAuth = createSupabaseServerClient(); 
    const { data: { session, user } } = await supabaseAuth.auth.getSession();

    if (!user || !session) {
        return { success: false, error: "Usuário não autenticado." };
    }
    
    // 2. CRIA CLIENTE COM JWT para todas as operações de banco de dados (Escrita Segura)
    const supabaseDb = createSupabaseDbClient(session.access_token); 

    const {
        username,
        full_name,
        mini_bio,
        phone_contact,
        instagram_link,
        operating_cities,
        profile_picture_url,
    } = formData;

    // 3. Validação de Unicidade do Username (Usando o cliente DB autenticado)
    const { data: existingUser, error: checkError } = await supabaseDb
        .from("tb_profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id) 
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

    // 4. INSERÇÃO OU ATUALIZAÇÃO (UPSERT)
    const { error } = await supabaseDb
        .from("tb_profiles")
        .upsert({ 
            id: user.id, // Chave primária necessária para o upsert
            username: username,
            full_name: full_name,
            mini_bio: mini_bio,
            phone_contact: phone_contact.replace(/\D/g, "") || null, 
            instagram_link: instagram_link,
            operating_cities: operating_cities, 
            profile_picture_url: profile_picture_url,
            updated_at: new Date().toISOString(),
        })
        .select(); 

    if (error) {
        console.error("Erro ao salvar perfil (UPSERT):", error);
        return { success: false, error: error.message };
    }

    // 5. Revalida e Redireciona
    revalidatePath("/dashboard");
    redirect("/app"); 
}