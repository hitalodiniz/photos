'use client';

import { authenticateGaleriaAccess } from '@/core/services/galeria.service';
import React, { useState } from 'react';
import { Camera, Lock, Loader2, CheckCircle2, Send, X } from 'lucide-react';
import { Galeria } from '@/core/types/galeria';
import { sendAccessRequestAction } from '@/actions/email.actions';
import { maskPhone } from '@/core/utils/masks-helpers';

export default function PasswordPrompt({
  galeria,
  fullSlug,
  coverImageUrl,
}: {
  galeria: Galeria;
  fullSlug: string;
  coverImageUrl?: string;
}) {
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
      const result = await authenticateGaleriaAccess(
        galeria.id,
        fullSlug,
        password,
      );

      if (result && !result.success) {
        setError(result.error || 'Senha incorreta.');
        setIsChecking(false);
      }
    } catch (e: any) {
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
      {/* 📸 BACKGROUND COM A FOTO DA GALERIA */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{
            backgroundImage: `url(${coverImageUrl})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/45 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl text-center ring-1 ring-white/5">
          <div className="mx-auto w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_20px_rgba(243,229,171,0.15)]">
            <Camera className="text-[#F3E5AB] w-8 h-8 drop-shadow-[0_0_8px_rgba(243,229,171,0.6)]" />
          </div>

          <h1
            className="text-2xl md:text-3xl font-bold text-white mb-2 italic leading-tight drop-shadow-lg pb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {galeria.title}
          </h1>

          <form onSubmit={handleCheckPassword} className="space-y-6">
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Inserir senha"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value.replace(/\D/g, '').slice(0, 8))
              }
              maxLength={8}
              required
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white text-center text-2xl tracking-[0.3em] focus:ring-2 focus:ring-[#F3E5AB]/50 focus:border-[#F3E5AB]/50 transition-all outline-none placeholder:text-white/80 placeholder:text-base placeholder:tracking-normal font-light"
            />

            {error && (
              <div className="text-red-400 text-[10px] font-bold tracking-[0.2em] uppercase italic bg-red-400/5 py-3 rounded-xl border border-red-400/20 animate-in fade-in zoom-in duration-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl font-semibold transition-all shadow-lg active:scale-[0.98] text-sm tracking-[0.25em] uppercase bg-[#D4AF37] hover:bg-[#FAF0CA] text-slate-900 disabled:opacity-50"
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

          <div className="mt-8">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-[#F3E5AB]/60 hover:text-[#F3E5AB] text-[10px] tracking-[0.2em] uppercase font-bold transition-all border-b border-[#F3E5AB]/20 pb-1"
            >
              Não tenho a senha
            </button>
          </div>

          <AccessRequestModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            galeriaTitle={galeria.title}
            photographerEmail={galeria.photographer_email}
          />
        </div>
      </div>
    </div>
  );
}

export function AccessRequestModal({
  isOpen,
  onClose,
  galeriaTitle,
  photographerEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  galeriaTitle: string;
  photographerEmail: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskPhone(e);
    setPhone(maskedValue);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      // Chamada da Action ajustada para o novo padrão SMTP/Nodemailer
      const result = await sendAccessRequestAction({
        name: String(formData.get('name')),
        email: String(formData.get('email')),
        whatsapp: String(formData.get('whatsapp')),
        galeriaTitle,
        photographerEmail,
      });

      if (result.success) {
        setSent(true);
      } else {
        alert('Erro ao enviar solicitação: ' + result.error);
      }
    } catch (error) {
      console.error('Falha no envio da solicitação:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1A1A1A] border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 md:p-10">
          {!sent ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-serif italic text-white">
                    Solicitar Acesso
                  </h3>
                  <p className="text-[10px] text-[#D4AF37]/60 mt-1 uppercase tracking-[0.2em] font-bold">
                    Identifique-se para o fotógrafo
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  name="name"
                  placeholder="Seu Nome Completo"
                  min={3}
                  max={50}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#D4AF37]/50 transition-all text-sm"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Seu melhor E-mail"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#D4AF37]/50 transition-all text-sm"
                />
                <input
                  name="whatsapp"
                  onChange={handlePhoneChange}
                  placeholder="WhatsApp (com DDD)"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#D4AF37]/50 transition-all text-sm"
                />

                <button
                  disabled={loading}
                  className="w-full bg-[#D4AF37] text-black font-black uppercase tracking-widest text-[11px] py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#FAF0CA] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Send size={16} /> Enviar Solicitação
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-10 animate-in zoom-in duration-500">
              <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-[#D4AF37]" />
              </div>
              <h3 className="text-xl text-white font-serif italic mb-2">
                Solicitação Enviada!
              </h3>
              <p className="text-white/50 text-sm leading-relaxed px-4">
                O fotógrafo analisará seu pedido em breve e você receberá o
                retorno.
              </p>
              <button
                onClick={onClose}
                className="mt-10 text-[#D4AF37] uppercase tracking-[0.3em] text-[10px] font-black border-b-2 border-[#D4AF37]/20 pb-1 hover:border-[#D4AF37] transition-all"
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
