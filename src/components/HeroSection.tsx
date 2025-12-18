'use client';
import React, { useState, useEffect } from 'react';
import { Camera, MapPin } from 'lucide-react';

export default function HeroSection() {
  // 1. Array com os nomes exatos dos arquivos da sua pasta pública
  const heroImages = [
    '/hero-bg (1).jpg', '/hero-bg (2).jpg', '/hero-bg (3).jpg', 
    '/hero-bg (4).jpg', '/hero-bg (5).jpg', '/hero-bg (6).jpg', 
    '/hero-bg (7).jpg', '/hero-bg (8).jpg', '/hero-bg (9).jpg', 
    '/hero-bg (10).jpg', '/hero-bg (11).jpg', '/hero-bg.jpg'
  ];

  const [bgImage, setBgImage] = useState('');

  useEffect(() => {
    // Sorteia uma imagem ao carregar a página
    const randomImg = heroImages[Math.floor(Math.random() * heroImages.length)];
    setBgImage(randomImg);
  }, []);

  return (
    <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* IMAGEM DE FUNDO DINÂMICA */}
      <div className="absolute inset-0 z-0 transition-opacity duration-1000 ease-in" style={{ opacity: bgImage ? 1 : 0 }}>
        <img
          src={bgImage}
          alt="Background Editorial"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />
      </div>

      {/* CONTEÚDO CENTRAL (Baseado nos seus prints) */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        
        {/* ÍCONE DA CÂMERA (Conforme seu arquivo {F9AF7A0C...}.png) */}
        <div className="flex items-center justify-center w-20 h-20 border border-[#D4AF37]/50 rounded-full bg-[#D4AF37]/10 backdrop-blur-md">
          <Camera className="text-[#D4AF37] w-10 h-10" />
        </div>

        {/* TEXTOS (Conforme seu arquivo {183EE5B7...}.png) */}
        <div className="text-center space-y-2">
          <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.4em] block mb-2">
            Portfólio Privado
          </span>
          
          <h1 
            className="text-white text-4xl md:text-7xl font-bold italic tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Ensaio Editorial • Marina & Costa
          </h1>

          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="flex items-center gap-2 text-white/70 text-sm uppercase tracking-widest font-light">
              <MapPin size={14} className="text-[#D4AF37]" />
              <span>Estúdio Luz, São Paulo</span>
            </div>
            <span className="text-white/20">|</span>
            <span className="text-[#34A853] text-sm font-medium tracking-wide italic">
              Sincronizado com Drive
            </span>
          </div>
        </div>
      </div>

      {/* RODAPÉ DINÂMICO */}
      <div className="absolute bottom-10 z-10">
        <p className="text-white/40 text-[10px] uppercase tracking-[0.5em] font-bold">
          © {new Date().getFullYear()} • Curadoria Exclusiva
        </p>
      </div>
    </section>
  );
}