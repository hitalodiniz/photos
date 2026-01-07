'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { LIGHT_ROUTES } from '@/core/config/routes.config';

export function RouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  // Rotas leves que renderizam instantaneamente

  useEffect(() => {
    const isLightRoute = LIGHT_ROUTES.includes(pathname);

    // 1. PERFORMANCE: Se for a primeira carga (F5) e rota leve,
    // liberamos o conteúdo IMEDIATAMENTE para o Lighthouse pontuar bem.
    if (isFirstRender.current && isLightRoute) {
      document.body.classList.add('js-ready');
      isFirstRender.current = false;
      return;
    }

    if (isLightRoute) {
      document.body.classList.add('js-ready');
      setLoading(false);
      return;
    }

    // 2. THRESHOLD: Para rotas pesadas, esperamos 200ms antes de mostrar o Loading.
    // Se a página carregar antes disso, o usuário nem vê o spinner.
    const thresholdTimer = setTimeout(() => {
      setLoading(true);
    }, 200);

    // Simulação de término de carregamento
    const finishTimer = setTimeout(() => {
      setLoading(false);
      document.body.classList.add('js-ready');
    }, 600);

    isFirstRender.current = false;

    return () => {
      clearTimeout(thresholdTimer);
      clearTimeout(finishTimer);
    };
  }, [pathname, searchParams]);

  // Se não estiver em estado de loading, não renderizamos nada para não sujar o DOM
  return <LoadingScreen fadeOut={!loading} message="Carregando..." />;
}
