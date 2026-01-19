import { saveAs } from 'file-saver';
import { Galeria } from '@/core/types/galeria';
import { getDirectGoogleUrl, getDownloadDirectGoogleUrl, getHighResImageUrl, getProxyUrl, RESOLUTIONS } from './url-helper';

const getFormattedDateFromSlug = (slug: string) => {
  try {
    // Exemplo de slug: "hitalodiniz80/2025/12/27/corrida-fim-de-ano"
    const parts = slug.split('/');

    // As partes seriam: [0] usuario, [1] ano, [2] mes, [3] dia, [4] nome
    const ano = parts[1];
    const mes = parts[2];
    const dia = parts[3];

    if (ano && mes && dia) {
      return `${ano}_${mes}_${dia}`;
    }

    // Fallback caso o slug fuja do padrão
    return new Date().toISOString().split('T')[0].replace(/-/g, '_');
  } catch {
    return '2025_00_00';
  }
};

export const handleDownloadPhoto = async (
  galeria: Galeria,
  photoId: string | number,
  index: number,
) => {
  try {
    // 1. Lógica de nomeação
    const dateStr = getFormattedDateFromSlug(galeria.slug);
    const eventName = galeria.slug.split('/').pop() || 'galeria';
    const fileName = `foto_${index + 1}_${dateStr}_${eventName}.jpg`;

    // 2. 🎯 ESTRATÉGIA DE DOWNLOAD COM LIMITE DE 2MB:
    // Usa resolução que garante arquivo abaixo de 2MB (1920px geralmente fica ~800KB-1.5MB)
    // Primeiro tenta direto no Google, se falhar usa Proxy API
    const directUrl = getDownloadDirectGoogleUrl(photoId, RESOLUTIONS.ULTRA_DOWNLOAD);
   //const directUrl = getHighResImageUrl(photoId); USADA PARA TESTE COM PROXY
    let usingProxy = false;

    try {
      // Tentativa 1: Download direto do Google (bypass Vercel)
      // Usa 1920px que geralmente resulta em arquivo entre 800KB-1.5MB
      const response = await fetch(directUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      saveAs(blob, fileName);
      return; // Sucesso, sai da função
    } catch (directError: unknown) {
      // Se falhar (CORS, 429, etc), loga e tenta proxy
      const errorMessage =
        directError instanceof Error
          ? directError.message
          : 'Erro desconhecido';
      console.warn(
        `[DOWNLOAD_FALLBACK] Google Direct falhou (${errorMessage}) para ID: ${photoId}. Usando Proxy API.`
      );
      usingProxy = true;
    }

    // Tentativa 2: Usar API Proxy (se direto falhou)
    // O proxy já está configurado para retornar arquivo otimizado (~1MB)
    if (usingProxy) {
      const response = await fetch(getProxyUrl(photoId, RESOLUTIONS.DOWNLOAD));
      
      if (!response.ok) {
        throw new Error(`Proxy API retornou ${response.status}`);
      }

      const blob = await response.blob();
      saveAs(blob, fileName);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[DOWNLOAD_ERROR] Falha total no download:', errorMessage);
    
    // Fallback final: Abre em nova aba com resolução segura (1920px)
    const fallbackUrl = getDirectGoogleUrl(photoId, '1920');
    window.open(fallbackUrl, '_blank');
  }
};

/**
 * Agrupa as fotos em pacotes (chunks) baseados no tamanho acumulado em bytes.
 * @param photos Lista de fotos da galeria
 * @param maxSizeBytes Tamanho máximo de cada pacote (ex: 500MB)
 */
interface PhotoWithSize {
  size?: string | number;
}

export const groupPhotosByWeight = (
  photos: PhotoWithSize[],
  maxSizeBytes: number,
) => {
  const chunks: PhotoWithSize[][] = [];
  let currentChunk: PhotoWithSize[] = [];
  let currentChunkSize = 0;

  photos.forEach((photo) => {
    const photoSize = Number(photo.size) || 0;

    // Se adicionar esta foto estoura o limite e o pacote atual não está vazio,
    // fecha o pacote atual e começa um novo.
    if (
      currentChunkSize + photoSize > maxSizeBytes &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChunkSize = 0;
    }

    currentChunk.push(photo);
    currentChunkSize += photoSize;
  });

  // Adiciona o último pacote restante
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};
