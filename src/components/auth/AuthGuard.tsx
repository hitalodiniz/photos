'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from '@photos/core-auth';
import { Loader2 } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  redirectTo = '/',
}: AuthGuardProps) {
  const { user, isLoading, protectRoute } = useAuth();

  // 1. Redirecionamento assistido pelo Cliente
  useEffect(() => {
    protectRoute(redirectTo);
  }, [isLoading, user, redirectTo, protectRoute]);

  // 2. Estado de Carregamento Editorial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-petroleum dark:text-champagneanimate-spin" />
          <div className="absolute inset-0 blur-xl bg-petroleum/10 dark:bg-champagne-dark/20 opacity-20 animate-pulse"></div>
        </div>
        <LoadingScreen message="Validando seu acesso" />
      </div>
    );
  }

  // 3. Renderização Segura
  if (user) {
    return <>{children}</>;
  }

  return null;
}
