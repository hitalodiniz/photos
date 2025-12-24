'use client';
import React, { useState } from 'react';
import { Camera, Download, Share2, ArrowLeft, Heart, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {PhotoGrid} from '@/components/gallery';

export default function GaleriaPage() {
  // Simulação de dados que viriam do Google Drive
  const [galleryTitle] = useState("Ensaio Editorial • Marina & Costa");
  const [location] = useState("Estúdio Luz, São Paulo");

  return (
    <div className="min-h-screen bg-[#F1F3F4] flex flex-col font-sans">
      {/* Navbar será renderizada aqui via Layout se o usuário estiver logado */}

      {/* HEADER DA GALERIA */}
      <header className="bg-white border-b border-gray-200 pt-12 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-gray-400 hover:text-[#1A73E8] transition-colors mb-6 group text-sm font-medium"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar para o Painel
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#D4AF37]">
                <Camera size={18} />
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Portfólio Privado</span>
              </div>
              <h1 
                className="text-4xl md:text-5xl font-bold text-[#3C4043] italic leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {galleryTitle}
              </h1>
              <p className="text-gray-500 font-light flex items-center gap-2 italic">
                {location} • <span className="text-[#34A853] font-medium">Sincronizado com Drive</span>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button >
                <Share2 size={18} />
                <span>Compartilhar</span>
              </button>
              <button >
                <Download size={18} />
                <span>Download All</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO DA GALERIA */}
      <main className="flex-grow max-w-7xl mx-auto w-full py-12 px-6">
        <PhotoGrid />
      </main>

      {/* O rodapé escuro que criamos anteriormente será injetado pelo layout.tsx */}
    </div>
  );
}