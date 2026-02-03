'use client';

import { useState } from 'react';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import PasswordInput from '@/components/ui/PasswordInput';
import { authService } from '@photos/core-auth';

interface AccessUsernameProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccessUsername({
  isOpen,
  onClose,
}: AccessUsernameProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 🎯 Integração com seu authService existente
      //await authService.signInWithEmail(formData.email, formData.password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="w-full space-y-4">
      <button
        form="admin-login-form"
        type="submit"
        disabled={loading}
        className="btn-luxury-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="loading-luxury w-4 h-4 border-petroleum" />
        ) : (
          <>
            <LogIn size={14} />
            Acessar Espaço das Galerias
          </>
        )}
      </button>

      <div className="flex justify-between items-center px-1">
        <button
          type="button"
          className="text-[9px] text-white uppercase font-semibold tracking-widest hover:text-gold transition-colors"
        >
          Esqueci minha senha
        </button>
        <p className="text-[9px] text-white uppercase font-semibold tracking-widest">
          Criptografia de ponta
        </p>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
      title="Acesso restrito"
      subtitle="Espaço das galerias"
      maxWidth="lg"
      footer={footer}
    >
      <div className="py-2">
        {/* Cabeçalho Editorial Minimalista */}
        <div className="flex flex-row items-center text-left gap-4 mb-4 w-full border-b border-petroleum/5 pb-4">
          {/* Ícone com fundo sutil ocupando seu espaço fixo */}
          <div className="w-12 h-12 rounded-full bg-petroleum/5 flex items-center justify-center shrink-0 shadow-sm">
            <Lock className="text-gold w-5 h-5" strokeWidth={1.5} />
          </div>

          {/* Texto configurado para crescer e ocupar o restante do espaço */}
          <div className="flex-grow">
            <p className="text-petroleum text-[14px] font-medium leading-snug italic">
              Insira suas credenciais para gerenciar suas galerias
            </p>
            <div className="h-0.5 w-full bg-gold/30 mt-2 rounded-full" />
          </div>
        </div>

        <form
          id="admin-login-form"
          onSubmit={handleLogin}
          className="space-y-4"
        >
          {/* E-mail Profissional */}
          <div className="space-y-1.5">
            <label>
              <Mail size={12} className="text-gold" /> e-Mail
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="seu@exemplo.com"
              className="input-luxury w-full"
            />
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <PasswordInput
              label="Senha de Acesso"
              placeholder="Sua senha secreta"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          {error && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-red-500 text-[10px] text-center font-semibold bg-red-500/5 py-2.5 rounded-lg border border-red-500/10 uppercase tracking-tight">
                {error}
              </p>
            </div>
          )}

          {/* Call to Action para Registro (Opcional) */}
          <div className="pt-4 text-center">
            <p className="text-[11px] text-petroleum font-medium">
              Ainda não tem uma conta?{' '}
              <button
                type="button"
                className="text-gold font-semibold hover:underline underline-offset-4 transition-all"
              >
                Registre-se agora <ArrowRight size={12} className="inline" />
              </button>
            </p>
          </div>
        </form>
      </div>
    </BaseModal>
  );
}
