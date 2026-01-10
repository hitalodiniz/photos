export interface DrivePhoto {
  id: string;
  name: string;
  size: string;
  thumbnailUrl: string;
  webViewUrl: string;
  width?: number;
  height?: number;
}

/**
 * Lista fotos de uma pasta do Google Drive com tratamento de erro.
 */
export async function listPhotosFromDriveFolder(
  driveFolderId: string,
  accessToken: string,
): Promise<DrivePhoto[]> {
  if (!driveFolderId) {
    throw new Error('O ID da pasta do Google Drive não foi configurado.');
  }

  const query = encodeURIComponent(
    `'${driveFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
  );

  // 1. Incluímos o campo 'name' explicitamente e pedimos ordenação por nome na API
  const fields = encodeURIComponent(
    'nextPageToken, files(id, name, size, thumbnailLink, webViewLink, imageMediaMetadata(width,height))',
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  let allFiles: any[] = [];
  let pageToken: string | null = null;

  try {
    do {
      // 2. Adicionamos &orderBy=name para que o Google já mande o grosso ordenado
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=1000&orderBy=name${
        pageToken ? `&pageToken=${pageToken}` : ''
      }${apiKey ? `&key=${apiKey}` : ''}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(`Erro API Drive: ${res.status}`);

      const data = await res.json();
      allFiles = [...allFiles, ...(data.files || [])];
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    // 3. ORDENAÇÃO MANUAL ROBUSTA (Natural Sort)
    // Isso corrige casos onde o fotógrafo misturou nomes como "foto-1.jpg" e "foto-10.jpg"
    // ou usou câmeras diferentes.
    const sortedFiles = allFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true, // Garante que 2 venha antes de 10
        sensitivity: 'base', // Ignora diferenças de acento/caixa alta
      }),
    );

    return sortedFiles.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size || '0',
      thumbnailUrl: file.thumbnailLink || null,
      webViewUrl: file.webViewLink,
      width: file.imageMediaMetadata?.width || 1600,
      height: file.imageMediaMetadata?.height || 1200,
    }));
  } catch (error: any) {
    console.error('Erro ao listar fotos do Drive:', error);
    throw error;
  }
}

/**
 * Torna a pasta pública e lança erro caso falhe. - não usada a partir de 01/01/2026
 */
export async function makeFolderPublic(folderId: string, accessToken: string) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    },
  );

  if (!res.ok) {
    const errorBody = await res.json();
    // Isso vai printar o erro REAL do Google no seu console
    console.error('ERRO GOOGLE DRIVE:', JSON.stringify(errorBody, null, 2));
    return false;
  }

  return true;
}
