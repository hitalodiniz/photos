'use client';

import UserMenu from './UserMenu';
import useAuthStatus from '@/hooks/useAuthStatus'; // Importe o novo Hook

export default function AuthStatusButton() {
  // Apenas chame o Hook para obter o estado e as funções
  const { session, loading, handleLogout } = useAuthStatus();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0B57D0]"></div>
      </div>
    );
  }

  if (session) {
    // Agora, UserMenu recebe a sessão e o manipulador de logout
    return <UserMenu session={session} handleLogout={handleLogout} />;
  } /*else {
        // Se deslogado: Mostra o botão de Login
        return <GoogleSignInButton />;
    }*/
}
