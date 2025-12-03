"use server"; 

import { prisma } from '@/lib/db';
import slugify from 'slugify';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers'; // Necessário para Server Actions que manipulam cookies


// Chave do cookie (deve ser consistente em todo o projeto)
const ACCESS_COOKIE_KEY = 'galeria_acesso_'; 

// =========================================================================
// FUNÇÕES AUXILIARES
// =========================================================================

// Função para gerar o slug no formato AAAA/MM/DD/titulo-galeria
async function generateUniqueDatedSlug(title: string, dateStr: string, currentId?: string): Promise<string> {
    const safeTitle = slugify(title, { lower: true, strict: true, locale: 'pt' });
    const datePart = dateStr.substring(0, 10).replace(/-/g, '/'); // Transforma YYYY-MM-DD em YYYY/MM/DD
    
    let baseSlug = `${datePart}/${safeTitle}`;
    let uniqueSlug = baseSlug;
    let suffix = 0;

    // Garante que o slug seja único no banco de dados
    while (true) {
        const existing = await prisma.galeria.findUnique({ where: { slug: uniqueSlug } });
        
        // Se a galeria não existe OU se existe mas é a própria galeria que estamos editando, o slug é único.
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

/**
 * Server Action para criar uma nova galeria e salvar no banco de dados.
 */
export async function createGaleria(formData: FormData) {
    
    // --- Extração de dados ---
    const clientName = formData.get('clientName') as string;
    const clientWhatsapp = formData.get('clientWhatsapp') as string;
    const title = formData.get('title') as string;
    const dateStr = formData.get('date') as string;
    const location = formData.get('location') as string;
    const driveFolderId = formData.get('driveFolderId') as string;
    
    const isPublicString = formData.get('isPublic') as string;
    const isPublic = isPublicString === 'true'; // Converte para boolean
    
    const password = formData.get('password') as string;
    
    // Validação básica
    if (!title || !driveFolderId || !clientName) {
        return { success: false, error: "Preencha todos os campos obrigatórios." };
    } 

    // NOVO: Geração do slug formatado (AAAA/MM/DD/titulo)
    const slug = await generateUniqueDatedSlug(title, dateStr);

    try {
      await prisma.galeria.create({
        data: {
          title,
          slug,
          date: new Date(dateStr), 
          location,
          driveFolderId,
          clientName: clientName, 
          clientWhatsapp: clientWhatsapp.replace(/\D/g, '') || null,
          isPublic: isPublic, 
          password: isPublic ? null : password,
        },
      });
      
      return { success: true, slug: slug, message: `Galeria '${title}' criada com sucesso!` };
    } catch (error) {
      console.error('Erro ao salvar no banco:', error);
      return { success: false, error: "Falha ao salvar a nova galeria." };
    }
}

// =========================================================================
// 2. UPDATE GALERIA
// =========================================================================

/**
 * Server Action para atualizar uma galeria existente.
 * @param galeriaId O ID da galeria a ser atualizada.
 * @param data Os dados a serem atualizados (vindos do modal de edição).
 */
export async function updateGaleria(galeriaId: string, data: any) {
    if (!galeriaId) {
        return { success: false, error: "ID da galeria é obrigatório para atualização." };
    }

    const isPublic = data.isPublic === true || data.isPublic === 'true'; 

    // GERA O NOVO SLUG SE O TÍTULO OU DATA TIVEREM MUDADO
    const newSlug = await generateUniqueDatedSlug(data.title, data.date, galeriaId);

    // Prepara o objeto de dados a ser enviado ao Prisma
    const updateData: any = {
        title: data.title,
        date: new Date(data.date), // Data é obrigatória no formulário
        location: data.location,
        driveFolderId: data.driveFolderId,
        clientName: data.clientName,
        clientWhatsapp: data.clientWhatsapp ? data.clientWhatsapp.replace(/\D/g, '') : null, 
        isPublic: isPublic,
        slug: newSlug, // NOVO SLUG FORMATADO
    };

    // Lógica de Senha
    if (isPublic) {
        updateData.password = null; // Limpa a senha se for pública
    } else {
        // Se for privada, usa a senha fornecida (o modal garante que ela é válida se não for vazia)
        updateData.password = data.password; 
    }
    
    try {
        await prisma.galeria.update({
            where: { id: galeriaId },
            data: updateData,
        });

        return { success: true, message: `Galeria '${data.title}' atualizada com sucesso. Novo link: /galeria/${newSlug}` };

    } catch (error) {
        console.error('Erro ao atualizar galeria:', error);
        return { success: false, error: "Falha ao atualizar a galeria." };
    }
}

// =========================================================================
// 3. OUTRAS FUNÇÕES (estrutura)
// =========================================================================

export async function getGalerias() {
    try {
        // Simulação da lógica de busca de capa (retorna apenas a estrutura)
        const galerias = await prisma.galeria.findMany({
            orderBy: { date: 'desc' },
        });
        
        // Simula a adição do coverImageUrl para o frontend
        const galeriasWithCovers = galerias.map(galeria => ({
            ...galeria,
            date: galeria.date.toISOString(), 
            coverImageUrl: null, // Omitido a lógica de Drive aqui, mas a tipagem é necessária
        }));

        return galeriasWithCovers;
    } catch (error) {
        console.error('Erro ao buscar galerias:', error);
        return [];
    }
}

export async function deleteGaleria(id: string) {
    if (!id) {
        return { success: false, error: "ID da galeria não fornecido." };
    }
    try {
        await prisma.galeria.delete({ where: { id } });
        return { success: true, message: "Galeria deletada com sucesso." };
    } catch (error) {
        console.error('Erro ao deletar galeria:', error);
        return { success: false, error: "Falha ao deletar a galeria." };
    }
}
// =========================================================================
// NOVO: AUTENTICAÇÃO DE ACESSO
// =========================================================================

/**
 * Server Action para checar a senha da galeria e autenticar via cookie.
 * Se a senha estiver correta, define o cookie e redireciona.
 * Se estiver incorreta, retorna um erro para o cliente.
 * * @param galeriaId ID da galeria.
 * @param password Senha fornecida pelo usuário.
 */
export async function authenticateGaleriaAccess(galeriaId: string, fullSlug: string, password: string) {
    // 1. Busca a galeria e a senha real do banco
    const galeria = await prisma.galeria.findUnique({
        where: { id: galeriaId },
        select: { password: true, title: true }
    });

    if (!galeria || !galeria.password) {
        return { success: false, error: "Galeria não requer autenticação de senha ou não existe." };
    }

    if (galeria.password === password) {
        
        // 2. Define o COOKIE de acesso no lado do servidor (ANTES DO REDIRECT)
        cookies().set(ACCESS_COOKIE_KEY + galeriaId, password, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 dia
            path: `/galeria/${fullSlug}`,
        });
        
        // 3. Redireciona (o Next.js lida com a resposta HTTP)
        redirect(`/galeria/${fullSlug}`); 
        
        // Este código é inalcançável, mas o TS exige um retorno,
        // embora o redirect() lance um erro interno que o Next.js captura.
        // return { success: true, message: "Redirecionando..." }; 
    } else {
        return { success: false, error: "Senha incorreta." };
    }
}