// lib/google-drive.ts
export interface DrivePhoto {
  id: string;
  name: string;
  thumbnailUrl: string;
  webViewUrl: string;
}

/**
 * Lista fotos de uma pasta do Google Drive.
 * Você precisa fornecer um accessToken válido.
 */
export async function listPhotosFromDriveFolder(
  driveFolderId: string,
  accessToken: string
): Promise<DrivePhoto[]> {
  if (!driveFolderId) return [];

  // Exemplo usando a Google Drive API v3.
  // Aqui você precisa ter o accessToken com escopo de drive.readonly.
  const query = encodeURIComponent(`'${driveFolderId}' in parents and mimeType contains 'image/' and trashed = false`);
  const fields = encodeURIComponent("files(id, name, thumbnailLink, webViewLink)");

  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store", // pode ajustar conforme necessidade
  });

  if (!res.ok) {
    console.error("Erro ao buscar fotos no Google Drive", await res.text());
    return [];
  }

  const data = await res.json();

  const files = (data.files || []) as Array<{
    id: string;
    name: string;
    thumbnailLink: string;
    webViewLink: string;
  }>;

  return files.map((file) => ({
    id: file.id,
    name: file.name,
    thumbnailUrl: file.thumbnailLink,
    webViewUrl: file.webViewLink,
  }));
}
