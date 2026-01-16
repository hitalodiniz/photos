import { saveAs } from 'file-saver';
import { Galeria } from '../types/galeria';
import { getDownloadUrl, getHighResImageUrl } from './url-helper';

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
  } catch (e) {
    return '2025_00_00';
  }
};

export const handleDownloadPhoto = async (
  galeria: Galeria,
  photoId: string | number,
  index: number,
) => {
  try {
    // 1. Lógica de nomeação (Mantida)
    const dateStr = getFormattedDateFromSlug(galeria.slug);
    const eventName = galeria.slug.split('/').pop() || 'galeria';
    const fileName = `foto_${index + 1}_${dateStr}_${eventName}.jpg`;

    // 2. CHAMADA AO HELPER (Bypass Vercel)
    // Agora centralizamos a lógica da URL no helper
    const highResUrl = getDownloadUrl(photoId);

    // 3. Download via Blob (Cliente <-> Google)
    const response = await fetch(highResUrl);
    if (!response.ok) throw new Error('Falha no download direto da foto');

    const blob = await response.blob();

    // 4. Dispara o download com FileSaver
    saveAs(blob, fileName);
  } catch (e) {
    console.error('Erro no download individual:', e);

    // Fallback usando o helper também
    window.open(getHighResImageUrl(photoId), '_blank');
  }
};

/**
 * Agrupa as fotos em pacotes (chunks) baseados no tamanho acumulado em bytes.
 * @param photos Lista de fotos da galeria
 * @param maxSizeBytes Tamanho máximo de cada pacote (ex: 500MB)
 */
export const groupPhotosByWeight = (photos: any[], maxSizeBytes: number) => {
  const chunks: any[][] = [];
  let currentChunk: any[] = [];
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
