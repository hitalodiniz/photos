"use server"; 

import { cookies } from 'next/headers'; 
import { redirect } from 'next/navigation';
import slugify from 'slugify';

import { createSupabaseServerClient } from "@/lib/supabase.server"; 
import { createSupabaseDbClient } from "@/lib/supabase.db"; 
import { suggestUsernameFromEmail } from "@/utils/userUtils"; 
import { revalidatePath } from "next/cache"

// =========================================================================
// FUNÇÕES AUXILIARES DE DADOS
// =========================================================================

/**
 * Obtém o ID do usuário (fotógrafo) logado e o studio_id associado.
 * @returns {object} { userId: string, studioId: string } ou { null }
 */
async function getAuthAndStudioIds() {
    // 1. INICIALIZAÇÃO: Usa o cliente centralizado que já trata a leitura do cookie
    const supabase = createSupabaseServerClient(); 
    
    // 2. Obtém a SESSÃO e o JWT
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
        return { success: false, error: "Usuário não autenticado." };
    }

    // Busca o profile para obter o studio_id e o username (para segurança e RLS)
    const { data: profile, error } = await supabase
        .from('tb_profiles')
        .select('studio_id')
        .eq('id', user.id)
        .single();
    
    if (error || !profile) {
        // Se o usuário estiver autenticado, mas não tiver profile, algo está errado
        console.error("Erro ao buscar profile do usuário logado:", error);
        return { userId: null, studioId: null };
    }

    return { userId: user.id, studioId: profile.studio_id };
}


// Função para gerar o slug no formato AAAA/MM/DD/titulo-galeria
async function generateUniqueDatedSlug(title: string, dateStr: string, currentId?: string): Promise<string> {
    const supabase = createSupabaseServerClient();
    const safeTitle = slugify(title, { lower: true, strict: true, locale: 'pt' });
    const datePart = dateStr.substring(0, 10).replace(/-/g, '/');
    
    let baseSlug = `${datePart}/${safeTitle}`;
    let uniqueSlug = baseSlug;
    let suffix = 0;

    while (true) {
        const query = supabase
            .from('tb_galerias')
            .select('id')
            .eq('slug', uniqueSlug)
            .maybeSingle(); // Retorna 1 ou 0
        
        const { data: existing } = await query;
        
        // Se a galeria não existe OU se o ID existente é o ID que estamos editando
        if (!existing || (currentId && existing.id === currentId)) {
            return uniqueSlug;
        }

        // Se o slug já existe e não é o atual, adiciona um sufixo
        suffix++;
        uniqueSlug = `${baseSlug}-${suffix}`;
    }
}


// =========================================================================
// 1. CREATE GALERIA
// =========================================================================

export async function createGaleria(formData: FormData) {
    const { userId, studioId } = await getAuthAndStudioIds();

    if (!userId || !studioId) {
        return { success: false, error: "Usuário não autenticado ou profile incompleto." };
    }

    // --- Extração de dados ---
    const clientName = formData.get('clientName') as string;
    const clientWhatsapp = formData.get('clientWhatsapp') as string;
    const title = formData.get('title') as string;
    const dateStr = formData.get('date') as string;
    const location = formData.get('location') as string;
    const driveFolderId = formData.get('driveFolderId') as string;
    const isPublicString = formData.get('isPublic') as string;
    const isPublic = isPublicString === 'true'; 
    const password = formData.get('password') as string;
    
    if (!title || !driveFolderId || !clientName || !dateStr) {
        return { success: false, error: "Preencha todos os campos obrigatórios." };
    } 

    const slug = await generateUniqueDatedSlug(title, dateStr);

    try {
        const supabase = createSupabaseServerClient();
        
        const { error } = await supabase
            .from('tb_galerias')
            .insert({
                user_id: userId,        // INJETADO
                studio_id: studioId,    // INJETADO
                title: title,
                slug: slug,
                date: new Date(dateStr).toISOString(), 
                location: location,
                drive_folder_id: driveFolderId,
                client_name: clientName, 
                client_whatsapp: clientWhatsapp.replace(/\D/g, '') || null,
                is_public: isPublic, 
                password: isPublic ? null : password,
            });
        
        if (error) throw error;
        
        // Revalidação do cache (substitui o redirect antigo)
        redirect('/dashboard'); 
        
    } catch (error) {
        console.error('Erro ao salvar no banco:', error);
        return { success: false, error: "Falha ao salvar a nova galeria." };
    }
}


// =========================================================================
// 2. UPDATE GALERIA
// =========================================================================

export async function updateGaleria(galeriaId: string, data: any) {
    const { userId } = await getAuthAndStudioIds();
    
    if (!userId) {
        return { success: false, error: "Usuário não autenticado." };
    }
    if (!galeriaId) {
        return { success: false, error: "ID da galeria é obrigatório para atualização." };
    }

    const isPublic = data.isPublic === true || data.isPublic === 'true'; 
    const newSlug = await generateUniqueDatedSlug(data.title, data.date, galeriaId);

    const updateData: any = {
        title: data.title,
        date: new Date(data.date).toISOString(), 
        location: data.location,
        drive_folder_id: data.driveFolderId,
        client_name: data.clientName,
        client_whatsapp: data.clientWhatsapp ? data.clientWhatsapp.replace(/\D/g, '') : null, 
        is_public: isPublic,
        slug: newSlug,
    };

    if (isPublic) {
        updateData.password = null;
    } else {
        updateData.password = data.password; 
    }
    
    try {
        const supabase = createSupabaseServerClient();
        
        // NOVO: Adicionamos o eq('user_id', userId) na cláusula where
        // Isso garante que apenas o dono da galeria possa atualizá-la (mesmo com RLS desabilitado).
        const { error, count } = await supabase
            .from('tb_galerias')
            .update(updateData)
            .eq('id', galeriaId)
            .eq('user_id', userId) 
            .select()
            .maybeSingle();

        if (error) throw error;
        // if (!count) throw new Error("Acesso negado ou galeria não encontrada."); // Se quiser verificar se o update realmente ocorreu

        // O redirect é usado após o update para forçar a revalidação da lista de galerias no admin
        redirect('/dashboard'); 

    } catch (error) {
        console.error('Erro ao atualizar galeria:', error);
        return { success: false, error: "Falha ao atualizar a galeria." };
    }
}


// =========================================================================
// 3. GET GALERIAS (Buscando apenas as do usuário logado)
// =========================================================================

export async function getGalerias() {
    const { userId } = await getAuthAndStudioIds();

    if (!userId) {
        // Se não houver userId, retorna vazio para evitar erros
        return { success: false, error: "Usuário não autenticado." };
    }

    try {
        const supabase = createSupabaseServerClient();
        
        // NOVO: Filtra as galerias pelo user_id logado
        const { data: galerias, error } = await supabase
            .from('tb_galerias')
            .select(`
                *, 
                tb_profiles!tb_galerias_user_id_fkey(username) 
            `) // Busca o username do dono da galeria (opcional, mas útil)
            .eq('user_id', userId)
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        // Adapta o retorno (removendo a lógica de simulação de capa)
        const galeriasWithCovers = galerias.map(galeria => ({
            ...galeria,
            // O Supabase retorna a data como ISO string, mas mantemos o nome original da coluna
            date: galeria.date, 
            coverImageUrl: galeria.cover_image_url, 
            // O clientWrapper.tsx usa date.toISOString(), então podemos retornar a data como está, 
            // já que ela é uma string ISO-8601 do Supabase.
        }));

        return galeriasWithCovers;
    } catch (error) {
        console.error('Erro ao buscar galerias:', error);
        return [];
    }
}


// =========================================================================
// 4. DELETE GALERIA
// =========================================================================

export async function deleteGaleria(id: string) {
    const { userId } = await getAuthAndStudioIds();

    if (!userId) {
        return { success: false, error: "Usuário não autenticado." };
    }
    if (!id) {
        return { success: false, error: "ID da galeria não fornecido." };
    }
    
    try {
        const supabase = createSupabaseServerClient();
        
        // NOVO: Garante que apenas o dono possa deletar
        const { error } = await supabase
            .from('tb_galerias')
            .delete()
            .eq('id', id)
            .eq('user_id', userId); // Essencial para segurança
        
        if (error) throw error;

        // Redireciona para revalidar
        redirect('/dashboard'); 

    } catch (error) {
        console.error('Erro ao deletar galeria:', error);
        return { success: false, error: "Falha ao deletar a galeria." };
    }
}

// =========================================================================
// 5. AUTENTICAÇÃO DE ACESSO (Funcionalidade de Cookie)
// =========================================================================

export async function authenticateGaleriaAccess(galeriaSlug: string, fullSlug: string, password: string) {
    const supabase = createSupabaseServerClient();

    // 1. Busca a galeria e a senha real do banco (apenas buscando pelo slug)
    const { data: galeria, error } = await supabase
        .from('tb_galerias')
        .select('id, password, is_public')
        .eq('slug', galeriaSlug) // Busca pelo slug, que é único
        .single();
    
    if (error || !galeria) {
        return { success: false, error: "Galeria não encontrada." };
    }
    
    if (galeria.is_public) {
         return { success: false, error: "Galeria é pública e não requer senha." };
    }
    
    if (galeria.password === password) {
        
        // 2. Define o COOKIE de acesso no lado do servidor
        cookies().set(ACCESS_COOKIE_KEY + galeria.id, password, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 dia
            path: `/galeria/${fullSlug}`,
        });
        
        // 3. Redireciona
        redirect(`/galeria/${fullSlug}`); 
        
    } else {
        return { success: false, error: "Senha incorreta." };
    }
}