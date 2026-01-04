'use client';

import { usePathname } from 'next/navigation';
import { Camera } from 'lucide-react';
import { UserMenu } from '@/components/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.client';
import { Session, User } from '@supabase/supabase-js'; // Importação do tipo oficial
import Link from 'next/link';

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async (user: User) => {
      if (!user) return;
      const { data } = await supabase
        .from('tb_profiles')
        .select('profile_picture_url')
        .eq('id', user.id)
        .single();

      if (data?.profile_picture_url) {
        setAvatarUrl(data.profile_picture_url);
      }
    };

    // 1. Busca a sessão inicial ao carregar a página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfileData(session.user);
    });

    // 2. Escuta mudanças de estado (Login, Logout, Token Refreshed)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === 'SIGNED_IN' && session?.user) {
        // Busca dados do perfil apenas quando o login for confirmado
        fetchProfileData(session.user);
      } else if (event === 'SIGNED_OUT') {
        // Limpa os estados locais imediatamente para evitar "vazamento" de dados na UI
        setAvatarUrl(null);
        setSession(null);
      }
    });

    // Limpa a inscrição ao desmontar o componente para evitar vazamento de memória
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    // 1. Encerra a sessão no Supabase
    await supabase.auth.signOut();

    // 2. Redireciona para o domínio principal (sem subdomínio)
    // Isso garante que o usuário saia da área logada do subdomínio
    const mainDomain =
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    window.location.href = mainDomain;
  };

  const showNavbar =
    session &&
    (pathname === '/dashboard' ||
      pathname === '/onboarding' ||
      pathname.includes('/dashboard/'));

  if (!showNavbar) return null;

  return (
    <>
      {/* Ajuste de Cor: 'bg-[#FFF9F0]/80' para o tom champanhe suave 
        Ajuste de Borda: 'border-[#F3E5AB]' para harmonia cromática
      */}
      <nav
        className="fixed top-0 left-0 w-full z-[110] flex items-center justify-between px-6 md:px-10 
      py-1 bg-[#FFF9F0]/90 backdrop-blur-md border-b border-[#F3E5AB] shadow-sm"
      >
        {/* Branding Editorial com cores ajustadas para o fundo champanhe */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group transition-opacity hover:opacity-80"
        >
          {/* Ícone agora usa um fundo que contrasta com o champanhe */}
          <div className="bg-[#D4AF37] p-1.5 rounded-lg shadow-sm transition-transform group-hover:scale-105">
            <Camera className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span
            className="text-lg md:text-[20px] font-bold tracking-tight text-slate-800 italic"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Espaço <span className="text-[#D4AF37]">Premium</span> do Fotógrafo
          </span>
        </Link>

        {/* Menu do Usuário Integrado */}
        <div className="flex items-center gap-4">
          <UserMenu
            session={session}
            handleLogout={handleLogout}
            avatarUrl={avatarUrl}
          />
        </div>
      </nav>

      {/* Spacer para garantir que o conteúdo não fique sob a navbar */}
      <div className="h-[65px] w-full" />
    </>
  );
}
