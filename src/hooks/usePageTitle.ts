'use client';

import { useEffect } from 'react';
import { formatTitle, getSEOBySegment } from '@/core/config/seo.config';
import { useSegment } from '@/hooks/useSegment';

/**
 * Hook para gerenciar o título da página dinamicamente no cliente.
 * Sincroniza o título com o segmento ativo (Sua Galeria, Na Selfie, etc).
 */
export function usePageTitle(title?: string) {
  const { segment } = useSegment(); // 🎯 Captura o segmento atual reativamente

  useEffect(() => {
    // 1. Obtém as configurações de SEO para o segmento atual
    const seo = getSEOBySegment(segment);

    // 2. Formata o título usando o brandName dinâmico
    const newTitle = formatTitle(title, seo.brandName);

    // 3. Só altera o DOM se o título for realmente diferente para evitar loops
    if (document.title !== newTitle) {
      document.title = newTitle;
    }

    // Mantemos a decisão de NÃO usar cleanup para evitar "flashes" de título
    // durante a navegação entre páginas no Next.js.
  }, [title, segment]); // 🎯 Re-executa se o título da página OU o segmento mudar
}
