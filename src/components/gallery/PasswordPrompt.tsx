'use client';

import { authenticateGaleriaAccess } from '@/actions/galeria';
import React, { useState } from 'react';
import { Camera, Lock, Loader2 } from 'lucide-react';
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
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 4) {
      setError('Mínimo de 4 dígitos.');
      return;
    }

    setIsChecking(true);

    try {
      const result = await authenticateGaleriaAccess(
        galeriaId,
        fullSlug,
        password,
      );

      if (result && !result.success) {
        setError(result.error || 'Senha incorreta.');
        setIsChecking(false);
      }
    } catch (e: any) {
      // O Next.js usa erros internos para lidar com redirect() em Server Actions
      if (e.message === 'NEXT_REDIRECT') {
        throw e;
      }

      console.error('Erro de autenticação:', e);
      setError('Erro de conexão ou servidor.');
      setIsChecking(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black font-sans px-4">
      <DynamicHeroBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/45 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl text-center ring-1 ring-white/5">
          {/* ÍCONE DE CÂMERA COM GLOW */}
          <div className="mx-auto w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_20px_rgba(243,229,171,0.15)]">
            <Camera className="text-[#F3E5AB] w-8 h-8 drop-shadow-[0_0_8px_rgba(243,229,171,0.6)]" />
          </div>

          <h1
            className="text-2xl md:text-3xl font-bold text-white mb-2 italic leading-tight drop-shadow-lg pb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {galeriaTitle}
          </h1>

          <form onSubmit={handleCheckPassword} className="space-y-6">
            <div className="text-left">
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="Inserir senha"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, '').slice(0, 8))
                }
                maxLength={8}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white text-center text-2xl tracking-[0.3em] focus:ring-2 focus:ring-[#F3E5AB]/50 focus:border-[#F3E5AB]/50 transition-all outline-none placeholder:text-white/80 placeholder:text-base placeholder:tracking-normal placeholder:font-light"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="text-red-400 text-[10px] font-bold tracking-[0.2em] uppercase italic bg-red-400/5 py-3 rounded-xl border border-red-400/20 animate-in fade-in zoom-in duration-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isChecking}
              className={`w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl font-semibold 
                transition-all shadow-lg active:scale-[0.98] text-sm md:text[14px] tracking-[0.25em] uppercase
                bg-[#F3E5AB] hover:bg-[#FAF0CA] text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isChecking ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  <Lock size={14} />
                  <span>Desbloquear Galeria</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-12 opacity-40 flex flex-col items-center gap-3">
            <div className="w-8 h-[1px] bg-white"></div>
            <p className="text-[10px] text-white tracking-[0.3em] font-light uppercase">
              Memórias Protegidas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
