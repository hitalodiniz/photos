'use client';
import React, { useState, useEffect } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';

interface EditorialHeroProps {
  title: string;
  coverUrl: string;
  sideElement?: React.ReactNode; // Avatar
  children: React.ReactNode; // Bio
}

export const EditorialHero = ({
  title,
  coverUrl,
  sideElement,
  children,
}: EditorialHeroProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsExpanded(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50 && isExpanded) setIsExpanded(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  return (
    <section
      className={`relative overflow-hidden transition-all duration-[1200ms] z-5 ${
        isExpanded ? 'h-screen' : 'h-[32vh] md:h-[45vh]'
      }`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[3000ms]"
        style={{
          backgroundImage: `url('${coverUrl}')`,
          backgroundPosition: 'center 40%',
        }}
      />

      {/* Camada de escurecimento para leitura */}
      <div className="absolute inset-0 bg-black/30" />

      <div
        className={`relative h-full flex flex-col transition-all duration-[1200ms] max-w-[1600px] mx-auto w-full 
          ${
            isExpanded
              ? 'justify-end pb-20 md:pb-24 px-6 md:px-12 items-start'
              : 'justify-end pb-6 md:pb-8 px-6 md:px-12 items-start'
          }`}
      >
        <div
          className={`w-full transition-all duration-1000 ${isExpanded ? 'scale-100' : 'scale-100'}`}
        >
          {/* LINHA SUPERIOR: AVATAR + NOME */}
          <div className="flex items-center gap-4 md:gap-6 mb-4">
            {/* AVATAR */}
            <div className="shrink-0">
              {React.isValidElement(sideElement)
                ? React.cloneElement(sideElement as any, { isExpanded })
                : sideElement}
            </div>

            {/* NOME E LINHA */}
            <div className="flex flex-col items-start min-w-0">
              <h1
                className={`font-artistic font-semibold text-white transition-all duration-1000 drop-shadow-md leading-tight tracking-tight break-words ${
                  isExpanded ? 'text-3xl md:text-6xl' : 'text-2xl md:text-4xl'
                }`}
              >
                {title}
              </h1>
              <div className="h-[2px] md:h-[3px] bg-[#F3E5AB] rounded-full shadow-lg w-full mt-1" />
            </div>
          </div>

          {/* LINHA INFERIOR: BIOGRAFIA (Abaixo de tudo) */}
          <div
            className={`w-full transition-all duration-1000 delay-100 ${isExpanded ? 'opacity-100' : 'opacity-90'}`}
          >
            <div className="max-w-3xl">
              {React.Children.map(children, (child) =>
                React.isValidElement(child)
                  ? React.cloneElement(child as any, { isExpanded })
                  : child,
              )}
            </div>
          </div>
        </div>

        {/* BOTÕES DE NAVEGAÇÃO */}
        {isExpanded ? (
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-white/60 hover:text-[#F3E5AB] p-2"
          >
            <ChevronDown size={32} />
          </button>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-6 right-8 flex items-center justify-center bg-black/40 backdrop-blur-md text-white/90 rounded-lg shadow-xl border border-white/10 active:scale-95 hover:bg-black/60 transition-all"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
