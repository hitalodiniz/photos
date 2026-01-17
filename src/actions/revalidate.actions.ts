'use server'; // Obrigatório no topo para Client Components poderem chamar

import { revalidatePath, revalidateTag } from 'next/cache';

export async function revalidateDrivePhotos(folderId: string) {
  if (!folderId) return;
  // Invalida o cache da lista de fotos (Grid) na Vercel
  revalidateTag(`drive-photos-${folderId}`);
}

export async function revalidateGalleryCover(photoId: string) {
  if (!photoId) return;
  // Invalida o cache da imagem de capa na CDN
  revalidateTag(`cover-${photoId}`);
}

/**
 * Ação para limpar todos os níveis de cache de uma galeria específica.
 * @param folderId ID da pasta no Google Drive (usado para as Tags)
 * @param slug O slug da galeria (ex: 'casamento-joao-e-maria')
 * @param username O username do autor (ex: 'fotografo1')
 * @param subdomain O subdomínio (se houver, ex: 'galeria.meusite.com')
 */
export async function revalidateGallery(
  folderId: string,
  slug: string,
  username: string,
  subdomain?: string,
) {
  try {
    // 1. Limpa o cache de dados (Fetch Cache)
    revalidateTag(`drive-photos-${folderId}`);
    revalidateTag(`cover-${folderId}`);

    // 2. Limpa a rota padrão (Username)
    // Caminho: /fotografo/slug-da-galeria
    revalidatePath(`/${username}/${slug}`);

    // 3. Limpa a rota de subdomínio (Rewrite Path)
    if (subdomain && subdomain !== 'www') {
      // O Next.js armazena o cache estático no caminho real da pasta
      // De acordo com seu middleware: /subdomain/[subdomain]/[slug]
      revalidatePath(`/subdomain/${subdomain}/${slug}`);

      // Também revalidamos a Home do subdomínio se necessário
      revalidatePath(`/${subdomain}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Erro na revalidação:', error);
    return { success: false };
  }
}
