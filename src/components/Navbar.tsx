'use client';
import { usePathname } from 'next/navigation';
import { Camera } from 'lucide-react';
import AuthStatusButton from './AuthStatusButton';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.client';

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const isHomePage = pathname === '/';

  useEffect(() => {
    // Verifica sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Escuta mudanças (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

// Condicionais de exibição:
  // Se for a Home OU se não houver usuário logado, não renderiza nada.
  if (isHomePage || !session) return null;

  return (
   <nav className="relative w-full z-50 flex items-center justify-between px-6 py-4 bg-white border-b border-[#DADCE0] transition-all duration-300 shadow-sm">
      <div className="flex items-center gap-2">
        <Camera className="text-[#34A853] w-6 h-6 md:w-8 md:h-8" />
        <span 
          className="text-xl font-bold tracking-tight text-[#3C4043] italic"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Sua Galeria de Fotos
        </span>
      </div>

      <div className="flex items-center gap-4">
        <AuthStatusButton />
      </div>
    </nav>
  );
}