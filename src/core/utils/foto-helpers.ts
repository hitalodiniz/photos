import { Galeria } from '../types/galeria';
import { getProxyUrl } from './url-helper';

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
    // 1. Extrai a data do slug
    const dateStr = getFormattedDateFromSlug(galeria.slug);

    // 2. Extrai o nome do evento (última parte do slug)
    const eventName = galeria.slug.split('/').pop() || 'galeria';

    // 3. Monta o nome do arquivo: foto_3_2025_12_27_nome-evento.jpg
    const fileName = `foto_${index + 1}_${dateStr}_${eventName}.jpg`;

    const highResUrl = getProxyUrl(photoId, '0');
    const response = await fetch(highResUrl);

    if (!response.ok) throw new Error('Falha no download');

    const blob = await response.blob();

    // 4. Dispara o download com FileSaver
    saveAs(blob, fileName);
  } catch (e) {
    console.error('Erro no download individual:', e);
    // Fallback seguro
    window.open(getProxyUrl(photoId, '0'), '_blank');
  }
};
