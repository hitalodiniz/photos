'use client';
import { useEffect } from 'react';
import { formatTitle, SEO_CONFIG } from '@/core/config/seo.config';

export function usePageTitle(title?: string) {
  useEffect(() => {
    // Se não houver título, usa o padrão imediatamente
    if (!title) {
      document.title = SEO_CONFIG.defaultTitle;
      return;
    }

    // Define o título formatado
    document.title = formatTitle(title);

    // O Cleanup só deve acontecer quando o componente DESMONTAR (sair da página)
    return () => {
      document.title = SEO_CONFIG.defaultTitle;
    };
  }, [title]); // Só reexecuta se o title mudar
}
