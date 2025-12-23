'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/' }: AuthGuardProps) {
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
          <div className="absolute inset-0 blur-xl bg-[#F3E5AB] opacity-20 animate-pulse"></div>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">
          Validando Acesso
        </p>
      </div>
    );
  }

  // 3. Renderização Segura
  if (user) {
    return <>{children}</>;
  }
  
  return null;
}