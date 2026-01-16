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

  const fields = encodeURIComponent(
    'nextPageToken, files(id, name, size, thumbnailLink, webViewLink, imageMediaMetadata(width,height))',
  );

  let allFiles: any[] = [];
  let pageToken: string | null = null;

  try {
    do {
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=1000&orderBy=name${
        pageToken ? `&pageToken=${pageToken}` : ''
      }`;

      console.log(
        `\x1b[36m[LIST PHOTOS]\x1b[0m Verificando pasta: ${driveFolderId}`,
      );

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'force-cache',
        next: {
          revalidate: 86400,
          tags: [`drive-photos-${driveFolderId}`],
        },
      });

      if (!response.ok) throw new Error(`Erro API Drive: ${response.status}`);

      // 🎯 SOLUÇÃO PARA "Body is unusable"
      // Lemos o corpo UMA ÚNICA VEZ como buffer
      const buffer = await response.arrayBuffer();

      // Calculamos o tamanho para o seu log de economia
      const sizeInKb = (buffer.byteLength / 1024).toFixed(1);
      const cacheStatus = response.headers.get('x-nextjs-cache');
      const isHit = cacheStatus === 'HIT';

      if (isHit) {
        console.log(
          `\x1b[32m[CACHE HIT LIST]\x1b[0m ID: ${driveFolderId} | Economizou ${sizeInKb} KB`,
        );
      } else {
        console.log(
          `\x1b[35m[GOOGLE MISS LIST]\x1b[0m ID: ${driveFolderId} | Baixando ${sizeInKb} KB`,
        );
      }

      // 🎯 CONVERSÃO SEGURA: Transformamos o buffer em JSON
      const textData = new TextDecoder().decode(buffer);
      const data = JSON.parse(textData);

      allFiles = [...allFiles, ...(data.files || [])];
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    // Ordenação Natural (Ex: foto-2 vem antes de foto-10)
    const sortedFiles = allFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );

    return sortedFiles.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size || '0',
      // Reduzimos o padrão da thumb no grid para 600px para ser ultra rápido
      thumbnailUrl: `/api/galeria/cover/${file.id}?w=600`,
      webViewUrl: file.webViewLink,
      width: file.imageMediaMetadata?.width || 1600,
      height: file.imageMediaMetadata?.height || 1200,
    }));
  } catch (error: any) {
    console.error('Erro crítico na listagem:', error.message);
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
