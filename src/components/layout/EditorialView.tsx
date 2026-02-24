'use client';
import React, { useState, useEffect } from 'react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import Footer from '@/components/layout/Footer';
import EditorialToolbar from './EditorialToolBar';
import { GoogleSignInButton } from '@/components/auth';
import { Camera, FileText, ShieldCheck, Lock } from 'lucide-react';
import { useSegment } from '@/hooks/useSegment';

const SEGMENT_ASSETS = {
  PHOTOGRAPHER: {
    path: '/photographer/heros/',
    count: 12, // Quantidade de fotos (1.webp até 12.webp)
  },
  EVENT: {
    path: '/event/heros',
    count: 3,
  },
  OFFICE: {
    path: '/office/heros',
    count: 2,
  },
  CAMPAIGN: {
    path: '/campaign/heros/',
    count: 2,
  },
};
export default function EditorialView({
  title,
  subtitle,
  sectionTitle,
  sectionSubtitle,
  sectionDescription,

  children,
  bgImage,
  altura = 'h-[35vh]',
  showHeroAction = false, // Novo parâmetro para controlar o Login
  showTermsAction = false, // Nova prop para Termos
  showPrivacyAction = false, // Nova prop para Privacidade
  onTermsClick, // Callback para abrir o modal
  onPrivacyClick, // Callback para abrir o modal
  hideContentSection = false, // Nova prop para flexibilidade
  heroCustomAction, // 🎯 Nova Prop para os Cards de Decisão
  heroSecondaryAction, // 🎯 Nova Prop para Ação Secundária
}: any) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentBg, setCurrentBg] = useState<string | null>(null);

  const { segment, SegmentIcon } = useSegment();

  useEffect(() => {
    setIsMounted(true);

    if (bgImage) {
      setCurrentBg(bgImage);
      return;
    }

    // 1. Busca configuração do segmento atual
    const config =
      SEGMENT_ASSETS[segment as keyof typeof SEGMENT_ASSETS] ||
      SEGMENT_ASSETS.PHOTOGRAPHER;

    // 2. Gera um número aleatório entre 1 e o total de fotos (count)
    const randomIndex = Math.floor(Math.random() * config.count) + 1;

    // 3. Monta o caminho final (ex: /heros/campaign/2.webp)
    setCurrentBg(`${config.path}${randomIndex}.webp`);
  }, [bgImage, segment]);

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-petroleum overflow-x-hidden transition-all">
      <LoadingScreen message="Preparando..." fadeOut={isMounted} />
      <EditorialToolbar />

      <div
        className={`relative flex flex-col flex-grow transition-opacity duration-1000 ${isMounted ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* HERO SECTION */}
        <section className={`relative ${altura} flex flex-col overflow-hidden`}>
          <div className="absolute inset-0 z-0 bg-petroleum">
            {' '}
            {/* Fundo sólido para evitar transparência indesejada */}
            {currentBg && (
              <img
                src={currentBg}
                className="w-full h-full object-cover opacity-60 transition-opacity duration-1000"
                style={{ objectPosition: 'center 20%' }}
                alt="Hero Background"
              />
            )}
            {/* Gradiente que "funde" a imagem com a cor do tema (Slate, Ardósia ou Azul Petróleo) */}
            {/* <div className="absolute inset-0 bg-gradient-to-b from-transparent via-petroleum/5 to-petroleum" /> */}
          </div>

          {/* 🎯 ACÕES CUSTOMIZADAS (CARDS) - Centralizados Acima do Título */}
          {heroCustomAction && (
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full px-6">
              {heroCustomAction}
            </div>
          )}

          {/* 🎯 MODO COMPACTO (PÍLULA) - Fixo a 80px do topo e centralizado */}
          {heroSecondaryAction && (
            <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-30 w-full px-6 flex justify-center pointer-events-none">
              <div className="pointer-events-auto">{heroSecondaryAction}</div>
            </div>
          )}

          {/* 🎯 ÁREA DE CONTEÚDO DO HERO: Título + Ação de Login */}
          <div className="absolute bottom-2 left-0 w-full z-10">
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-end justify-between gap-8">
              {/* Lado Esquerdo: Título e Subtítulo */}
              <div className="flex flex-col items-start flex-1">
                <div className="inline-block">
                  <h1 className="text-2xl md:text-5xl font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] italic flex items-center gap-2">
                    <SegmentIcon
                      className="text-champagne shrink-0 transition-all duration-1000 drop-shadow-md w-6 h-6 md:w-12 md:h-12"
                      strokeWidth={1.5}
                    />
                    {title}
                  </h1>
                  <div className="h-[2px] md:h-[3px] bg-gold rounded-full md:mt-2 shadow-lg w-full" />
                </div>
                <p className="text-white text-[10px] md:text-[14px] font-medium tracking-[0.15em] uppercase opacity-80 mt-6 drop-shadow-md">
                  {subtitle}
                </p>
              </div>
              {/* 🎯 Injeção do Modo Compacto aqui */}

              {/* 🎯 Lado Direito: Ações (Google, Termos ou Privacidade) */}
              {(showHeroAction || showTermsAction || showPrivacyAction) && (
                <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-1000">
                  <div className="w-full text-left md:text-right">
                    <p className="text-white text-base md:text-lg font-medium italic leading-tight drop-shadow-md">
                      {showHeroAction && 'Conecte com sua conta do Google'}
                    </p>
                  </div>

                  {/* Bloco de Ação: Botão e Selo Centralizados entre si */}
                  <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
                    <div className="w-full transform transition-all hover:scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                      {showHeroAction && <GoogleSignInButton variant="full" />}
                      {/* Botão de Termos (Estilo Luxury) */}
                      {showTermsAction && (
                        <button
                          onClick={onTermsClick}
                          className="w-full bg-white py-3 px-6 rounded-luxury flex items-center justify-center gap-3 group transition-all"
                        >
                          <FileText size={18} className="text-gold" />
                          <span className="text-[12px] text-petroleum font-semibold uppercase tracking-luxury-tight">
                            Ler Termos de uso
                          </span>
                        </button>
                      )}

                      {/* Botão de Privacidade (Estilo Luxury) */}
                      {showPrivacyAction && (
                        <button
                          onClick={onPrivacyClick}
                          className="w-full bg-white py-3 px-6 rounded-luxury flex items-center justify-center gap-3 group transition-all"
                        >
                          <Lock size={18} className="text-gold" />
                          <span className="text-[12px] text-petroleum font-semibold uppercase tracking-luxury-tight">
                            Ler Política de Privacidade
                          </span>
                        </button>
                      )}
                    </div>

                    {showHeroAction && (
                      <div className="flex items-center justify-center gap-2 text-white text-[9px] font-bold uppercase tracking-[0.2em] cursor-help transition-colors hover:text-gold">
                        <ShieldCheck
                          size={12}
                          className="text-gold"
                          strokeWidth={2.5}
                        />
                        <span>Acesso 100% Seguro via Google Auth</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {!hideContentSection && (
          <section className="w-full bg-white py-10 shadow-sm border-y border-slate-100">
            <div className="max-w-[1600px] mx-auto px-6 md:px-12">
              {(sectionTitle || sectionSubtitle || sectionDescription) && (
                <div className="text-left mb-4 md:mb-14">
                  {sectionTitle && (
                    <p className="text-gold text-xs uppercase tracking-[0.2em] font-semibold mb-2">
                      {sectionTitle}
                    </p>
                  )}

                  {sectionSubtitle && (
                    <h2 className="text-lg md:text-3xl font-semibold text-petroleum italic mb-2">
                      {sectionSubtitle}
                    </h2>
                  )}

                  {sectionDescription && (
                    <p className="text-slate-600 text-sm md:text-base max-w-full font-medium">
                      {sectionDescription}
                    </p>
                  )}
                </div>
              )}
              {children}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}
