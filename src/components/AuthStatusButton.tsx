'use client'; 

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { supabase } from '../lib/supabase'; 
import GoogleSignInButton from '../components/GoogleSignInButton';
import UserMenu from './UserMenu'; // Componente de menu

export default function AuthStatusButton() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter(); 

  // ============== DEFINIÇÃO DA LÓGICA DE AUTH ==============

  // 1. Função de Logout (Deve ser definida aqui dentro)
  const handleLogout = async () => {
    // 1. Limpa a sessão no Supabase
    await supabase.auth.signOut();
    // 2. Redireciona para a página inicial (ajustando a lógica de redirecionamento)
    router.push('/'); 
    // Nota: Em vez de window.location.href, usamos router.push para uma navegação mais limpa
  };

  useEffect(() => {
    // ... O restante da lógica de onAuthStateChange (Anti-Loop) ...
    // Seu código de escuta de estado de sessão vai aqui.
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setLoading(false);
        
        const currentPath = window.location.pathname;
        const destinationPath = '/dashboard';

        if (session && currentPath !== destinationPath) {
            router.push(destinationPath); 
        }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);
  
  // =========================================================

  if (loading) {
    return ( /* Retorna o spinner de carregamento */
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0B57D0]"></div>
      </div>
    );
  }

  if (session) {
    // 2. A função handleLogout AGORA está acessível para ser passada como prop
    return <UserMenu session={session} handleLogout={handleLogout} />; 
  }
  
}