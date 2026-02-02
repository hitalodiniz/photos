'use client';
import React from 'react';
import { Instagram, LayoutGrid, Menu, Camera, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GoogleSignInButton } from '@/components/auth';

export default function EditorialToolbar() {
  const router = useRouter();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-petroleum/95 backdrop-blur-md border-b border-white/10 h-12 flex items-center justify-between px-4 md:px-10 transition-all shadow-2xl">
      {/* Lado Esquerdo: Identidade Visual Slim */}
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => router.push('/')}
        >
          <Camera
            className="w-5 h-5 text-[#F3E5AB] group-hover:scale-110 transition-transform"
            strokeWidth={1.5}
          />
          <span className="font-artistic text-[18px] font-semibold text-white italic tracking-tight">
            Sua Galeria
          </span>
        </div>
      </div>

      {/* Lado Direito: Ações Integradas e Minimalistas */}
      <div className="flex items-center gap-2 md:gap-5">
        {/* BOTOES DE NAVEGAÇÃO: Sem fundo sólido, apenas hover suave */}
        <div className="hidden md:flex items-center gap-4 border-r border-white/10 pr-5">
          <button
            onClick={() => router.push('/planos')}
            className="text-white/70 hover:text-gold transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]"
          >
            <LayoutGrid size={14} />
            Planos
          </button>

          <a
            href="https://instagram.com/suagaleria"
            target="_blank"
            className="text-white/70 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]"
          >
            <Instagram size={14} />
            Insta
          </a>
        </div>

        {/* ÁREA DE LOGIN: Integrada para parecer um botão nativo do sistema */}
        <div className="flex items-center gap-4">
          <div className="relative group overflow-hidden">
            {/* DICA: Se o GoogleSignInButton permitir, passe uma prop de 'minimal' 
                para remover o logo colorido e usar apenas o ícone LogIn da Lucide 
             */}
            <div className="scale-90 origin-right hover:brightness-110 transition-all">
              <GoogleSignInButton variant="minimal" />
            </div>
          </div>

          {/* MENU HAMBURGUER: Ação final da barra */}
          <button className="text-white/60 hover:text-gold transition-colors p-1 border-l border-white/10 pl-4 ml-2">
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </nav>
  );
}
