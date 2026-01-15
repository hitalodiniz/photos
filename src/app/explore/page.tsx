'use client';
import React, { useState } from 'react';
import { MapPin, ArrowUpRight, Search } from 'lucide-react';
import Link from 'next/link';

// Simulação de dados vindos do Supabase
const MOCK_PHOTOGRAPHERS = [
  {
    id: '1',
    name: 'Hitalo Diniz',
    username: 'hitalo-diniz',
    mainCity: 'Belo Horizonte, MG',
    category: 'Editorial',
    coverUrl: '/hero-bg-1.webp', // Fotos da sua pasta pública
    avatarUrl: 'https://i.pravatar.cc/150?u=hitalo',
  },
  {
    id: '2',
    name: 'Marina Silva',
    username: 'marina-silva',
    mainCity: 'São Paulo, SP',
    category: 'Casamento',
    coverUrl: '/hero-bg-5.webp',
    avatarUrl: 'https://i.pravatar.cc/150?u=marina',
  },
  {
    id: '3',
    name: 'Lucas Rocha',
    username: 'lucas-rocha',
    mainCity: 'Rio de Janeiro, RJ',
    category: 'Street',
    coverUrl: '/hero-bg-8.webp',
    avatarUrl: 'https://i.pravatar.cc/150?u=lucas',
  },
  {
    id: '4',
    name: 'Ana Bento',
    username: 'ana-bento',
    mainCity: 'Curitiba, PR',
    category: 'Eventos',
    coverUrl: '/hero-bg-12.webp',
    avatarUrl: 'https://i.pravatar.cc/150?u=ana',
  },
];

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <main className="min-h-screen bg-[#0F172A] text-white p-6 pb-20 font-sans">
      {/* HEADER SECTION */}
      <header className="max-w-[1400px] mx-auto mb-12 mt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-artistic text-5xl md:text-7xl mb-4 leading-tight">
              Descubra <br /> <span className="text-[#F3E5AB]">Artistas</span>
            </h1>
            <p className="text-white/50 text-lg max-w-md italic">
              Conectando olhares únicos aos projetos mais ambiciosos.
            </p>
          </div>

          {/* BARRA DE BUSCA ESTILIZADA */}
          <div className="relative w-full md:w-[400px]">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por cidade ou nome..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#F3E5AB]/50 transition-all text-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* FILTROS DE CATEGORIA */}
        <div className="flex gap-3 mt-10 overflow-x-auto pb-4 scrollbar-hide">
          {[
            'Todos',
            'Casamento',
            'Editorial',
            'Eventos',
            'Street',
            'Moda',
            'Arquitetura',
          ].map((cat) => (
            <button
              key={cat}
              className="px-6 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-[#F3E5AB] hover:text-black transition-all text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap"
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* GRID DE CARDS - Aqui é a alma da Rede Social */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {MOCK_PHOTOGRAPHERS.map((pro) => (
          <Link
            href={`/${pro.username}`}
            key={pro.id}
            className="group relative block aspect-[3/4.5] overflow-hidden rounded-[1.5rem] bg-slate-900 border border-white/5 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]"
          >
            {/* Foto de Capa (Hero do Fotógrafo) */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
              style={{ backgroundImage: `url(${pro.coverUrl})` }}
            />

            {/* Overlay Editorial */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-black/20" />

            {/* Categoria */}
            <div className="absolute top-5 right-5 px-3 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#F3E5AB]">
                {pro.category}
              </span>
            </div>

            {/* Conteúdo Inferior */}
            <div className="absolute bottom-0 left-0 w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full border-2 border-[#F3E5AB] overflow-hidden shadow-2xl shrink-0">
                  <img
                    src={pro.avatarUrl}
                    alt={pro.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-artistic text-2xl text-white font-semibold leading-none truncate">
                    {pro.name}
                  </h3>
                  <div className="flex items-center gap-1 text-white/50 mt-1.5">
                    <MapPin size={12} className="text-[#F3E5AB]" />
                    <span className="text-[10px] font-bold uppercase tracking-tight truncate">
                      {pro.mainCity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão que aparece no Hover */}
              <div className="grid grid-cols-1 transition-all duration-500 max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100">
                <div className="w-full py-3 mt-2 rounded-xl bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  Ver Portfólio <ArrowUpRight size={14} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
