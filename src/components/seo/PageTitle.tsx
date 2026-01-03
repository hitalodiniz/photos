// src/components/seo/PageTitle.tsx
'use client';

interface PageTitleProps {
  title: string;
}

export function PageTitle({ title }: PageTitleProps) {
  const fullTitle = `${title} | Sua Galeria de Fotos`;

  return <title>{fullTitle}</title>;
}
