'use client';
import { useEffect, useRef } from 'react';
import { formatTitle, SEO_CONFIG } from '@/core/config/seo.config';

export function usePageTitle(title?: string) {
  const lastTitleRef = useRef<string>('');

  useEffect(() => {
    const newTitle = title ? formatTitle(title) : SEO_CONFIG.defaultTitle;

    // Só altera se o título formatado for diferente do último aplicado
    if (document.title !== newTitle) {
      document.title = newTitle;
    }

    // REMOVA o cleanup que volta para o defaultTitle.
    // Em SPAs (Next.js), o próximo componente que montar já chamará o usePageTitle,
    // evitar o "voltar ao padrão" no desmonte previne flashes de título e loops de estado.
  }, [title]);
}
