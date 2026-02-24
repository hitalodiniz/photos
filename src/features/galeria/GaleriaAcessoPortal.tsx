'use client';

import { useState, useMemo, useEffect } from 'react';
import { maskPhone } from '@/core/utils/masks-helpers';
import BaseModal from '@/components/ui/BaseModal';
import {
  authenticateGaleriaAccessAction,
  captureLeadAction,
} from '@/actions/auth.actions';
import { Galeria } from '@/core/types/galeria';
import { getCookie } from '@/core/utils/cookie-helper';
import { Mail, Smartphone, CheckCircle, Loader2, User } from 'lucide-react';

import PasswordInput from '@/components/ui/PasswordInput';
import * as z from 'zod';
import { getDirectGoogleUrl } from '@/core/utils/url-helper';
import { useSegment } from '@/hooks/useSegment';

interface GalleryAccessPortalProps {
  galeria: Galeria;
  fullSlug: string;
  isOpen: boolean;
  onSuccess?: () => void;
}

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
  const { SegmentIcon } = useSegment();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [isImageActuallyLoaded, setIsImageActuallyLoaded] = useState(false);

  const hasPassword = !galeria.is_public;
  const leadsEnabled = galeria.leads_enabled;

  // 🎯 AUTO-SUBMIT CONDICIONAL:
  // Só envia automático se NÃO houver captura de leads e a senha tiver 4 dígitos.
  useEffect(() => {
    if (
      hasPassword &&
      !leadsEnabled &&
      formData.password.length === 4 &&
      !loading
    ) {
      handleSubmit();
    }
  }, [formData.password, leadsEnabled, hasPassword]);

  useEffect(() => {
    if (!isOpen || !onSuccess) return;
    const leadCaptured = localStorage.getItem(`lead_captured_${galeria.id}`);
    if (leadCaptured === 'true' && !hasPassword) {
      onSuccess();
    }
  }, [isOpen, galeria.id, hasPassword, onSuccess]);

  const coverUrl = useMemo(() => {
    const resolved = getDirectGoogleUrl(galeria.cover_image_url, '1280');
    return typeof resolved === 'string' ? resolved : '';
  }, [galeria.cover_image_url]);

  useEffect(() => {
    if (!coverUrl) return;
    const img = new Image();
    const checkCache = () => {
      if (img.complete && img.naturalWidth > 0) setIsImageActuallyLoaded(true);
    };
    img.onload = () => setIsImageActuallyLoaded(true);
    img.src = coverUrl;
    checkCache();
  }, [coverUrl]);

  const acessoGaleriaSchema = useMemo(() => {
    return z
      .object({
        name: z.string(),
        email: z.string(),
        whatsapp: z.string(),
        password: z.string(),
      })
      .superRefine((data, ctx) => {
        if (leadsEnabled) {
          if (galeria.leads_require_name && !data.name.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Nome obrigatório',
              path: ['name'],
            });
          }
          const whatsappDigits = data.whatsapp.replace(/\D/g, '');
          if (galeria.leads_require_whatsapp && whatsappDigits.length < 11) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Número incompleto',
              path: ['whatsapp'],
            });
          }
          if (
            galeria.leads_require_email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'E-mail inválido',
              path: ['email'],
            });
          }
        }
        if (hasPassword && !data.password.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Senha obrigatória',
            path: ['password'],
          });
        }
      });
  }, [leadsEnabled, hasPassword, galeria]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    setGlobalError('');

    const validation = acessoGaleriaSchema.safeParse(formData);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) newErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      if (leadsEnabled) {
        const visitorIdRaw = await getCookie(`gsid-${galeria.id}`);
        const sessionVisitorId =
          typeof visitorIdRaw === 'string' ? visitorIdRaw : undefined;
        const leadResult = await captureLeadAction(galeria, {
          nome: formData.name,
          email: formData.email,
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          visitorId: sessionVisitorId,
        });

        if (!leadResult.success) {
          setGlobalError(leadResult.error || 'Erro ao processar dados.');
          setLoading(false);
          return;
        }
        localStorage.setItem(`lead_captured_${galeria.id}`, 'true');
      }

      if (hasPassword) {
        const result = await authenticateGaleriaAccessAction(
          galeria.id,
          fullSlug,
          formData.password,
        );
        if (result && !result.success) {
          setErrors({ password: result.error || 'Senha incorreta' });
          setFormData((prev) => ({ ...prev, password: '' })); // Limpa para permitir novo shake
          setLoading(false);
          // 🎯 Força o foco no input após o erro
          setTimeout(() => {
            const pinInput = document.getElementById('pin-hidden-input');
            pinInput?.focus();
          }, 10);
          return;
        }
      }

      setLoading(false);
      if (onSuccess) onSuccess();
    } catch {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const footer = (
    <div className="w-full">
      <button
        form="access-portal-form"
        type="submit"
        disabled={loading}
        className="btn-luxury-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Processando...</span>
          </>
        ) : (
          <>
            <CheckCircle
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
            <span>Acessar Galeria</span>
          </>
        )}
      </button>
      <p className="mt-3 text-[8px] text-white/60 text-center uppercase tracking-luxury-widest">
        Ambiente seguro • Suas informações estão protegidas
      </p>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 z-0">
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[1500ms] ease-in-out ${!isImageActuallyLoaded ? 'scale-110 blur-2xl opacity-50' : 'scale-100 blur-0 opacity-100'}`}
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
      </div>

      <BaseModal
        isOpen={isOpen}
        onClose={() => {}}
        showCloseButton={false}
        title="Acesso à Galeria"
        subtitle={galeria.title}
        maxWidth="lg"
        overlayOpacity="20"
        blurLevel="none"
        footer={footer}
      >
        <div className="space-y-4">
          {leadsEnabled && (
            <div className="flex items-start gap-3 text-left mb-1">
              <SegmentIcon className="text-gold w-5 h-5" strokeWidth={1.5} />
              <p className="text-petroleum text-[12px] italic leading-relaxed text-left font-medium">
                Seja bem-vindo! Informe seus dados para visualizar as fotos.
              </p>
            </div>
          )}
          <form
            id="access-portal-form"
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            {leadsEnabled && (
              <>
                {galeria.leads_require_name && (
                  <div className="space-y-1.5">
                    <label>
                      <User size={12} className="text-gold" /> Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      required
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Como devemos te chamar?"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter">
                        {errors.name}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3">
                  {galeria.leads_require_whatsapp && (
                    <div className="flex-1 space-y-1.5">
                      <label>
                        <Smartphone size={12} className="text-gold" /> WhatsApp
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.whatsapp}
                        onChange={(e) =>
                          setFormData({ ...formData, whatsapp: maskPhone(e) })
                        }
                        placeholder="(00) 00000-0000"
                        required
                      />
                      {errors.whatsapp && (
                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter">
                          {errors.whatsapp}
                        </p>
                      )}
                    </div>
                  )}
                  {galeria.leads_require_email && (
                    <div className="flex-1 space-y-1.5">
                      <label>
                        <Mail size={12} className="text-gold" /> E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="seu@email.com"
                        required
                      />
                      {errors.email && (
                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {hasPassword && (
              <div className="pt-2">
                <PasswordInput
                  variant={leadsEnabled ? 'compact' : 'pin'}
                  label="Senha de Acesso"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  error={errors.password}
                  autoFocus={!leadsEnabled}
                />
              </div>
            )}

            {leadsEnabled && (
              <div className="pt-2">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-luxury border border-slate-200">
                  <div className="relative flex items-center mt-1 shrink-0 cursor-pointer">
                    <input
                      id="lgpd-consent"
                      type="checkbox"
                      required
                      className="peer h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
                    />
                    <CheckCircle
                      size={12}
                      className="absolute ml-0.5 text-gold opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    />
                  </div>
                  <div className="text-[11px] text-petroleum/80 leading-relaxed">
                    Esta coleta de dados é uma opção do organizador. Os dados
                    são processados para:
                    <span className="font-bold">
                      {' '}
                      {galeria.lead_purpose || 'identificação para acesso'}
                    </span>
                    . Confira nossa{' '}
                    <button type="button" className="underline font-bold">
                      política de privacidade
                    </button>
                    .
                  </div>
                </div>
              </div>
            )}
            {globalError && (
              <p className="text-red-500 text-[10px] text-center font-semibold uppercase tracking-widest bg-red-500/5 py-2 rounded-luxury border border-red-500/10">
                {globalError}
              </p>
            )}
          </form>
        </div>
      </BaseModal>
    </div>
  );
}
