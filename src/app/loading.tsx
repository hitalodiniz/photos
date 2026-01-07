'use client';

import LoadingScreen from '@/components/ui/LoadingScreen';

// se você salvar o componente em outro lugar

export default function Loading() {
  // No loading.tsx oficial, não precisamos de lógica de fadeOut manual
  // pois o Next.js faz a troca assim que a página hidrata.
  return <LoadingScreen message="Carregando termos..." />;
}
