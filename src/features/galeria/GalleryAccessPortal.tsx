'use client';

import { useState, useMemo } from 'react';
import { maskPhone } from '@/core/utils/masks-helpers';
import BaseModal from '@/components/ui/BaseModal';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { authenticateGaleriaAccessAction, captureLeadAction } from '@/actions/auth.actions';
import { Galeria } from '@/core/types/galeria';
import { User, Mail, Smartphone, CheckCircle, Camera } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';
import * as z from 'zod';

interface GalleryAccessPortalProps {
  galeria: Galeria;
  fullSlug: string;
  isOpen: boolean;
  onSuccess?: () => void;
}

/**
 * GalleryAccessPortal Component
 * 
 * Interface unificada para captura de leads e verificação de senha.
 * Agora com suporte a validação no servidor via cookies para segurança total.
 */
export default function GalleryAccessPortal({
  galeria,
  fullSlug,
  isOpen,
  onSuccess,
}: GalleryAccessPortalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const hasPassword = !galeria.is_public;
  const leadsEnabled = galeria.leads_enabled;

  // 🎯 SCHEMA DE VALIDAÇÃO TOTALMENTE DINÂMICA
  const acessoGaleriaSchema = useMemo(() => {
    return z.object({
      name: z.string(),
      email: z.string(),
      whatsapp: z.string(),
      password: z.string(),
    }).superRefine((data, ctx) => {
      // 1. Validação de Leads
      if (leadsEnabled === true) {
        if (galeria.leads_require_name === true && (!data.name || data.name.trim().length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Nome é obrigatório",
            path: ["name"],
          });
        }
        
        if (galeria.leads_require_whatsapp === true && (!data.whatsapp || data.whatsapp.trim().length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "WhatsApp é obrigatório",
            path: ["whatsapp"],
          });
        }

        const emailTrimmed = data.email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (galeria.leads_require_email === true) {
          if (!emailTrimmed) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "E-mail é obrigatório",
              path: ["email"],
            });
          } else if (!emailRegex.test(emailTrimmed)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "E-mail inválido",
              path: ["email"],
            });
          }
        } else if (emailTrimmed && !emailRegex.test(emailTrimmed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "E-mail inválido",
            path: ["email"],
          });
        }
      }

      // 2. Validação de Senha
      if (hasPassword === true) {
        if (!data.password || data.password.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A senha é obrigatória",
            path: ["password"],
          });
        } else if (data.password.length < 4) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Mínimo de 4 dígitos",
            path: ["password"],
          });
        }
      }
    });
  }, [leadsEnabled, hasPassword, galeria.leads_require_name, galeria.leads_require_email, galeria.leads_require_whatsapp]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    setGlobalError('');

    const validation = acessoGaleriaSchema.safeParse(formData);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // PASSO 1: Captura de Lead (Servidor + Cookies)
      if (leadsEnabled) {
        const leadResult = await captureLeadAction(galeria.id, {
          nome: formData.name,
          email: formData.email,
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
        });
        
        if (!leadResult.success) {
          setGlobalError(leadResult.error || 'Erro ao processar dados.');
          setLoading(false);
          return;
        }
      }

      // PASSO 2: Verificação de Senha (Servidor + Cookies)
      if (hasPassword) {
        const result = await authenticateGaleriaAccessAction(
          galeria.id,
          fullSlug,
          formData.password
        );

        if (result && !result.success) {
          setErrors({ password: result.error || 'Senha incorreta' });
          setLoading(false);
          return;
        }
      }

      // SUCESSO: Recarrega a página para validar o novo estado no servidor
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          if (typeof window !== 'undefined') window.location.reload();
        }
      }, 800);
    } catch (error: any) {
      console.error('Erro no portal de acesso:', error);
      setGlobalError('Ocorreu um erro ao processar seu acesso.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const footer = (
    <div className="w-full">
      <button
        form="access-portal-form"
        type="submit"
        className="w-full bg-champagne hover:bg-white text-petroleum font-bold py-3.5 rounded-luxury transition-all flex items-center justify-center gap-2 group uppercase tracking-widest text-[10px] shadow-lg shadow-champagne/10"
      >        <CheckCircle size={14} className="group-hover:scale-110 transition-transform" />
        Acessar Galeria

      </button>
      <p className="mt-3 text-[8px] text-white/60 text-center uppercase tracking-[0.2em] leading-loose">
        Ambiente seguro • Suas informações estão protegidas
      </p>
    </div>
  );

  return (
    <>
      {loading && <LoadingScreen message="Validando seu acesso..." />}

      <BaseModal
        isOpen={isOpen && !loading}
        onClose={() => {}} 
        showCloseButton={false}
        title="Acesso à Galeria"
        subtitle={galeria.title}
        maxWidth="lg"
        footer={footer}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-left mb-1">
            <Camera className="text-champagne w-8 h-8" strokeWidth={1.5} />
            <p className="text-petroleum/70 text-[13px] italic leading-relaxed text-left font-semibold">
              {hasPassword ? (
                <span>
                  Esta é uma galeria protegida.<br />
                  Por favor, identifique-se para continuar.
                </span>
              ) : (
                <span>
                  Seja bem-vindo!
                  <br />
                  Por favor, informe seus dados para visualizar as fotos.
                </span>
              )}
            </p>
          </div>

          <form id="access-portal-form" onSubmit={handleSubmit} className="space-y-3">
            {leadsEnabled && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-2">
                    <User size={12} className="text-petroleum/40" /> Nome Completo {galeria.leads_require_name && '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Como devemos te chamar?"
                    className={`w-full bg-white border ${errors.name ? 'border-red-500/50' : 'border-petroleum/20'} rounded-luxury px-4 h-11 text-petroleum text-sm outline-none focus:border-gold transition-all placeholder:text-petroleum/30`}
                  />
                  {errors.name && <p className="text-red-500/80 text-[9px] uppercase font-semibold">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-2">
                    <Smartphone size={12} className="text-petroleum/40" /> WhatsApp {galeria.leads_require_whatsapp && '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: maskPhone(e as any) })}
                    placeholder="(00) 00000-0000"
                    className={`w-full bg-white border ${errors.whatsapp ? 'border-red-500/50' : 'border-petroleum/20'} rounded-luxury px-4 h-11 text-petroleum text-sm outline-none focus:border-gold transition-all placeholder:text-petroleum/30`}
                  />
                  {errors.whatsapp && <p className="text-red-500/80 text-[9px] uppercase font-semibold">{errors.whatsapp}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-2">
                    <Mail size={12} className="text-petroleum/40" /> E-mail {galeria.leads_require_email && '*'}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                    className={`w-full bg-white border ${errors.email ? 'border-red-500/50' : 'border-petroleum/20'} rounded-luxury px-4 h-11 text-petroleum text-sm outline-none focus:border-gold transition-all placeholder:text-petroleum/30`}
                  />
                  {errors.email && <p className="text-red-500/80 text-[9px] uppercase font-semibold">{errors.email}</p>}
                </div>
              </>
            )}

            {hasPassword && (
              <PasswordInput
                label="Senha de Acesso"
                placeholder="Senha numérica"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value.replace(/\D/g, '') })}
                error={errors.password}
              />
            )}

            {globalError && (
              <p className="text-red-500 text-[11px] text-center font-medium bg-red-500/5 py-2 rounded-lg border border-red-500/10">
                {globalError}
              </p>
            )}
          </form>
        </div>
      </BaseModal>

      <style jsx>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #00212E;
          -webkit-box-shadow: 0 0 0px 1000px white inset;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </>
  );
}
