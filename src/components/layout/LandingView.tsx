'use client';
import React, { useState } from 'react';
import EditorialView from './EditorialView';
import { Grid, Users, Search, MessageCircle } from 'lucide-react';

export default function LandingView({ children, benefits }: any) {
  const [tab, setTab] = useState('explorer');

  return (
    <EditorialView
      title="Sua Galeria"
      subtitle="Onde grandes histórias encontram seu melhor ângulo"
      altura="h-[65vh]"
      hideContentSection={true} // Nós assumimos o controle do layout abaixo
    >
      {/* 1. SELETOR DE CONTEXTO (Flutuando entre Hero e Conteúdo) */}
      <div className="relative z-20 -mt-8 flex justify-center">
        <div className="inline-flex bg-neutral-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
          <button
            onClick={() => setTab('explorer')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              tab === 'explorer'
                ? 'bg-gold text-petroleum'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid size={20} /> Explorar Galerias
          </button>
          <button
            onClick={() => setTab('pro')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              tab === 'pro'
                ? 'bg-gold text-petroleum'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={20} /> Para Fotógrafos
          </button>
        </div>
      </div>

      {/* 2. ÁREA DINÂMICA (Fundo Branco para contraste) */}
      <main className="w-full bg-white min-h-[50vh] pt-16 pb-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          {tab === 'explorer' ? (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-petroleum italic">
                  Descubra Novos Olhares
                </h2>
                <p className="text-slate-500">
                  Busque por estilo ou região e conecte-se direto com o artista.
                </p>
              </div>

              {/* BUSCA B2C */}
              <div className="flex flex-col md:flex-row gap-4 mb-12 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-slate-200">
                  <Search className="text-gold" size={20} />
                  <input
                    type="text"
                    placeholder="Qual estilo? (ex: Casamento)"
                    className="w-full outline-none text-petroleum"
                  />
                </div>
                <button className="bg-petroleum text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all">
                  Buscar Galeria
                </button>
              </div>

              {/* GRID DE RESULTADOS (Exemplo) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="aspect-[4/5] bg-slate-200 rounded-3xl overflow-hidden mb-4 relative">
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-petroleum">
                          Wedding Day - Bruno & Alícia
                        </h4>
                        <p className="text-sm text-slate-400">
                          BH - Minas Gerais
                        </p>
                      </div>
                      <button className="p-3 bg-green-100 text-green-600 rounded-full hover:bg-green-600 hover:text-white transition-all">
                        <MessageCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center mb-16">
                <p className="text-gold uppercase tracking-widest text-xs font-bold mb-2">
                  Solução Profissional
                </p>
                <h2 className="text-4xl font-bold text-petroleum italic">
                  Sua marca, seu Drive, sua economia.
                </h2>
              </div>

              {/* GRID DE BENEFÍCIOS (Seu código original de benefícios entra aqui) */}
              {children}
            </section>
          )}
        </div>
      </main>
    </EditorialView>
  );
}
