"use server"; // Esta diretiva deve estar no topo do arquivo

import { prisma } from "@/lib/db";
import slugify from "slugify";
import { redirect } from "next/navigation";
import { getDriveService } from "@/lib/googleDrive";
import { google } from "googleapis"; // Importamos 'google' para usar os tipos no Server Action

// Tipagem da Sessão, utilizada por Client e Server Components
export interface Galeria {
  id: string;
  title: string;
  slug: string;
  date: string; // ISO string
  location: string | null;
  driveFolderId: string;
  clientName: string;
  clientWhatsapp: string | null;
  createdAt: string;
  updatedAt: string;
  coverImageUrl?: string | null; // URL da capa (retornado pelo Server Action)
  isPublic: boolean;
  password: string | null;
}

// Tipagem para os componentes de UI (Toast)
export type ToastType = "success" | "error";

/**
 * Server Action para criar uma nova sessão de fotos e salvar no banco de dados.
 * Retorna o slug criado ou um objeto de erro.
 */
export async function createGaleria(formData: FormData) {
  const clientName = formData.get("clientName") as string;
  const clientWhatsapp = formData.get("clientWhatsapp") as string;
  const title = formData.get("title") as string;
  const dateStr = formData.get("date") as string;
  const location = formData.get("location") as string;
  const driveFolderId = formData.get("driveFolderId") as string;
  const isPublic = (formData.get("isPublic") as string) === 'true'; // Converte para boolean
  const password = formData.get("password") as string;

  if (!title || !driveFolderId || !clientName) {
    return { success: false, error: "Preencha todos os campos obrigatórios." };
  }

  let slug = slugify(title, { lower: true, strict: true, locale: "pt" });

  const existing = await prisma.Galeria.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-5)}`;
  }

  try {
    await prisma.galeria.create({
      data: {
        title,
        slug,
        date: new Date(dateStr),
        location,
        driveFolderId,
        clientName: clientName,
        clientWhatsapp: clientWhatsapp,         
          // Usa o booleano corrigido
          isPublic: isPublic, 
          // Se for público, envia null para a senha (se o esquema permitir null)
          password: isPublic ? null : password,
      },
    });
    // Retorna o slug para o cliente gerenciar o redirecionamento/toast
    return {
      success: true,
      slug: slug,
      message: `Galeria '${title}' criada com sucesso!`,
    };
  } catch (error) {
    console.error("Erro ao salvar no banco:", error);
    return { success: false, error: "Falha ao salvar a nova sessão." };
  }
}
// =========================================================================
// 2. UPDATE GALERIA (NOVO)
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

    // O EditGaleriaModal envia um booleano ou string 'true'/'false'.
    const isPublic = data.isPublic === true || data.isPublic === 'true'; 

    // Prepara o objeto de dados a ser enviado ao Prisma
    const updateData: any = {
        title: data.title,
        date: new Date(data.date),
        location: data.location,
        driveFolderId: data.driveFolderId,
        clientName: data.clientName,
        // Limpa o WhatsApp antes de salvar
        clientWhatsapp: data.clientWhatsapp ? data.clientWhatsapp.replace(/\D/g, '') : null, 
        isPublic: isPublic,
    };

    // Lógica de Senha
    if (!isPublic) {
        // Se a galeria for privada e o usuário forneceu uma senha no modal
        if (data.password) {
            updateData.password = data.password;
        } 
        // Se a galeria for privada, mas a senha estiver vazia, 
        // o modal deve ser configurado para manter a senha antiga se for o caso. 
        // No entanto, se o campo for nulo/vazio, o Prisma ignora o campo 'password' se ele não for incluído em `updateData`.
        // Como o modal envia o estado completo, se `data.password` for '', o valor é limpo. 
    } else {
        updateData.password = null; // Sempre limpa a senha se se tornar pública
    }
    
    // Lógica de SLUG: Só atualiza se o título foi alterado
    const currentGaleria = await prisma.galeria.findUnique({ where: { id: galeriaId } });
    if (currentGaleria && currentGaleria.title !== data.title) {
        let newSlug = slugify(data.title, { lower: true, strict: true, locale: 'pt' });
        
        // Verifica se o novo slug já existe (exceto se for a própria galeria)
        const existing = await prisma.galeria.findUnique({ where: { slug: newSlug } });
        if (existing && existing.id !== galeriaId) {
            newSlug = `${newSlug}-${Date.now().toString().slice(-5)}`;
        }
        updateData.slug = newSlug;
    }

    try {
        await prisma.galeria.update({
            where: { id: galeriaId },
            data: updateData,
        });

        return { success: true, message: `Galeria '${data.title}' atualizada com sucesso.` };

    } catch (error) {
        console.error('Erro ao atualizar galeria:', error);
        return { success: false, error: "Falha ao atualizar a galeria." };
    }
}

// =========================================================================
// 3. OUTRAS FUNÇÕES (estrutura)
// =========================================================================
/**
 * Server Action para buscar todas as sessões cadastradas no banco de dados,
 * incluindo a URL da primeira imagem (capa) do Google Drive.
 */
export async function getGalerias() {
  try {
    const Galerias = await prisma.Galeria.findMany({
      orderBy: { date: "desc" }, // Ordena da mais recente para a mais antiga
    });

    // Inicializa o serviço do Drive
    const drive = getDriveService();

    // Mapear sessões para obter o URL da capa para cada uma
    const GaleriasWithCovers = await Promise.all(
      Galerias.map(async (Galeria) => {
        // Busca apenas 1 arquivo (a capa)
        const response = await drive.files.list({
          q: `'${Galeria.driveFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: "files(thumbnailLink)",
          pageSize: 1, // Pega apenas o primeiro
        });

        const firstFile = response.data.files?.[0];
        let coverUrl = null;

        if (firstFile?.thumbnailLink) {
          // Ajusta a qualidade do thumbnail para alta resolução (ex: 800px)
          // Usa -c no final para forçar o crop e manter o aspect ratio (melhor para thumbs)
          coverUrl = firstFile.thumbnailLink.replace("=s220", "=w800-h600-c");
        }

        return {
          ...Galeria,
          date: Galeria.date.toISOString(),
          coverImageUrl: coverUrl, // NOVO CAMPO: URL da capa
        };
      })
    );

    return GaleriasWithCovers;
  } catch (error) {
    console.error("Erro ao buscar sessões:", error);
    return [];
  }
}

/**
 * Server Action para deletar uma sessão específica pelo ID.
 */
export async function deleteGaleria(GaleriaId: string) {
  try {
    await prisma.Galeria.delete({
      where: { id: GaleriaId },
    });
    return { success: true, message: "Galeria deletada com sucesso!" };
  } catch (error) {
    console.error("Erro ao deletar a sessão:", error);
    return { success: false, error: "Falha ao deletar a galeria." };
  }
}
