import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Inicializa o serviço do Google Drive usando a Conta de Serviço
export const getDriveService = () => {
  // O token \n do .env é substituído pela quebra de linha real
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });

  return google.drive({ version: 'v3', auth });
};

// Define o formato esperado para os arquivos retornados
interface DriveFile {
    id: string;
    name: string;
    thumbnailLink?: string;
}

// Função principal para buscar arquivos de uma pasta específica no Drive
export async function getPhotosFromSession(folderId: string): Promise<DriveFile[]> {
  // Adiciona um pequeno delay de 300ms para evitar estouro de cota em testes
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const drive = getDriveService();

  try {
    const response = await drive.files.list({
      // Busca arquivos que são imagens e estão dentro da pasta especificada
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      // Pede apenas os campos necessários (ID, Nome, e o link da miniatura/thumbnail)
      fields: 'files(id, name, thumbnailLink)',
      pageSize: 100, 
    });

    return (response.data.files as DriveFile[]) || [];
  } catch (error) {
    console.error('Erro ao buscar fotos no Google Drive:', error);
    // Retorna array vazio em caso de erro para não quebrar a aplicação
    return [];
  }
}