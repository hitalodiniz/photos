'use client';
import React from 'react';
import { Camera, ArrowLeft, ShieldCheck, Lock, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* HEADER EDITORIAL (Estilo Landing Page) */}
      <header className="relative py-10 px-6 overflow-hidden bg-white border-b border-gray-100">
        {/* Elemento Decorativo (Nuvem/Blur) similar ao Hero */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-4xl mx-auto text-center md:text-left">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-[#D4AF37] hover:opacity-70 transition-all mb-6 text-xs font-bold uppercase tracking-[0.3em]"
          >
            <ArrowLeft size={14} />
            Voltar ao Início
          </Link>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
             {/* Ícone da Câmera Idêntico ao da Home */}
            <div className="flex items-center justify-center w-16 h-16 border border-[#D4AF37]/50 rounded-full bg-[#D4AF37]/5 backdrop-blur-sm">
              <Camera className="text-[#D4AF37] w-8 h-8" />
            </div>

            <div className="flex flex-col gap-2">
              <h1 
                className="text-3xl md:text-5xl font-bold italic text-[#3C4043] tracking-tight leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Privacidade & Segurança
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-2 text-[10px] md:text-xs uppercase tracking-[0.4em] text-[#D4AF37] font-bold">
                <ShieldCheck size={14} />
                <span>Compromisso com suas Memórias</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO ARTÍSTICO */}
      <main className="max-w-4xl mx-auto py-6 px-6">
        <div className="space-y-16">
          
          {/* Item 1 */}
          <section className="group">
            <h3 className="text-2xl font-bold text-[#3C4043] mb-2 flex items-center gap-3 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[#D4AF37] not-italic text-sm font-sans font-bold">01.</span> 
              Sua Propriedade
            </h3>
            <p className="text-gray-500 leading-relaxed text-lg font-light">
              Nossa plataforma atua apenas como uma vitrine de luxo para o seu conteúdo hospedado no <strong>Google Drive™</strong>. 
              Não armazenamos, replicamos ou reivindicamos direitos sobre qualquer imagem visualizada. O controle total permanece em sua conta original.
            </p>
          </section>

          {/* Item 2 */}
          <section className="group">
            <h3 className="text-2xl font-bold text-[#3C4043] mb-2 flex items-center gap-3 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[#D4AF37] not-italic text-sm font-sans font-bold">02.</span> 
              Acesso Restrito
            </h3>
            <p className="text-gray-500 leading-relaxed text-lg font-light">
              O acesso às galerias é protegido por códigos exclusivos gerados pelo fotógrafo. Utilizamos criptografia de ponta a ponta 
              fornecida pela infraestrutura do Google para garantir que sua privacidade nunca seja comprometida por terceiros.
            </p>
          </section>

          {/* Item 3 */}
          <section className="group">
            <h3 className="text-2xl font-bold text-[#3C4043] mb-2 flex items-center gap-3 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[#D4AF37] not-italic text-sm font-sans font-bold">03.</span> 
              Cookies Técnicos
            </h3>
            <p className="text-gray-500 leading-relaxed text-lg font-light">
              Utilizamos cookies apenas para funções vitais: manter sua sessão ativa durante a visualização e carregar o <strong>Visualizador de Fotos</strong> de forma ultra-rápida. 
              Não rastreamos seu comportamento para fins de publicidade.
            </p>
          </section>

        </div>

        {/* CITAÇÃO FINAL (Estilo Editorial) */}
        <div className="mt-16 p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm text-center">
          <p className="text-[#3C4043] text-xl md:text-2xl italic font-medium leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: "'Playfair Display', serif" }}>
            "A confiança é a moldura que protege as memórias mais valiosas."
          </p>
          <div className="mt-8 w-12 h-[2px] bg-[#D4AF37] mx-auto opacity-30" />
          <p className="mt-6 text-[12px] tracking-[0.5em] text-gray-400 font-bold">
            Equipe Sua Galeria de Fotos • {new Date().getFullYear()}
          </p>
        </div>
      </main>

      {/* RODAPÉ (Igual ao da Home) */}
      <footer className="bg-[#2D2E30] py-16 px-6 text-center">
        <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em]">
          Protegido por LGPD • Conexão Segura SSL
        </p>
      </footer>
    </div>
  );
}