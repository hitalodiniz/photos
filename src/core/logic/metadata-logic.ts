import { Metadata } from 'next';
import { fetchGalleryBySlug } from '@/core/logic/galeria-logic';
import { getDirectGoogleUrl } from '@/core/utils/url-helper';
import { SEO_CONFIG } from '@/core/config/seo.config';

/**
 * Busca a galeria e gera os metadados completos para SEO e Redes Sociais
 */
export async function getGalleryMetadata(fullSlug: string): Promise<Metadata> {
  // 1. Busca os dados (Centralizado aqui agora)
  const galeria = await fetchGalleryBySlug(fullSlug);

  if (!galeria) {
    return { title: 'Galeria não encontrada' };
  }

  // 1. Montagem do Título: "Corrida de rua - Cliente"
  const title = galeria.title;

  // 2. Montagem da Descrição Dinâmica
  // Exemplo: "Cliente: João | Local: Parque Ibirapuera | Data: 10/01/2024 | Fotógrafo: Hitalo Diniz"
  const descriptionParts = [];
  if (galeria.location) descriptionParts.push(`${galeria.location}`);
  if (galeria.date)
    descriptionParts.push(
      `${new Date(galeria.date).toLocaleDateString('pt-BR')}`,
    );
  if (galeria.photographer?.full_name)
    descriptionParts.push(`Fotógrafo: ${galeria.photographer.full_name}`);

  const description =
    descriptionParts.length > 0
      ? descriptionParts.join(' | ')
      : 'Clique para acessar a galeria completa';

  // 3. Tratamento da Imagem
  // Passamos '1200' para bater com o padrão de redes sociais.
  // O seu proxy retornará um WebP otimizado de ~300KB via Google Drive.
  // 🎯 FALLBACK: Prefere URL direta (server-side), cliente fará fallback se necessário
  const ogImageUrl = getDirectGoogleUrl(galeria.cover_image_url, '1200');

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/${fullSlug}`,
      siteName: SEO_CONFIG.defaultTitle,
      locale: 'pt_BR',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Capa da galeria: ${title}`, // Melhora a acessibilidade e SEO
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [ogImageUrl],
    },
  };
}
