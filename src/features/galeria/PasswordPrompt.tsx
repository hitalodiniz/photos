'use client';

import { authenticateGaleriaAccessAction } from '@/actions/auth.actions';
import React, { useState } from 'react';
import { Camera, Lock, Loader2, CheckCircle2, Send, X } from 'lucide-react';
import { Galeria } from '@/core/types/galeria';
import { sendAccessRequestAction } from '@/actions/email.actions';
import { maskPhone } from '@/core/utils/masks-helpers';
import { useRouter } from 'next/navigation';
export default function PasswordPrompt({
  galeria,
  fullSlug,
  coverImageUrl,
}: {
  galeria: Galeria;
  fullSlug: string;
  coverImageUrl?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCheckPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 4) {
      setError('Mínimo de 4 dígitos.');
      return;
    }

    setIsChecking(true);

    try {
      // Chamada para a Server Action
      const result = await authenticateGaleriaAccessAction(
        galeria.id,
        fullSlug,
        password,
      );

      // Se a Action retornar e não houver sucesso, paramos o loading
      if (result && !result.success) {
        setError(result.error || 'Senha incorreta.');
        setIsChecking(false); // 🎯 Destrava o botão
      }

      // Se houver sucesso, o Next.js disparará o redirect interno
      // e o loading continuará até a troca de página (comportamento desejado).
    } catch (err: any) {
      // Tratamento para redirecionamentos do Next.js que caem no catch
      const isRedirect =
        err.message === 'NEXT_REDIRECT' ||
        err.digest?.includes('NEXT_REDIRECT');

      if (isRedirect) {
        // Deixamos o Next.js seguir com o redirecionamento
        return;
      }

      // Se caiu aqui por erro real de rede ou validação, destrava a tela
      console.error('Erro na autenticação:', err);
      setError('Senha incorreta ou falha na conexão.');
      setIsChecking(false); // 🎯 Destrava o botão
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black px-4">
      {/* 📸 BACKGROUND COM OVERLAY GRADIENTE */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url(${coverImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* CARD PRINCIPAL MAIS COMPACTO */}
        <div className="bg-black/30 backdrop-blur-2xl rounded-[1.5rem] p-8 md:p-10 border border-white/10 shadow-2xl text-center">
          <div className="flex flex-col items-center gap-3 mb-8">
            <Camera
              className="text-[#F3E5AB] w-12 h-12 drop-shadow-md"
              strokeWidth={1.5}
            />
            <h1 className="font-artistic text-xl md:text-2xl font-semibold text-white leading-tight">
              {galeria.title}
            </h1>
            <div className="h-[1px] w-12 bg-[#F3E5AB]/40 rounded-full" />
          </div>

          <form onSubmit={handleCheckPassword} className="space-y-5">
            <div className="relative">
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Senha numérica"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, '').slice(0, 8))
                }
                maxLength={8}
                required
                className="w-full rounded-[0.5rem] border border-white/10 bg-white/5 p-2 text-white text-center text-xl tracking-[0.5em] focus:border-[#F3E5AB]/50 transition-all outline-none placeholder:text-white/60 placeholder:text-xs placeholder:tracking-widest font-light"
              />
            </div>

            {error && (
              <p className="text-[#D4AF37] text-[9px] font-semibold tracking-widest uppercase animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold transition-all shadow-xl active:scale-[0.98] text-[10px] tracking-[0.2em] uppercase bg-[#F3E5AB] hover:bg-white text-black disabled:opacity-50"
            >
              {isChecking ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <>
                  <Lock size={12} strokeWidth={2.5} />
                  <span>Acessar Galeria</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-white/70 hover:text-[#F3E5AB] text-[9px] tracking-[0.2em] uppercase font-semibold transition-all"
            >
              Não tenho a senha
            </button>
          </div>
        </div>
      </div>

      <AccessRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        galeriaTitle={galeria.title}
        photographerEmail={galeria.photographer_email}
      />
    </div>
  );
}

// ... Modal de solicitação ajustado para o padrão pequeno
export function AccessRequestModal({
  isOpen,
  onClose,
  galeriaTitle,
  photographerEmail,
}: any) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const result = await sendAccessRequestAction({
        name: String(formData.get('name')),
        email: String(formData.get('email')),
        whatsapp: String(formData.get('whatsapp')),
        galeriaTitle,
        photographerEmail,
      });
      if (result.success) setSent(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm rounded-[1.5rem] overflow-hidden shadow-2xl">
        <div className="p-8">
          {!sent ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
                  Solicitar Acesso
                </h3>
                <button
                  onClick={onClose}
                  className="text-white/20 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  name="name"
                  placeholder="NOME COMPLETO"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#D4AF37]/50 text-[10px] font-semibold uppercase tracking-widest"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="E-MAIL"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#D4AF37]/50 text-[10px] font-semibold uppercase tracking-widest"
                />
                <input
                  name="whatsapp"
                  onChange={(e) => setPhone(maskPhone(e))}
                  value={phone}
                  placeholder="WHATSAPP"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#D4AF37]/50 text-[10px] font-semibold uppercase tracking-widest"
                />

                <button
                  disabled={loading}
                  className="w-full bg-[#D4AF37] text-black font-semibold uppercase tracking-[0.2em] text-[10px] h-12 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-all"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    'Enviar Pedido'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6 animate-in zoom-in">
              <CheckCircle2 size={32} className="text-[#D4AF37] mx-auto mb-4" />
              <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-2">
                Pedido Enviado
              </h3>
              <p className="text-white/40 text-[10px] mb-6">
                Aguarde o retorno do responsável.
              </p>
              <button
                onClick={onClose}
                className="text-[#D4AF37] text-[9px] font-semibold uppercase tracking-widest border-b border-[#D4AF37]/20"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
