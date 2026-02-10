// app/page.tsx (Home Page Principal com Checagem de Autenticação Server-Side)

import { LandingPageContent } from '@/components/sections';
import { LoadingScreen } from '@/components/ui';
import { SegmentType } from '@/core/config/segments';
import { getSEOBySegment, formatTitle } from '@/core/config/seo.config';
import { useSegment } from '@/hooks/useSegment';
import { Metadata } from 'next';

/**
 * 🎯 Geração de Metadados Dinâmicos (Server-side)
 * O Next.js executa esta função no servidor antes de renderizar a página.
 */
export async function generateMetadata(): Promise<Metadata> {
  // Captura o segmento da variável de ambiente no servidor
  const segment =
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';

  // Obtém os dados de SEO configurados para este segmento
  const seo = getSEOBySegment(segment);

  return {
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    // Adicionalmente, você pode incluir OpenGraph para redes sociais
    openGraph: {
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      type: 'website',
    },
  };
}
export default async function HomePage() {
  return <LandingPageContent />;
  //return <LoadingScreen message="Carregando..." />;
  //return <GlobalError />;
  //return <LoadingSpinner size='lg' message='carregando' ></LoadingSpinner>
}
