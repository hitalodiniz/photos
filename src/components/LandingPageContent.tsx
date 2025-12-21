'use client';
import React, { useState, useEffect } from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import { Instagram, MessageCircle, Cloud, Zap, Smartphone, Camera } from 'lucide-react';

export default function LandingPageContent() {
  const heroImages = [
    '/hero-bg-1.jpg', '/hero-bg-2.jpg', '/hero-bg-3.jpg',
    '/hero-bg-4.jpg', '/hero-bg-5.jpg', '/hero-bg-6.jpg',
    '/hero-bg-7.jpg', '/hero-bg-8.jpg', '/hero-bg-9.jpg',
    '/hero-bg-10.jpg', '/hero-bg-11.jpg', '/hero-bg-12.jpg'
  ];

  const [bgImage, setBgImage] = useState('');

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    const selectedImage = heroImages[randomIndex];
    const img = new Image();
    img.src = selectedImage;
    img.onload = () => setBgImage(selectedImage);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND FIXO */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 w-full h-full transition-opacity duration-1000"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.9) 100%), url('${bgImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: '50% 30%',
            opacity: bgImage ? 1 : 0
          }}
        />
      </div>

      {/* CONTEÚDO FLUIDO */}
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* HERO (DOBRA 1) - Espaço dinâmico */}
        <header className="flex-none pt-4 md:pt-8 pb-2 flex flex-col items-center justify-center text-center px-4">
          <div className="flex flex-col items-center gap-2 md:gap-4">
            <div className="p-3 md:p-4 bg-white/5 backdrop-blur-xl rounded-full border border-yellow-200/30 shadow-2xl">
              <Camera className="text-[#F3E5AB] w-8 h-8 md:w-12 md:h-12 drop-shadow-[0_0_8px_rgba(243,229,171,0.5)]" />
            </div>

            <h1
              className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-2xl italic"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Sua Galeria de Fotos
            </h1>

            <p className="text-sm md:text-xl text-white/90 font-light tracking-wide italic whitespace-nowrap">
              Transformando o Google Drive™ em uma <span className="font-bold border-b-2 border-[#34A853] text-white">Galeria Profissional</span>
            </p>

            <div className="w-full max-w-sm mt-2 md:mt-2 transition-transform hover:scale-105">
              <GoogleSignInButton />
            </div>
          </div>
        </header>

        {/* FEATURES (MEIO) - flex-grow preenche o espaço sem empurrar o footer para fora */}
        <main className="flex-grow flex items-center justify-center px-4 py-8">
          
          <section className="w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-[2.5rem] p-4 md:p-6 shadow-2xl border border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 text-center">
              <FeatureItem
                icon={<Cloud className="w-10 h-10 text-[#4285F4]" />}
                title="Cloud Power"
                desc="Use o armazenamento que você já possui no Drive."
                bgColor="bg-blue-100"
              />
              <FeatureItem
                icon={<Zap className="w-10 h-10 text-[#FBBC05] fill-[#FBBC05]" />}
                title="Entrega Instantânea"
                desc="Subiu no Drive, está na galeria. Simples assim."
                bgColor="bg-yellow-100"
              />
              <FeatureItem
                icon={<Smartphone className="w-10 h-10 text-[#34A853]" />}
                title="Foco em Mobile"
                desc="Galerias otimizadas para WhatsApp e smartphones."
                bgColor="bg-green-100"
              />
            </div>
          </section>
        </main>

        {/* RODAPÉ (FINAL) - Sempre visível na base */}
        <footer className="flex-none w-full py-8 px-6 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm border-t border-white/10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-[#D4AF37]" />
                <span className="text-xl font-bold text-white italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Sua Galeria de Fotos
                </span>
              </div>
              <p className="text-gray-400 text-[11px] font-medium tracking-wide flex gap-4">
                <span>© {new Date().getFullYear()} • Integrado com Google Drive™</span>
                <a href="/privacidade" className="hover:text-[#D4AF37] underline underline-offset-4">Política de Privacidade</a>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <SocialIcon icon={<Instagram size={22} />} title="Instagram" hoverColor="hover:text-[#E1306C]" />
              <SocialIcon icon={<MessageCircle size={22} />} title="WhatsApp" hoverColor="hover:text-[#25D366]" />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Sub-componentes para limpeza do código
function FeatureItem({ icon, title, desc, bgColor }: { icon: React.ReactNode, title: string, desc: string, bgColor: string }) {
  return (
    <div className="flex flex-col items-center group">
      <div className={`mb-4 p-5 ${bgColor} rounded-2xl transition-transform group-hover:scale-110 duration-300`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#202124] mb-2">{title}</h3>
      <p className="text-[#5F6368] text-sm leading-relaxed max-w-[200px]">{desc}</p>
    </div>
  );
}

function SocialIcon({ icon, title, hoverColor }: { icon: React.ReactNode, title: string, hoverColor: string }) {
  return (
    <a href="#" className={`p-3 bg-white/5 rounded-full text-[#F3E5AB] border border-white/10 transition-all duration-300 ${hoverColor} hover:bg-white/10 shadow-xl`} title={title}>
      {icon}
    </a>
  );
}