'use client';
import React, { useState, useEffect } from 'react';
import { Camera, ArrowLeft, ShieldCheck, Database, Share2, Instagram, MessageCircle, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DynamicHeroBackground from "@/components/DynamicHeroBackground";
import Footer from "@/components/Footer";


export default function PrivacidadePage() {
  const router = useRouter();

  return (

    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND FIXO PADRONIZADO */}
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* HEADER COM BOTÃO VOLTAR ABSOLUTO */}
        <header className="relative flex-none pt-8 md:pt-12 pb-4 px-4 w-full max-w-6xl mx-auto">
          <div className="fixed left-4 md:left-10 top-8 md:top-12 z-50">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-2 text-[10px] font-bold tracking-[0.3em] text-[#F3E5AB] bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300 backdrop-blur-md group uppercase shadow-2xl"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Voltar
            </button>
          </div>

          <div className="flex flex-col items-center justify-center text-center gap-2 md:gap-6">
            <div className="p-4 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
              <Camera className="text-[#F3E5AB] w-8 h-8 md:w-12 md:h-12 drop-shadow-[0_0_15px_rgba(243,229,171,0.3)]" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow-2xl italic"
                style={{ fontFamily: "'Playfair Display', serif" }}>

                Privacidade e Transparência
              </h1>
              <p className="text-xs md:text-xl text-white/90 font-light tracking-wide italic">
                Compromisso com a <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">segurança dos seus dados</span>
              </p>
            </div>
          </div>
        </header>

        {/* CONTEÚDO COM ESTILO ORIGINAL DE ITENS */}
        <main className="flex-grow flex items-center justify-center">
          <section className="w-full max-w-5xl mx-auto bg-white/90 backdrop-blur-xl 
          rounded-[3rem] md:rounded-[4rem] p-4 md:p-8 shadow-2xl border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-y-6 px-2 md:px-6">

              <FeatureItem
                icon={<Share2 size={30} />}
                title="Uso de Dados do Google Drive™"
                desc="Ao conectar sua conta, solicitamos acesso ao escopo auth/drive para automatizar a experiência do fotógrafo. Nossa plataforma utiliza essa permissão estritamente para configurar permissões de visualização e listar imagens via links diretos."
              />

              <FeatureItem
                icon={<Database size={30} />}
                title="Sua Propriedade Intelectual"
                desc="Nossa plataforma não realiza o download, cópia ou armazenamento permanente de suas fotos em servidores próprios. Atuamos como um espelhamento dinâmico: as imagens permanecem hospedadas no seu Google Drive™."
              />

              <FeatureItem
                icon={<Lock size={30} />}
                title="Segurança do Cliente Final"
                desc="Para galerias privadas, implementamos uma camada de autenticação via senha protegida por cookies técnicos que servem apenas para validar o acesso e expiram automaticamente em 24 horas."
              />

              <FeatureItem
                icon={<ShieldCheck size={30} />}
                title="Conformidade com a LGPD"
                desc="Em total conformidade com a Lei Geral de Proteção de Dados (LGPD), garantimos que nenhum dado pessoal ou biométrico contido nas fotos é coletado ou processado por nossa inteligência de dados."
              />

            </div>

            {/* Citação Final */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-slate-800  italic max-w-2xl mx-auto text-base md:text-xl "
                style={{ fontFamily: "'Playfair Display', serif" }}>
                "A tecnologia deve ser o véu que protege a arte, nunca o obstáculo que a compromete."
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}

{/* FeatureItem - Restaurado Exatamente conforme o seu código enviado */ }
function FeatureItem({ icon, title, desc }) {
  return (
    <div className="flex flex-row items-center gap-4 group transition-all w-full max-w-[100%]">
      {/* Ícone: Fundo sólido suave */}
      <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-[#FAF7ED] rounded-2xl flex items-center justify-center 
        border border-[#D4AF37]/50 group-hover:border-[#D4AF37] group-hover:bg-[#F3E5AB] transition-all text-[#D4AF37] shadow-sm">
        {icon}
      </div>

      {/* Textos: Alinhados imediatamente à frente */}
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

