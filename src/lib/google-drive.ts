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

  // Adicionamos 'capabilities' e 'permissions' para diagnóstico se precisar
  const fields = encodeURIComponent(
    'files(id, name, size, thumbnailLink, webViewLink, imageMediaMetadata(width,height), capabilities)',
  );

  // 🎯 ADICIONE A API KEY AQUI (Busque do seu .env)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}${apiKey ? `&key=${apiKey}` : ''}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.json();

    const message =
      errorBody.error?.message || 'Erro desconhecido ao acessar o Drive.';

    // Tratamento de erros comuns para o usuário
    if (res.status === 401)
      throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
    // Se o erro for 403, a pasta está inacessível
    if (res.status === 403) {
      throw new Error('PERMISSION_DENIED');
    }
    if (res.status === 404)
      throw new Error(
        'A pasta selecionada não foi encontrada no seu Google Drive.',
      );

    throw new Error(`Google Drive API: ${message}`);
  }

  const data = await res.json();

  const files = (data.files || []) as any[];

  return files.map((file) => ({
    id: file.id,
    name: file.name,
    size: file.size || '0',
    //Se o thumbnailLink vier nulo, a sua galeria trava.
    // Vamos garantir que ele exista ou passar null para o front tratar.
    thumbnailUrl: file.thumbnailLink || null,
    webViewUrl: file.webViewLink,
    width: file.imageMediaMetadata?.width,
    height: file.imageMediaMetadata?.height,
  }));
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
