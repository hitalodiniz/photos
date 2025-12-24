"use client";

import { authenticateGaleriaAccess } from "@/actions/galeria";
import React, { useState, useEffect } from 'react';
import { Camera, Lock } from 'lucide-react';
import { DynamicHeroBackground } from '@/components/layout';

export default function PasswordPrompt({
  galeriaTitle,
  galeriaId,
  fullSlug,
}: {
  galeriaTitle: string;
  galeriaId: string;
  fullSlug: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [bgImage, setBgImage] = useState('');



  const handleCheckPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 4) {
      setError("Mínimo de 4 dígitos.");
      return;
    }
    setIsChecking(true);
    try {
      const result = await authenticateGaleriaAccess(galeriaId, fullSlug, password);
      if (result && !result.success) {
        setError(result.error || "Senha incorreta.");
      }
    } catch (e) {
      //setError("Erro de conexão.");
    }
    setIsChecking(false);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black font-sans px-4">
      <DynamicHeroBackground />

      {/* CARD DE ACESSO (ESTILO BARRA CHAMPANHE DO PHOTO GRID) */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/45 backdrop-blur-lg rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl text-center">

          {/* ÍCONE DE CÂMERA CHAMPANHE */}
          <div className="mx-auto w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_15px_rgba(243,229,171,0.1)]">
            <Camera className="text-[#F3E5AB] w-8 h-8 drop-shadow-[0_0_8px_rgba(243,229,171,0.4)]" />
          </div>

          {/* TÍTULO DA GALERIA SERIFADO */}
          <h1
            className="text-2xl md:text-3xl font-bold text-white mb-2 italic leading-tight drop-shadow-lg pb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {galeriaTitle}
          </h1>

          <form onSubmit={handleCheckPassword} className="space-y-8">

            {/* ESTRUTURA LABEL + INPUT */}
            <div className="text-left">

              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Inserir senha"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
                maxLength={8}
                required
                className="w-full rounded-2xl border 
                border-white/10 bg-black/20 p-4 text-white  
                focus:ring-2 focus:ring-[#F3E5AB] focus:bg-black/40 transition-all 
                outline-none text-center text-2x1 tracking-[0.2em]"
              />
            </div>

            {error && (
              <p className="text-red-400 text-[10px] font-bold tracking-[0.2em] uppercase italic bg-red-400/5 py-3 rounded-xl border border-red-400/20">
                {error}
              </p>
            )}

            {/* BOTÃO CHAMPANHE ESTILO PHOTO GRID */}
            <button
              type="submit"
              disabled={isChecking}
              className={`w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl font-bold 
                transition-all shadow-lg active:scale-95 text-xs tracking-[0.25em]
                bg-[#F3E5AB] hover:bg-[#e6d595] text-slate-900 
                ${isChecking ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isChecking ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900" />
              ) : (
                <>
                  <Lock size={14} />
                  <span>Desbloquear Galeria</span>
                </>
              )}
            </button>
          </form>

          {/* RODAPÉ DISCRETO */}
          <div className="mt-12 opacity-80 flex flex-col items-center gap-3">
            <div className="w-10 h-[1px] bg-white"></div>
            <p className="text-[12px] text-white tracking-[0.2em] font-medium">
              Acesso exclusivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}