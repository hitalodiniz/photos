'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  LayoutGrid,
  Lock,
  Unlock,
  Settings,
  LogOut,
  Search,
  MapPin,
  Calendar,
  User,
  Camera,
  Briefcase,
  Plus,
  Copy,
  Check,
  Terminal,
  Zap,
  Package,
  AlertTriangle,
  Wifi,
  Download,
  CheckCircle2,
  ArrowRight,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function StyleGuidePage() {
  const [copied, setCopied] = useState(false);

  // 🎯 PROMPT UNIFICADO: Sistema adaptativo com tema claro/escuro automático
  const aiPrompt = `Contexto de Design: Sistema Luxury Hybrid Adaptativo (Light/Dark Auto)
  
🎨 TEMA ADAPTATIVO AUTOMÁTICO:
- O site detecta automaticamente o tema do sistema operacional (darkMode: 'media' no Tailwind)
- Use classes dark: para adaptar cores ao tema escuro
- Sempre forneça versões para ambos os temas usando: text-petroleum dark:text-[#F3E5AB]

📋 CORES POR TEMA:
1. TEMA CLARO (Light):
   - Fundo principal: bg-white ou bg-luxury-bg (#F8F9FA)
   - Cor de destaque: text-petroleum (cor da barra ToolBarDesktop)
   - Ícones: text-petroleum
   - Bordas: border-black/10 ou border-black/20
   - Fundos de componentes: bg-white/90 ou bg-white/95

2. TEMA ESCURO (Dark):
   - Fundo principal: dark:bg-black ou dark:bg-[#1A1A1A]
   - Cor de destaque: dark:text-[#F3E5AB] (champagne/dourado)
   - Ícones: dark:text-[#F3E5AB]
   - Bordas: dark:border-white/10 ou dark:border-white/20
   - Fundos de componentes: dark:bg-black/90 ou dark:bg-[#1A1A1A]/90

🔧 PADRÕES DE COMPONENTES:
1. BOTÕES ADAPTATIVOS:
   - bg-white/95 dark:bg-black/95 backdrop-blur-2xl
   - border-black/20 dark:border-white/20
   - text-black dark:text-white
   - hover:bg-black/10 dark:hover:bg-white/10

2. TEXTOS ADAPTATIVOS:
   - Títulos: text-black dark:text-white
   - Destaques: text-petroleum dark:text-[#F3E5AB]
   - Secundários: text-black/70 dark:text-white/80

3. FUNDOS ADAPTATIVOS:
   - bg-white dark:bg-black (fundo principal)
   - bg-white/90 dark:bg-black/90 (componentes com transparência)
   - backdrop-blur-md (sempre aplicar blur)

4. BORDAS ADAPTATIVAS:
   - border-black/10 dark:border-white/10 (sutis)
   - border-black/20 dark:border-white/20 (médias)

5. TRANSIÇÕES:
   - Sempre adicionar: transition-colors duration-300

💡 EXEMPLO DE COMPONENTE ADAPTATIVO:
<div className="bg-white/90 dark:bg-black/90 backdrop-blur-md border border-black/10 dark:border-white/20 text-black dark:text-white transition-colors duration-300">
  <h2 className="text-petroleum dark:text-[#F3E5AB]">Título</h2>
  <p className="text-black/70 dark:text-white/80">Texto secundário</p>
</div>

⚠️ IMPORTANTE:
- NUNCA use apenas uma cor fixa, sempre forneça versão dark:
- Use petroleum (text-petroleum ou bg-petroleum) no tema claro e #F3E5AB no tema escuro para elementos de destaque
- Sempre inclua transition-colors duration-300 para transições suaves`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-luxury-bg p-8 pb-20 space-y-12">
      {/* HEADER */}
      <header className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Style Guide
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Guia Adaptativo: Componentes que se ajustam automaticamente ao tema do sistema (Light/Dark).
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold text-gold uppercase tracking-widest">
            Versão 4.0 (Adaptive Edition)
          </span>
        </div>
      </header>

      {/* 🎯 SEÇÃO DO PROMPT DE IA ATUALIZADO */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-gold" strokeWidth={2} />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-900">
            IA Prompt Helper (Full Guidelines)
          </h2>
        </div>
        <div className="relative group">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-champagne rounded-lg text-[10px] font-semibold uppercase tracking-widest hover:bg-black transition-all"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado!' : 'Copiar Diretrizes'}
            </button>
          </div>
          <textarea
            readOnly
            value={aiPrompt}
            className="w-full h-44 p-6 pt-12 bg-white border border-slate-200 rounded-2xl text-[12px] font-mono text-slate-600 leading-relaxed resize-none focus:outline-none shadow-sm"
          />
        </div>
      </section>

      {/* 1. TEMA ADAPTATIVO - COMPONENTES BASE */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gold">
          1. Componentes Adaptativos (Light/Dark Auto)
        </h2>
        
        {/* Exemplo: Card Adaptativo */}
        <div className="space-y-3">
          <p className="text-editorial-label text-white/40">
            Card Adaptativo
          </p>
          <div className="bg-white dark:bg-slate-950/50 p-6 rounded-luxury border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-300">
            <h3 className="text-editorial-ink dark:text-gold text-lg font-bold mb-2 transition-colors duration-300 italic">
              Título Adaptativo
            </h3>
            <p className="text-editorial-gray dark:text-white/60 text-sm transition-colors duration-300 font-medium">
              Este card se adapta automaticamente ao tema do sistema operacional.
            </p>
          </div>
        </div>

        {/* Exemplo: Botões Adaptativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-editorial-label text-white/40">
              Botão Primário Adaptativo
            </p>
            <button className="w-full px-8 h-11 rounded-luxury bg-white dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 text-black dark:text-white text-editorial-label shadow-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300">
              Ação Principal
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-editorial-label text-white/40">
              Botão com Destaque Adaptativo
            </p>
            <button className="w-full px-8 h-11 rounded-luxury bg-gold text-black text-editorial-label shadow-xl hover:bg-white transition-all duration-300">
              Destaque Gold
            </button>
          </div>
        </div>

        {/* Exemplo: Input Adaptativo */}
        <div className="space-y-3">
          <p className="text-editorial-label text-white/40">
            Input Adaptativo
          </p>
          <div className="max-w-xs space-y-1.5">
            <label className="text-editorial-label text-petroleum dark:text-gold flex items-center gap-2 transition-colors duration-300">
              <User size={12} strokeWidth={2} /> Campo de Texto
            </label>
            <input
              disabled
              placeholder="Ex: Gabriel Fontes"
              className="w-full h-11 px-4 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-luxury text-sm font-bold text-editorial-ink dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 transition-colors duration-300"
            />
          </div>
        </div>
      </section>

      {/* 2. COMPARAÇÃO LADO A LADO */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gold">
          2. Comparação: Light vs Dark
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TEMA CLARO */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-petroleum" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-petroleum">
                Tema Claro (Light)
              </h3>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-white/90 border border-black/10 rounded-lg">
                <p className="text-petroleum text-sm font-semibold">Título</p>
                <p className="text-black/70 text-xs mt-1">Texto secundário</p>
              </div>
              <button className="w-full h-10 bg-petroleum text-white rounded-lg text-xs font-semibold uppercase tracking-widest">
                Botão
              </button>
            </div>
          </div>

          {/* TEMA ESCURO */}
          <div className="bg-petroleum p-6 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#F3E5AB]" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#F3E5AB]">
                Tema Escuro (Dark)
              </h3>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-black/90 border border-white/10 rounded-lg">
                <p className="text-[#F3E5AB] text-sm font-semibold">Título</p>
                <p className="text-white/80 text-xs mt-1">Texto secundário</p>
              </div>
              <button className="w-full h-10 bg-[#F3E5AB] text-black rounded-lg text-xs font-semibold uppercase tracking-widest">
                Botão
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COMPONENTES ESPECÍFICOS DO LIGHTBOX */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gold">
          3. Componentes Lightbox Adaptativos
        </h2>
        <div className="bg-white dark:bg-petroleum p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-300 space-y-6">
          {/* Título Adaptativo */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 dark:text-white/40 font-semibold uppercase tracking-widest">
              Título (GaleriaHeader)
            </p>
            <div className="flex items-start gap-3">
              <Camera className="text-petroleum dark:text-[#F3E5AB] w-6 h-6 transition-colors duration-300" strokeWidth={1.5} />
              <div>
                <h1 className="text-black dark:text-white text-xl font-semibold transition-colors duration-300">
                  Tour de France
                </h1>
                <div className="h-[2px] bg-petroleum dark:bg-[#F3E5AB] rounded-full w-24 mt-1 transition-colors duration-300" />
              </div>
            </div>
          </div>

          {/* Contador Adaptativo */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 dark:text-white/40 font-semibold uppercase tracking-widest">
              Contador de Fotos
            </p>
            <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-luxury border border-black/10 dark:border-white/20 shadow-2xl flex items-center gap-3 transition-colors duration-300">
              <ImageIcon size={13} className="text-petroleum dark:text-[#F3E5AB] transition-colors duration-300" />
              <p className="text-[11px] font-medium text-black dark:text-white transition-colors duration-300">
                Foto <span className="text-petroleum dark:text-[#F3E5AB]">10</span> de 153
              </p>
              <div className="h-3 w-[1px] bg-black/10 dark:bg-white/20" />
              <p className="text-black/60 dark:text-[#F3E5AB] text-[11px] font-medium transition-colors duration-300">
                97 KB
              </p>
            </div>
          </div>

          {/* Botões de Navegação Adaptativos */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 dark:text-white/40 font-semibold uppercase tracking-widest">
              Botões de Navegação
            </p>
            <div className="flex gap-4">
              <button className="w-12 h-12 rounded-full flex items-center justify-center text-black/20 dark:text-white/20 hover:text-petroleum dark:hover:text-[#F3E5AB] transition-all">
                <ChevronLeft size={20} strokeWidth={1} />
              </button>
              <button className="w-12 h-12 rounded-full flex items-center justify-center text-black/20 dark:text-white/20 hover:text-petroleum dark:hover:text-[#F3E5AB] transition-all">
                <ChevronRight size={20} strokeWidth={1} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERAÇÕES PREMIUM (Dark Theme - Modais) */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gold">
          4. Interações Premium (Dark Theme - Modais)
        </h2>
        <div className="bg-petroleum p-10 rounded-[2rem] border border-white/10 shadow-2xl space-y-8">
          <div className="bg-champagne/10 py-3 flex items-center justify-center gap-3 border border-champagne/20 rounded-lg shrink-0">
            <Wifi size={14} className="text-champagne" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-champagne">
              Visualização de Alta Performance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest text-center md:text-left">
                Card de Item (Ex: Pacote)
              </p>
              <div className="w-full flex items-center gap-5 p-5 rounded-xl border border-champagne/30 bg-white/10 shadow-[0_0_20px_rgba(243,229,171,0.1)]">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-champagne text-black shadow-lg">
                  <Package size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-white uppercase">
                    Pacote 01
                  </p>
                  <p className="text-xs font-bold text-champagne uppercase italic tracking-widest">
                    168 MB • Otimizadas
                  </p>
                </div>
                <CheckCircle2 size={22} className="text-green-400" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest text-center md:text-left">
                Ação de Conversão/Upgrade
              </p>
              <button className="w-full h-12 bg-champagne hover:bg-white text-black font-bold uppercase text-xs tracking-widest rounded-xl shadow-[0_0_15px_rgba(243,229,171,0.4)] transition-all flex items-center justify-center gap-2">
                Aumentar Limite <ArrowRight size={16} />
              </button>
              <div className="flex flex-col items-center gap-1 opacity-60">
                <p className="text-[9px] text-white uppercase font-bold tracking-widest">
                  Toque para saber mais
                </p>
                <div className="h-1 w-8 bg-champagne rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
