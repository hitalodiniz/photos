'use client';
import React, { useState, useEffect } from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import DynamicHeroBackground from './DynamicHeroBackground';
import Footer from './Footer';
import { Instagram, MessageCircle, Cloud, Zap, Smartphone, Camera, CloudUpload, Infinity } from 'lucide-react';

export default function LandingPageContent() {

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND FIXO - Gradiente padronizado */}
      <DynamicHeroBackground />

      {/* CONTEÚDO FLUIDO - Flex-col para permitir o crescimento do Main */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* HERO (DOBRA 1) - Mantido flex-none para não esticar */}
        <header className="flex-none pt-8 md:pt-12 flex flex-col items-center justify-center text-center px-4">
          <div className="flex flex-col items-center gap-2 md:gap-4">
            <div className="p-4 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
              <Camera className="text-[#F3E5AB] w-8 h-8 md:w-12 md:h-12 drop-shadow-[0_0_15px_rgba(243,229,171,0.3)]" />
            </div>

            <div className="space-y-6">
              <h1
                className="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow-2xl italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Sua Galeria de Fotos
              </h1>

              <p className="text-sm md:text-xl text-white/90 font-light tracking-wide italic  pb-4">
                Transformando o Google Drive™ em uma <span className="font-bold border-b-2 border-[#34A853] text-white">Galeria Profissional</span>
              </p>
            </div>
          </div>
          {/* Espaçamento entre o Header e o Main */}
          <div className="flex items-center justify-center w-full md:pt-6 pb-0 transition-transform hover:scale-105">
            <GoogleSignInButton />
          </div>
        </header>


        {/* SEÇÃO DE FEATURES - flex-grow centraliza a section entre o header e footer */}
        <main className="flex-grow flex items-center justify-center px-6 py-4 md:px-4 md:py-8">
          <section className="w-full max-w-[92%] sm:max-w-5xl mx-auto bg-white/90 
    rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-14 shadow-2xl border border-white/50">
            {/* Simetria lateral: justify-items-center e px equilibrado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 md:gap-y-12 gap-x-6 md:gap-x-12 lg:gap-x-20 justify-items-center">
              <FeatureItem
                icon={<Cloud size={30} />}
                title="Cloud Power"
                desc="Use o armazenamento que você já possui no Google Drive™"
              />
              <FeatureItem
                icon={<Zap size={30} className="fill-[#D4AF37]/20" />}
                title="Entrega Instantânea"
                desc="Subiu no Google Drive™, está na galeria. Simples assim"
              />
              <FeatureItem
                icon={<Smartphone size={30} />}
                title="Foco em Mobile"
                desc="Galerias otimizadas para WhatsApp e smartphones"
              />
              <FeatureItem
                icon={<Infinity size={30} />}
                title="Fotos Ilimitadas"
                desc="Sem limites de upload ou cobranças por download"
              />
              <FeatureItem
                icon={<Camera size={30} />}
                title="Qualidade Ultra HD"
                desc="Preservação total da resolução original das fotos"
              />
              <FeatureItem
                icon={<CloudUpload size={30} />}
                title="Nuvem Vitalícia"
                desc="Suas fotógrafias seguras e acessíveis para sempre"
              />
            </div>
          </section>
        </main>

        {/* RODAPÉ - flex-none fixo na base */}
        <Footer />
      </div>
    </div>
  );
}

{/* Componente FeatureItem - Design Compacto e Alinhado */ }
function FeatureItem({ icon, title, desc }) {
  return (

    <div className="flex flex-row items-center gap-4 group transition-all w-full max-w-[260px] sm:max-w-[280px]">
      {/* Ícone: Fundo sólido suave para destacar no branco translúcido */}
      <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-[#FAF7ED] rounded-2xl flex items-center justify-center 
        border border-[#D4AF37]/50 group-hover:border-[#D4AF37] group-hover:bg-[#F3E5AB] transition-all text-[#D4AF37] shadow-sm">
        {icon}
      </div>

      {/* Textos: Alinhados imediatamente à frente do ícone */}
      <div className="flex flex-col min-w-0">
        <h3 className="text-slate-900 font-bold text-[12px] md:text-[16px] leading-tight mb-1">
          {title}
        </h3>
        <p className="text-slate-500 text-[12px] md:text-[14px] leading-tight transition-all 
        group-hover:text-slate-800 italic truncate 
        sm:whitespace-normal
        font-light tracking-wide whitespace-normal break-words"
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

