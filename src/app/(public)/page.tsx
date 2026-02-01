// app/page.tsx (Home Page Principal com Checagem de Autenticação Server-Side)

import { LandingPageContent } from '@/components/sections';
import { LoadingScreen } from '@/components/ui';
import { SEO_CONFIG } from '@/core/config/seo.config';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: SEO_CONFIG.defaultTitle,
  description: SEO_CONFIG.defaultDescription,
};

export default async function HomePage() {
  return <LandingPageContent />;
  //return <LoadingScreen message="Carregando..." />;
  //return <GlobalError />;
  //return <LoadingSpinner size='lg' message='carregando' ></LoadingSpinner>
}
