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
} from 'lucide-react';

export default function StyleGuidePage() {
  const [copied, setCopied] = useState(false);

  // 🎯 PROMPT ATUALIZADO: Foco em Semibold e Medium (Estilo Leve)
  const aiPrompt = `Contexto de Design: Sistema Luxury Admin (Light Editorial)
Ao criar novos componentes, modais ou páginas, siga estas diretrizes:
1. PESOS DE FONTE: Use font-semibold para títulos e font-medium para textos. EVITE font-black e font-bold.
2. CORES: Fundo #F8F9FA, Ouro #D4AF37, Champanhe #F3E5AB, Texto Principal Slate-800.
3. BOTÕES: bg-[#F3E5AB] text-black h-11 rounded-[0.5rem] font-semibold uppercase tracking-[0.2em] shadow-xl.
4. LABELS: font-semibold text-[10px] uppercase tracking-[0.2em] text-slate-800 (Alinhado com ícone).
5. ÍCONES: Use strokeWidth={2} para manter a leveza visual.`;

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
            Diretrizes visuais: Luxury & Lightweight Editorial.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold text-[#D4AF37] uppercase tracking-[0.3em]">
            Versão 2.0 (Lightweight)
          </span>
        </div>
      </header>

      {/* 🎯 SEÇÃO DO PROMPT DE IA ATUALIZADO */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-[#D4AF37]" strokeWidth={2} />
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-900">
            IA Prompt Helper (Fixed Weights)
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
            className="w-full h-40 p-6 pt-12 bg-white border border-slate-200 rounded-2xl text-[12px] font-mono text-slate-600 leading-relaxed resize-none focus:outline-none shadow-sm"
          />
        </div>
      </section>

      {/* 1. BOTÕES (AGORA EM SEMIBOLD) */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">
          1. Ações (Semibold)
        </h2>
        <div className="bg-white p-8 rounded-2xl border border-slate-100 flex flex-wrap gap-6 items-center shadow-sm">
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              Botão Principal
            </p>
            <button className="px-8 h-11 rounded-[0.5rem] bg-[#F3E5AB] text-black text-[11px] font-semibold uppercase tracking-[0.2em] shadow-xl hover:bg-white border border-[#F3E5AB] transition-all">
              Nova Mídia
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              Botão Secundário
            </p>
            <button className="px-8 h-11 rounded-[0.5rem] border border-slate-200 bg-white text-slate-600 text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-slate-50 transition-all">
              Configurações
            </button>
          </div>
        </div>
      </section>

      {/* 2. LABELS E INPUTS */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">
          2. Formulários (Lightweight)
        </h2>
        <div className="bg-white p-8 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
          <div className="max-w-xs space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
              <User size={12} strokeWidth={2} /> Nome do Profissional
            </label>
            <input
              disabled
              placeholder="Ex: Gabriel Fontes"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-[0.5rem] text-sm font-medium outline-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ColorCard({
  hex,
  name,
  label,
}: {
  hex: string;
  name: string;
  label: string;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-lg border border-slate-200"
        style={{ backgroundColor: hex }}
      />
      <div>
        <p className="text-xs font-semibold text-slate-900">{name}</p>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
          {hex}
        </p>
        <p className="text-[9px] text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
