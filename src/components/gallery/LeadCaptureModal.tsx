'use client';

import React, { useState } from 'react';
import { X, Gift, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { name: string; email: string; whatsapp?: string }) => void;
  galleryTitle: string;
}

export default function LeadCaptureModal({
  isOpen,
  onClose,
  onSuccess,
  galleryTitle,
}: LeadCaptureModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    whatsapp?: string;
  }>({});

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email inválido';
    }

    if (whatsapp && whatsapp.replace(/\D/g, '').length < 10) {
      newErrors.whatsapp = 'WhatsApp inválido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSuccess({
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : undefined,
      });
      // Limpa o formulário após sucesso
      setName('');
      setEmail('');
      setWhatsapp('');
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header com gradiente azul */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-6 pb-8">
          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all text-white"
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          {/* Ícone de presente */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
              <Gift size={32} className="text-white" strokeWidth={2} />
            </div>
          </div>

          {/* Título */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              Bem-vindo!
              <Sparkles size={20} className="text-[#D4AF37]" fill="#D4AF37" />
            </h2>
            <p className="text-white/90 text-sm">
              Quer liberar descontos exclusivos nos eventos?
            </p>
          </div>
        </div>

        {/* Conteúdo do formulário */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                Seu nome <span className="text-[#D4AF37]">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como podemos te chamar?"
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 ${
                  errors.name
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-slate-50 focus:border-[#D4AF37]'
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                Seu melhor email <span className="text-[#D4AF37]">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 ${
                  errors.email
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-slate-50 focus:border-[#D4AF37]'
                }`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label
                htmlFor="whatsapp"
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                WhatsApp <span className="text-slate-400 text-xs font-normal">(opcional)</span>
              </label>
              <input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 ${
                  errors.whatsapp
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-slate-50 focus:border-[#D4AF37]'
                }`}
                disabled={isSubmitting}
              />
              {errors.whatsapp && (
                <p className="mt-1 text-xs text-red-600">{errors.whatsapp}</p>
              )}
            </div>

            {/* Botão CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-900 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Gift size={18} strokeWidth={2.5} />
                  <span className="uppercase tracking-wider text-sm">
                    Liberar meus descontos
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Link para pular */}
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors py-2"
            disabled={isSubmitting}
          >
            Não quero agora
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
