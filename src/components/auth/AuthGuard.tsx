'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import LoadingScreen from '../ui/LoadingScreen';

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
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
          <div className="absolute inset-0 blur-xl bg-champagne-dark opacity-20 animate-pulse"></div>
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
