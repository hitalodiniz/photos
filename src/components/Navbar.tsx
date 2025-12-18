'use client';
import { usePathname } from 'next/navigation';
import { Camera } from 'lucide-react';
import AuthStatusButton from './AuthStatusButton';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.client';

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);

  // Lógica de visibilidade:
  const isHomePage = pathname === '/';
  
  /**
   * Identifica se é uma página de galeria pública.
   * Geralmente essas URLs têm o formato /fotografo/2025/10/ensaio
   * Verificamos se o caminho tem mais de 2 partes (ex: ['', 'username', 'slug'])
   */
  const isGalleryView = pathname?.split('/').filter(Boolean).length >= 2;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Condicionais de exibição:
  // Agora também oculta se for uma página de Galeria (isGalleryView)
  if (isHomePage || isGalleryView || !session) return null;

  return (
    <nav className="relative w-full z-50 flex items-center justify-between px-10 py-4 bg-white border-b border-[#DADCE0] transition-all duration-300 shadow-sm">
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