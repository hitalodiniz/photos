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
} from 'lucide-react';

export default function StyleGuidePage() {
  const [copied, setCopied] = useState(false);

  // 🎯 PROMPT UNIFICADO: Mantém o estilo leve e acrescenta as regras dos modais
  const aiPrompt = `Contexto de Design: Sistema Luxury Hybrid (Admin Light + Interaction Dark)
1. ADMIN LIGHT: Fundo #F8F9FA, Ouro #D4AF37, Champanhe #F3E5AB. Use font-semibold para títulos e font-medium para textos.
2. MODAIS DARK: Fundo #1E293B, overlays bg-black/20, bordas white/10. Texto SEMPRE text-white puro para nitidez.
3. BOTÕES ADMIN: bg-[#F3E5AB] text-black h-11 rounded-[0.5rem] font-semibold uppercase tracking-[0.2em].
4. BOTÕES PREMIUM: bg-[#F3E5AB] text-black h-12 rounded-xl font-bold uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(243,229,171,0.3)].
5. ICONOGRAFIA: strokeWidth={2} no Light e strokeWidth={2.5} nos destaques Dark.`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 pb-20 space-y-12">
      {/* HEADER */}
      <header className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Style Guide
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Guia Híbrido: Admin Light & Interações Dark Premium.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold text-[#D4AF37] uppercase tracking-[0.3em]">
            Versão 3.0 (Hybrid Edition)
          </span>
        </div>
      </header>

      {/* 🎯 SEÇÃO DO PROMPT DE IA ATUALIZADO */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-[#D4AF37]" strokeWidth={2} />
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-900">
            IA Prompt Helper (Full Guidelines)
          </h2>
        </div>
        <div className="relative group">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-[#F3E5AB] rounded-lg text-[10px] font-semibold uppercase tracking-widest hover:bg-black transition-all"
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

      {/* 1. ADMIN LIGHT (ESTILO ANTIGO PRESERVADO) */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">
          1. Admin Lightweight (Light Theme)
        </h2>
        <div className="bg-white p-8 rounded-2xl border border-slate-100 flex flex-wrap gap-8 items-center shadow-sm">
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              Botão Padrão
            </p>
            <button className="px-8 h-11 rounded-[0.5rem] bg-[#F3E5AB] text-black text-[11px] font-semibold uppercase tracking-[0.2em] shadow-xl hover:bg-white border border-[#F3E5AB] transition-all">
              Nova Galeria
            </button>
          </div>
          <div className="max-w-xs space-y-1.5 flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
              <User size={12} strokeWidth={2} /> Campo de Texto
            </label>
            <input
              disabled
              placeholder="Ex: Gabriel Fontes"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-[0.5rem] text-sm font-medium"
            />
          </div>
        </div>
      </section>

      {/* 2. DARK PREMIUM (O NOVO TEMA DOS MODAIS) */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">
          2. Interações Premium (Dark Theme)
        </h2>
        <div className="bg-[#1E293B] p-10 rounded-[2rem] border border-white/10 shadow-2xl space-y-8">
          <div className="bg-[#F3E5AB]/10 py-3 flex items-center justify-center gap-3 border border-[#F3E5AB]/20 rounded-lg shrink-0">
            <Wifi size={14} className="text-[#F3E5AB]" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F3E5AB]">
              Visualização de Alta Performance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest text-center md:text-left">
                Card de Item (Ex: Pacote)
              </p>
              <div className="w-full flex items-center gap-5 p-5 rounded-xl border border-[#F3E5AB]/30 bg-white/10 shadow-[0_0_20px_rgba(243,229,171,0.1)]">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#F3E5AB] text-black shadow-lg">
                  <Package size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-white uppercase">
                    Pacote 01
                  </p>
                  <p className="text-[11px] font-bold text-[#F3E5AB] uppercase italic">
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
              <button className="w-full h-12 bg-[#F3E5AB] hover:bg-white text-black font-bold uppercase text-[11px] tracking-[0.2em] rounded-xl shadow-[0_0_15px_rgba(243,229,171,0.4)] transition-all flex items-center justify-center gap-2">
                Aumentar Limite <ArrowRight size={16} />
              </button>
              <div className="flex flex-col items-center gap-1 opacity-60">
                <p className="text-[9px] text-white uppercase font-bold tracking-[0.2em]">
                  Toque para saber mais
                </p>
                <div className="h-1 w-8 bg-[#F3E5AB] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
