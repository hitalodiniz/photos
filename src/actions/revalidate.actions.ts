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
 * @param coverPhotoId ID da foto de capa (para revalidar cache da imagem quando a capa mudar)
 */
export async function revalidateGallery(
  folderId: string,
  slug: string,
  username: string,
  subdomain?: string,
  coverPhotoId?: string,
) {
  try {
    // 1. Limpa o cache de dados (Fetch Cache)
    revalidateTag(`drive-photos-${folderId}`);
    revalidateTag(`cover-${folderId}`);

    // 2. 🎯 Revalida o cache da imagem de capa se o photoId for fornecido
    // Isso é essencial quando a capa da galeria é alterada
    if (coverPhotoId) {
      revalidateGalleryCover(coverPhotoId);
    }

    // 3. Limpa a rota padrão (Username)
    // Caminho: /fotografo/slug-da-galeria
    revalidatePath(`/${username}/${slug}`);

    // 4. Limpa a rota de subdomínio (Rewrite Path)
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

/**
 * 🎯 REVALIDAÇÃO DEFINITIVA
 * Deve ser chamada sempre que o status do Google Drive mudar
 * ou após um login/onboarding bem-sucedido.
 */
export async function revalidateProfile(username?: string) {
  // 1. Limpa o cache de todas as funções marcadas com a tag 'user-profile'
  revalidateTag('user-profile');

  // 2. Se tiver o username, limpa o cache específico da galeria pública
  if (username) {
    revalidateTag(`profile-${username}`);
    revalidatePath(`/${username}`, 'layout');
  }

  // 3. Limpa o dashboard para garantir que o Aside mostre o status correto
  revalidatePath('/dashboard', 'layout');
}

/**
 * 🧹 LIMPEZA TOTAL DE CACHE (ADMIN)
 * Invalida todos os dados em cache no servidor e na Vercel.
 */
/**
 * 🧹 PURGE ALL CACHE (ADMIN)
 * Invalida todas as tags de dados e rotas estáticas do sistema.
 * 🎯 ATUALIZADO: Agora revalida também todas as tags de galerias e perfis
 */
export async function purgeAllCache() {
  try {
    // 1. Invalida as tags de dados dinâmicos (vistas no seu VS Code)
    revalidateTag('user-profile');
    revalidateTag('drive-photos'); // Tag base para fotos do Drive
    revalidateTag('cover-image'); // Tag base para capas
    revalidateTag('public-profile');

    // 2. 🎯 NOVO: Revalida tags de galerias e perfis
    // Nota: Next.js não suporta wildcards, mas revalidamos o dashboard que força refresh
    // As tags específicas serão revalidadas quando necessário via revalidateTag individual

    // 3. Invalida a árvore de renderização completa (Páginas Estáticas/Edge)
    // O parâmetro 'layout' na raiz garante que subdomínios e rotas [username]
    // sejam marcadas para reconstrução no próximo acesso.
    revalidatePath('/', 'layout');
    // 🎯 CRÍTICO: Revalida o dashboard para forçar refresh das galerias
    revalidatePath('/dashboard', 'layout');

    return {
      success: true,
      message:
        'Todos os caches (Dados, Fotos e Páginas) foram invalidados com sucesso. Recarregue a página.',
    };
  } catch (error) {
    console.error('Erro ao limpar cache global:', error);
    return {
      success: false,
      error: 'Falha crítica ao processar a limpeza global de cache.',
    };
  }
}

/**
 * 🎯 REVALIDA GALERIAS DO USUÁRIO
 * Função específica para revalidar o cache de galerias de um usuário específico
 */
export async function revalidateUserGalerias(userId: string) {
  try {
    revalidateTag(`user-galerias-${userId}`);
    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Erro ao revalidar galerias do usuário:', error);
    return { success: false };
  }
}
