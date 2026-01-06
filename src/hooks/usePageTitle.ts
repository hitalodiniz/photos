'use client';
import { useEffect } from 'react';
import { formatTitle, SEO_CONFIG } from '@/core/config/seo.config';

export function usePageTitle(title?: string) {
  useEffect(() => {
    if (!title)
      return () => {
        document.title = SEO_CONFIG.defaultTitle;
      };

    document.title = formatTitle(title);

    // Cleanup: volta para o título padrão ao sair da página
    return () => {
      document.title = SEO_CONFIG.defaultTitle;
    };
  }, [title]);
}
