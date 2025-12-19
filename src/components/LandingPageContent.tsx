'use client';
import React, { useState, useEffect } from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import { Instagram, MessageCircle, Cloud, Zap, Smartphone, Camera, MapPin } from 'lucide-react';

export default function LandingPageContent() {

  // 1. Array com os nomes exatos dos arquivos da sua pasta pública
  const heroImages = [
    '/hero-bg-1.jpg', '/hero-bg-2.jpg', '/hero-bg-3.jpg',
    '/hero-bg-4.jpg', '/hero-bg-5.jpg', '/hero-bg-6.jpg',
    '/hero-bg-7.jpg', '/hero-bg-8.jpg', '/hero-bg-9.jpg',
    '/hero-bg-10.jpg', '/hero-bg-11.jpg', '/hero-bg-12.jpg'
  ];

  // 2. Estado para armazenar a imagem sorteada
  const [bgImage, setBgImage] = useState('');

  // 3. Lógica para sortear a foto ao carregar a página
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    const selectedImage = heroImages[randomIndex];

    // Pré-carregamento imediato
    const img = new Image();
    img.src = selectedImage;

    img.onload = () => {
      setBgImage(selectedImage);
    };
  }, []);

  return (

    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      <header className="relative h-screen w-full flex items-start justify-center overflow-hidden shrink-0 pt-8 md:pt-12">
        {/* DIV ATUALIZADA COM bgImage DINÂMICO */}
        <div
          className="absolute inset-0 z-0 w-full h-[100%]" // h-120% dá margem para a foto "correr"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.9) 100%), url('${bgImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: bgImage ? 1 : 0 // Só mostra quando a URL estiver pronta
          }}
        />
        {/* Conteúdo do Hero */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <div className="flex flex-col items-center gap-4 md:gap-6">
            {/* Ícone com borda dourada suave e fundo blur */}
            <div className="p-3 md:p-4 bg-white/5 backdrop-blur-xl rounded-full border border-yellow-200/30 shadow-2xl">
              <Camera className="text-[#F3E5AB] w-8 h-8 md:w-12 md:h-12 drop-shadow-[0_0_8px_rgba(243,229,171,0.5)]" />
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
            <div className="w-full max-w-sm mt-10 transition-transform hover:scale-105">
              <GoogleSignInButton />
            </div>
          </div>
        </div>
      </header>
      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-grow bg-transparent relative z-10">
        {/* SEÇÃO DE FEATURES COM MARGEM NEGATIVA MAIOR */}
        {/* Ajuste de -mt-20 para -mt-40 (ou o valor que preferir) para subir o card */}
        <section className="relative px-4 -mt-[54vh]">
          {/* Adicionado bg-white/95 e backdrop-blur para um efeito luxuoso que conversa com a foto de fundo */}
          <div className="max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-[2.0rem] 
    p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
              <FeatureItem
                icon={<Cloud className="w-10 h-10 text-[#4285F4] drop-shadow-[0_0_8px_rgba(66,133,244,0.4)]" />}
                title="Cloud Power"
                desc="Use o armazenamento que você já possui no Drive sem custos extras."
                bgColor="bg-blue-100/100"
              />
              <FeatureItem
                icon={<Zap className="w-10 h-10 text-[#FBBC05] fill-[#FBBC05] drop-shadow-[0_0_8px_rgba(251,188,5,0.4)]" />}
                title="Entrega Instantânea"
                desc="Subiu no Drive, está na galeria. Simples assim."
                bgColor="bg-yellow-100/100"
              />
              <FeatureItem
                icon={<Smartphone className="w-10 h-10 text-[#34A853] drop-shadow-[0_0_8px_rgba(52,168,83,0.4)]" />}
                title="Foco em Mobile"
                desc="Galerias otimizadas para WhatsApp e visualização em smartphones."
                bgColor="bg-green-100/100"
              />
            </div>
          </div>
        </section>

        {/* ACESSO CLIENTE - Ajustado para fundo transparente para não cortar a foto de fundo 
  <section className="px-4 py-16">
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-6">
      <label
        className="text-xl md:text-2xl font-bold text-white tracking-tight whitespace-nowrap drop-shadow-md"
        htmlFor="gallery-code"
      >
        Acesse sua Galeria de Fotos
      </label>

      <form className="flex items-center gap-3 w-full md:w-auto">
        <div className="relative">
          <input
            id="gallery-code"
            type="text"
            placeholder="Código da galeria"
            className="w-48 md:w-64 px-4 py-3 bg-white text-black font-bold text-center text-lg border-2 border-transparent rounded-xl outline-none transition-all focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/20"
          />
        </div>

        <button
          type="submit"
          className="bg-[#D4AF37] hover:bg-[#B8962E] text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg text-sm uppercase tracking-widest active:scale-95"
        >
          Entrar
        </button>
      </form>
    </div>
  </section>
  */}
      </main>
      {/* RODAPÉ */}


      {/*<div className="flex flex-col md:flex-row items-center justify-center gap-4 
      md:gap-6 bg-black/45 backdrop-blur-lg p-5 md:p-2.5 md:px-6 rounded-[2.5rem] md:rounded-full border border-white/10 
      shadow-2xl inline-flex w-auto max-w-[95%] md:max-w-max mx-auto transition-all mt-14 md:mt-2">

      <footer className="bg-[#2D2E30] relative w-full mt-[-80px] md:mt-[-100px] py-10 px-6 bg-white/60
      backdrop-blur-sm border-t border-white/10 w-full mt-auto" >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 ">*/}
      <footer className="flex-none w-full py-6 px-6 bg-gradient-to-t
      bg-black/10      
      mt-[-100px] 
      md:mt-[-160px] 
      py-8 
      backdrop-blur-sm 
      border-t 
      border-white/50      
      
      " >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 ">
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
            <p className="text-gray-400 text-[11px] font-medium tracking-wide flex gap-4">
              <span>© {new Date().getFullYear()} • Integrado com Google Drive™</span>
              <a href="/privacidade" className="hover:text-[#D4AF37] underline underline-offset-4">Política de Privacidade</a>
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
              <Instagram size={22} className="transition-transform duration-300 group-hover:scale-110 text-[#F3E5AB]" />
            </a>

            <a
              href="#"
              className="group p-3 bg-white/5 rounded-full text-gray-400 border border-white/10 transition-all duration-300 
               hover:text-[#25D366] hover:border-[#25D366]/50 hover:bg-[#25D366]/10 
               hover:shadow-[0_0_15px_rgba(37,211,102,0.3)]"
              title="Fale conosco no WhatsApp"
            >
              <MessageCircle size={22} className="transition-transform duration-300 group-hover:scale-110 text-[#F3E5AB]" />
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