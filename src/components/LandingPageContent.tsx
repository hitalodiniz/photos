'use client';
import React from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import { Instagram, MessageCircle, Cloud, Zap, Smartphone, Camera } from 'lucide-react';

export default function LandingPageContent() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F1F3F4]">
      {/* HERO SECTION - Conteúdo movido para o topo com estilo artístico */}
      <header className="relative h-[40vh] min-h-[450px] w-full flex items-start justify-center overflow-hidden shrink-0 pt-8 md:pt-12">
        {/* Camada da Imagem Local */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%), url('/hero-bg.jpg')`
          }}
        />
        {/* Overlay para contraste */}


        {/* Conteúdo do Hero */}
        <div className="relative z-20 text-center px-4">
          <div className="flex flex-col items-center gap-4 md:gap-6">

            {/* Ícone com borda dourada suave e fundo blur */}
            <div className="p-3 md:p-4 bg-white/5 backdrop-blur-xl rounded-full border border-yellow-200/30 shadow-2xl">
              <Camera className="text-[#F3E5AB] w-8 h-8 md:w-10 md:h-10 drop-shadow-[0_0_8px_rgba(243,229,171,0.5)]" />
            </div>

            {/* Título Artístico Serifado */}
            <h1
              className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-2xl italic"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Sua Galeria de Fotos
            </h1>

            {/* Subtítulo em linha única com destaque no verde do Drive */}
            <p className="text-sm md:text-xl text-white/90 font-light tracking-wide italic whitespace-nowrap">
              Transformando o Google Drive™ em uma <span className="font-bold border-b-2 border-[#34A853] text-white">Galeria Profissional</span>
            </p>

            {/* Botão de Login */}
            <div className="w-full max-w-sm mt-2 transition-transform hover:scale-105">
              <GoogleSignInButton />
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="bg-[#F1F3F4] flex-grow">
        {/* SEÇÃO DE FEATURES */}
        <section className="relative z-20 -mt-20 px-4">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              <FeatureItem
                icon={<Cloud className="w-10 h-10 text-[#4285F4] drop-shadow-[0_0_8px_rgba(66,133,244,0.4)]" />}
                title="Cloud Power"
                desc="Use o armazenamento que você já possui no Drive sem custos extras."
                bgColor="bg-blue-50"
              />
              <FeatureItem
                icon={<Zap className="w-10 h-10 text-[#FBBC05] fill-[#FBBC05] drop-shadow-[0_0_8px_rgba(251,188,5,0.4)]" />}
                title="Entrega Instantânea"
                desc="Subiu no Drive, está na galeria. Simples assim."
                bgColor="bg-yellow-50"
              />
              <FeatureItem
                icon={<Smartphone className="w-10 h-10 text-[#34A853] drop-shadow-[0_0_8px_rgba(52,168,83,0.4)]" />}
                title="Foco em Mobile"
                desc="Galerias otimizadas para WhatsApp e visualização em smartphones."
                bgColor="bg-green-50"
              />
            </div>
          </div>
        </section>

        {/* ACESSO CLIENTE */}
        <section className="px-4 py-8 bg-[#F8F9FA]">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-4 md:gap-6">
            {/* Título sem quebra */}
            <label
              className="text-xl md:text-2xl font-bold text-[#3C4043] tracking-tight whitespace-nowrap"
              htmlFor="gallery-code"
            >
              Acesse sua Galeria de Fotos
            </label>

            {/* Formulário em linha única */}
            <form className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative group">
                <input
                  id="gallery-code"
                  type="text"
                  placeholder="Código da galeria"
                  className="
            w-48 md:w-64 px-4 py-3 
            bg-white text-black font-bold text-center text-lg
            border-2 border-gray-400 rounded-xl outline-none
            transition-all duration-300
            placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal
            focus:border-[#4285F4] 
            focus:ring-4 focus:ring-[#4285F4]/10 
            focus:shadow-[0_0_15px_rgba(66,133,244,0.2)]"
                />
              </div>

              <button
                type="submit"
                className="
          bg-[#1A73E8] hover:bg-[#174EA6] 
          text-white font-bold py-3.5 px-8 
          rounded-xl transition-all shadow-md hover:shadow-lg
          text-sm uppercase tracking-widest active:scale-95
        "
              >
                Entrar
              </button>
            </form>
          </div>
        </section>
      </main >
      {/* RODAPÉ */}
      <footer className="bg-[#2D2E30] border-t border-white/5 py-10 px-6 w-full mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">

          {/* Lado Esquerdo: Branding e Texto */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <Camera className="w-6 h-6 text-[#F3E5AB]" />
              <span
                className="text-xl font-bold tracking-tight text-white italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Sua Galeria de Fotos
              </span>
            </div>
            <p className="text-gray-400 text-[11px] font-medium tracking-wide uppercase">
              © 2025 • Integrado com Google Drive™
            </p>
          </div>

          {/* Lado Direito: Social Icons com Glow Artístico */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="group p-3 bg-white/5 rounded-full text-gray-400 border border-white/10 transition-all duration-300 
               hover:text-[#E1306C] hover:border-[#E1306C]/50 hover:bg-[#E1306C]/10 
               hover:shadow-[0_0_15px_rgba(225,48,108,0.3)]"
              title="Siga no Instagram"
            >
              <Instagram size={22} className="transition-transform duration-300 group-hover:scale-110" />
            </a>

            <a
              href="#"
              className="group p-3 bg-white/5 rounded-full text-gray-400 border border-white/10 transition-all duration-300 
               hover:text-[#25D366] hover:border-[#25D366]/50 hover:bg-[#25D366]/10 
               hover:shadow-[0_0_15px_rgba(37,211,102,0.3)]"
              title="Fale conosco no WhatsApp"
            >
              <MessageCircle size={22} className="transition-transform duration-300 group-hover:scale-110" />
            </a>
          </div>
        </div>
      </footer>
    </div >
  );
}

function FeatureItem({
  icon,
  title,
  desc,
  bgColor
}: {
  icon: React.ReactNode,
  title: string,
  desc: string,
  bgColor: string
}) {
  return (
    <div className="flex flex-col items-center text-center group cursor-default">
      {/* Container do Ícone com Animação no Hover */}
      <div className={`
        mb-6 p-5 ${bgColor} rounded-2xl 
        transition-all duration-500 
        group-hover:animate-pulse-slow 
        group-hover:shadow-[0_0_20px_rgba(0,0,0,0.05)]
      `}>
        {icon}
      </div>

      <h3 className="text-xl font-bold text-[#202124] mb-2 tracking-tight group-hover:text-[#1A73E8] transition-colors">
        {title}
      </h3>

      <p className="text-[#5F6368] text-sm leading-relaxed max-w-[220px]">
        {desc}
      </p>
    </div>
  );
}