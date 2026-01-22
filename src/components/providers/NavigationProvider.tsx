'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface NavigationContextType {
  navigate: (href: string, message?: string) => void;
  isNavigating: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');
  
  // Ref para saber qual era a rota quando o loading começou
  const navigationSourceRef = React.useRef<string | null>(null);

  // Reset loading state quando o pathname realmente mudar
  useEffect(() => {
    // Só iniciamos o fade out se a rota atual for diferente da rota de origem
    if (isNavigating && pathname !== navigationSourceRef.current) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setIsFadingOut(false);
        setLoadingMessage('Carregando...');
        navigationSourceRef.current = null;
      }, 800); // Sincronizado com o timeout do LoadingScreen
      return () => clearTimeout(timer);
    }
  }, [pathname, isNavigating]);

  const navigate = (href: string, message: string = 'Carregando...') => {
    if (href === pathname || isNavigating) return;

    navigationSourceRef.current = pathname; // Salva onde estamos agora
    setLoadingMessage(message);
    setIsNavigating(true);
    setIsFadingOut(false);
    
    // Pequeno delay para permitir que o estado isNavigating seja processado e o LoadingScreen monte
    setTimeout(() => {
      router.push(href);
    }, 100);
  };

  return (
    <NavigationContext.Provider value={{ navigate, isNavigating }}>
      {isNavigating && (
        <LoadingScreen 
          message={loadingMessage} 
          type="content" 
          fadeOut={isFadingOut} 
        />
      )}
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
