"use server"; // Esta diretiva deve estar no topo do arquivo

import { prisma } from '@/lib/db';
import slugify from 'slugify';
import { redirect } from 'next/navigation';
import { getDriveService } from '@/lib/googleDrive'; 
import { google } from 'googleapis'; // Importamos 'google' para usar os tipos no Server Action

/**
 * Server Action para criar uma nova sessão de fotos e salvar no banco de dados.
 * Retorna o slug criado ou um objeto de erro.
 */
export async function createSession(formData: FormData) {
    const clientName = formData.get('clientName') as string;
    const clientWhatsapp = formData.get('clientWhatsapp') as string;
    
    const title = formData.get('title') as string;
    const dateStr = formData.get('date') as string;
    const location = formData.get('location') as string;
    const driveFolderId = formData.get('driveFolderId') as string;

    if (!title || !driveFolderId || !clientName) {
        return { success: false, error: "Preencha todos os campos obrigatórios." };
    } 

    let slug = slugify(title, { lower: true, strict: true, locale: 'pt' });
    
    const existing = await prisma.session.findUnique({ where: { slug } });
    if (existing) {
        slug = `${slug}-${Date.now().toString().slice(-5)}`;
    }

    try {
      await prisma.session.create({
        data: {
          title,
          slug,
          date: new Date(dateStr),
          location,
          driveFolderId,
          clientName: clientName, 
          clientWhatsapp: clientWhatsapp        },
      });
      // Retorna o slug para o cliente gerenciar o redirecionamento/toast
      return { success: true, slug: slug, message: `Galeria '${title}' criada com sucesso!` };
    } catch (error) {
      console.error('Erro ao salvar no banco:', error);
      return { success: false, error: "Falha ao salvar a nova sessão." };
    }
}


/**
 * Server Action para buscar todas as sessões cadastradas no banco de dados,
 * incluindo a URL da primeira imagem (capa) do Google Drive.
 */
export async function getSessions() {
    try {
        const sessions = await prisma.session.findMany({
            orderBy: { date: 'desc' }, // Ordena da mais recente para a mais antiga
        });

        // Inicializa o serviço do Drive
        const drive = getDriveService();
        
        // Mapear sessões para obter o URL da capa para cada uma
        const sessionsWithCovers = await Promise.all(sessions.map(async (session) => {
            
            // Busca apenas 1 arquivo (a capa)
            const response = await drive.files.list({
                q: `'${session.driveFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
                fields: 'files(thumbnailLink)',
                pageSize: 1, // Pega apenas o primeiro
            });

            const firstFile = response.data.files?.[0];
            let coverUrl = null;

            if (firstFile?.thumbnailLink) {
                // Ajusta a qualidade do thumbnail para alta resolução (ex: 800px)
                // Usa -c no final para forçar o crop e manter o aspect ratio (melhor para thumbs)
                coverUrl = firstFile.thumbnailLink.replace('=s220', '=w800-h600-c'); 
            }

            return {
                ...session,
                date: session.date.toISOString(),
                coverImageUrl: coverUrl, // NOVO CAMPO: URL da capa
            };
        }));
        
        return sessionsWithCovers;

    } catch (error) {
        console.error('Erro ao buscar sessões:', error);
        return [];
    }
}

/**
 * Server Action para deletar uma sessão específica pelo ID.
 */
export async function deleteSession(sessionId: string) {
    try {
        await prisma.session.delete({
            where: { id: sessionId },
        });
        return { success: true, message: "Galeria deletada com sucesso!" };
    } catch (error) {
        console.error("Erro ao deletar a sessão:", error);
        return { success: false, error: "Falha ao deletar a galeria." };
    }
}