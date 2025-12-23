'use client';
import React from 'react';
import { Camera, ArrowLeft, ShieldCheck, Database, Share2, Cookie } from 'lucide-react';
import Link from 'next/link';

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">

      {/* HEADER EDITORIAL */}
      <header className="relative py-10 px-6 overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] -z-10" />

        <div className="max-w-4xl mx-auto text-center md:text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 mb-8 text-[10px] font-bold tracking-[0.3em] text-[#D4AF37] bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-full hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 transition-all duration-300 backdrop-blur-sm group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" />
            Voltar ao Início
          </Link>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="flex items-center justify-center w-16 h-16 border border-[#D4AF37]/50 rounded-full bg-[#D4AF37]/5 backdrop-blur-sm">
              <Camera className="text-[#D4AF37] w-8 h-8" />
            </div>

            <div className="flex flex-col gap-2">
              <h1
                className="text-3xl md:text-5xl font-bold italic text-[#3C4043] tracking-tight leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Privacidade & Transparência
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-2 text-[12px] md:text-xs  tracking-[0.4em] text-[#D4AF37] font-bold">
                <ShieldCheck size={14} />
                <span>Integração Segura com Google Drive™</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="space-y-16">

          {/* Item 1 - Uso dos Dados do Google */}
          <section className="group">
            <h3 className="text-2xl font-bold text-[#3C4043] mb-4 flex items-center gap-3 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[#D4AF37] not-italic text-sm font-sans font-bold">01.</span>
              Uso de Dados do Google Drive™
            </h3>
            <p className="text-gray-500 leading-relaxed text-lg font-light mb-4">
              Ao conectar sua conta, solicitamos acesso ao escopo <strong>auth/drive</strong> para automatizar a experiência do fotógrafo. Nossa plataforma utiliza essa permissão estritamente para:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-500 font-light italic">
              <li className="flex items-start gap-2">
                <Share2 size={18} className="text-[#D4AF37] mt-1 shrink-0" />
                <span>Configurar permissões de visualização das pastas selecionadas.</span>
              </li>
              <li className="flex items-start gap-2">
                <Database size={18} className="text-[#D4AF37] mt-1 shrink-0" />
                <span>Listar imagens e gerar links de visualização direta.</span>
              </li>
            </ul>
          </section>

          {/* Item 2 - Armazenamento */}
          <section className="group">
            <h3 className="text-2xl font-bold text-[#3C4043] mb-2 flex items-center gap-3 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[#D4AF37] not-italic text-sm font-sans font-bold">02.</span>
              Sua Propriedade Intelectual
            </h3>
            <p className="text-gray-500 leading-relaxed text-lg font-light">
              Nossa plataforma não realiza o <strong>download, cópia ou armazenamento permanente</strong> de suas fotos em servidores próprios. Atuamos como um espelhamento dinâmico: as imagens permanecem hospedadas no seu Google Drive™, e você pode revogar o acesso a qualquer momento através das configurações da sua conta Google.
            </p>
          </section>

          {/* Item 3 - Segurança de Acesso */}
          <section className="group">
            <h3 className="text-2xl font-bold text-[#3C4043] mb-2 flex items-center gap-3 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[#D4AF37] not-italic text-sm font-sans font-bold">03.</span>
              Segurança do Cliente Final
            </h3>
            <p className="text-gray-500 leading-relaxed text-lg font-light">
              Para galerias privadas, implementamos uma camada de autenticação via senha protegida por cookies técnicos. Estes cookies servem apenas para validar o acesso à galeria específica e expiram automaticamente em 24 horas, garantindo que o link não permaneça exposto indefinidamente.
            </p>
          </section>

          {/* Item 4 - LGPD */}
          <section className="group">
            <h3 className="text-2xl font-bold text-[#3C4043] mb-2 flex items-center gap-3 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-[#D4AF37] not-italic text-sm font-sans font-bold">04.</span>
              Conformidade com a LGPD
            </h3>
            <p className="text-gray-500 leading-relaxed text-lg font-light">
              Em total conformidade com a Lei Geral de Proteção de Dados (LGPD), garantimos que nenhum dado pessoal ou biométrico contido nas fotos é coletado ou processado por nossa inteligência de dados. O processamento limita-se à exibição visual e organização estrutural das pastas.
            </p>
          </section>

        </div>

        {/* CITAÇÃO FINAL */}
        <div className="mt-20 p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm text-center">
          <p className="text-[#3C4043] text-xl md:text-2xl italic font-medium leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: "'Playfair Display', serif" }}>
            "A tecnologia deve ser o véu que protege a arte, nunca o obstáculo que a compromete."
          </p>
          <div className="mt-8 w-12 h-[2px] bg-[#D4AF37] mx-auto opacity-30" />
          <p className="mt-6 text-[12px] tracking-[0.5em] text-gray-400 font-bold">
            Equipe Sua Galeria de Fotos • {new Date().getFullYear()}
          </p>
        </div>
      </main>

      {/* RODAPÉ */}
      <footer className="bg-[#2D2E30] py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-gray-500 text-[10px] tracking-[0.4em]">
            App para uso profissional • Autenticação Google OAuth 2.0
          </p>
          <p className="text-gray-600 text-[9px] tracking-[0.2em] max-w-lg mx-auto leading-loose">
            O uso das informações recebidas das APIs do Google está em conformidade com a
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline hover:text-[#D4AF37] ml-1">
              Política de Dados do Usuário dos Serviços de API do Google
            </a>, incluindo os requisitos de Uso Limitado.
          </p>
        </div>
      </footer>
    </div>
  );
}