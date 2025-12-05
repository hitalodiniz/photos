'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Seu hook de autenticação

// Tipagem para os 'children' (o conteúdo que será protegido)
interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string; // Opcional, para onde redirecionar se deslogado
}

export default function AuthGuard({ children, redirectTo = '/' }: AuthGuardProps) {
  const { user, isLoading, protectRoute } = useAuth();

  // 1. Lógica de Redirecionamento
  useEffect(() => {
    // A função protectRoute já tem a lógica de 'se não estiver carregando E não há user, redirecione'
    protectRoute(redirectTo); 
  }, [isLoading, user, redirectTo, protectRoute]); 

  // 2. Estado de Carregamento
  if (isLoading) {
    // Retorna um estado de carregamento enquanto o Supabase verifica a sessão
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Carregando autenticação...
      </div>
    );
  }

  // 3. Renderiza o conteúdo (children) se o usuário estiver logado
  if (user) {
    return <>{children}</>;
  }
  
  // 4. Se não estiver carregando e não tiver user, retorna null (o redirecionamento já ocorreu no useEffect)
  return null;
}