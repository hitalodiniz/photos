'use client';

import { useState, useEffect } from 'react';

/**
 * Hook para detectar se o usuário está em um dispositivo móvel.
 * Baseado no breakpoint padrão do Tailwind (md: 768px).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 1. Função de verificação
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 2. Executa na montagem
    checkMobile();

    // 3. Ouve o redimensionamento da tela
    window.addEventListener('resize', checkMobile);

    // 4. Limpa o evento ao desmontar
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
