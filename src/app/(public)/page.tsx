// app/page.tsx (Home Page Principal com Checagem de Autenticação Server-Side)

import { LandingPageContent } from '@/components/sections';

export default async function HomePage() {
  return <LandingPageContent />;
  // return <LoadingScreen message="Carregando o perfil do fotógrafo..." />;
}
