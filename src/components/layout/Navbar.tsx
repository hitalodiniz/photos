'use client';

import { usePathname } from 'next/navigation';
import { Camera } from 'lucide-react';

import Link from 'next/link';

import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from '../auth';

export default function Navbar() {
  const pathname = usePathname();
  const { user, avatarUrl, logout, isLoading } = useAuth();

  const showNavbar =
    user &&
    !isLoading &&
    (pathname === '/dashboard' ||
      pathname === '/onboarding' ||
      pathname.includes('/dashboard/'));

  if (!showNavbar) return null;

  return (
    <>
      {/* Ajuste de Cor: 'bg-[#FFF9F0]/80' para o tom champanhe suave Ajuste de Borda: 'border-[#F3E5AB]' para harmonia cromática */}
      <nav className="fixed top-0 left-0 w-full z-[110] flex items-center justify-between px-6 md:px-10 py-1 bg-[#FFF9F0]/90 backdrop-blur-md border-b border-[#F3E5AB] shadow-sm">
        {/* Branding Editorial com cores ajustadas para o fundo champanhe */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group transition-opacity hover:opacity-80"
        >
          {/* Ícone agora usa um fundo que contrasta com o champanhe */}
          <div className="bg-[#D4AF37] p-1.5 rounded-lg shadow-sm transition-transform group-hover:scale-105">
            <Camera className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="font-artistic text-lg md:text-[20px] font-semibold tracking-tight text-slate-800 italic">
            Espaço <span className="text-[#D4AF37]">Premium</span> do Fotógrafo
          </span>
        </Link>

        {/* Menu do Usuário Integrado */}
        <div className="flex items-center gap-4">
          <UserMenu session={user} avatarUrl={avatarUrl} />
        </div>
      </nav>

      {/* Spacer para garantir que o conteúdo não fique sob a navbar */}
      <div className="h-[65px] w-full" />
    </>
  );
}
