// app/page.tsx (Home Page Principal com Checagem de Autenticação Server-Side)

import { LandingPageContent } from '@/components/sections';
import { LoadingScreen } from '@/components/ui';
import { SegmentType } from '@/core/config/segments';
import { getSEOBySegment, formatTitle } from '@/core/config/seo.config';
import { useSegment } from '@/hooks/useSegment';
import { Metadata } from 'next';

export default async function HomePage() {
  return <LandingPageContent />;
  //return <LoadingScreen message="Carregando..." />;
  //return <GlobalError />;
  //return <LoadingSpinner size='lg' message='carregando' ></LoadingSpinner>
}
