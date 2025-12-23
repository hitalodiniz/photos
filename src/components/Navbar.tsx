'use client';
import { usePathname } from 'next/navigation';
import { Camera } from 'lucide-react';
import AuthStatusButton from './AuthStatusButton';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.client';
import Link from 'next/link';

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);

  const isHomePage = pathname === '/';
  const isPrivacidadePage = pathname === '/privacidade';
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

  if (isHomePage || isPrivacidadePage || isGalleryView || !session) return null;

  return (
    <>
      {/* 1. Alterado para fixed, top-0 e left-0 */}
      <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 md:px-10 py-4 bg-white/90 backdrop-blur-md border-b border-[#DADCE0] shadow-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group transition-opacity hover:opacity-80"
        >
          <Camera className="text-[#34A853] w-6 h-6 md:w-8 md:h-8 transition-transform group-hover:scale-105" />
          <span
            className="text-lg md:text-xl font-bold tracking-tight text-[#3C4043] italic"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Sua Galeria de Fotos
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <AuthStatusButton />
        </div>
      </nav>

      {/* 2. Elemento de espaçamento (Spacer) */}
      <div className="h-[72px] w-full" />
    </>
  );
}