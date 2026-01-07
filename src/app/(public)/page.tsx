// app/page.tsx (Home Page Principal com Checagem de Autenticação Server-Side)

import { LandingPageContent } from '@/components/sections';
import { SEO_CONFIG } from '@/core/config/seo.config';
import { Metadata } from 'next';
import GlobalError from '../error';

export const metadata: Metadata = {
  title: SEO_CONFIG.defaultTitle,
  description: SEO_CONFIG.defaultDescription,
};

export default async function HomePage() {
  return <LandingPageContent />;
  // return <LoadingScreen message="Carregando o perfil do fotógrafo..." />;
  //return <GlobalError />;
}
