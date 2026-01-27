'use client';

import { useState, useMemo, useEffect } from 'react';
import { maskPhone } from '@/core/utils/masks-helpers';
import BaseModal from '@/components/ui/BaseModal';
import { authenticateGaleriaAccessAction, captureLeadAction } from '@/actions/auth.actions';
import { Galeria } from '@/core/types/galeria';
import { User, Mail, Smartphone, CheckCircle, Camera } from 'lucide-react';
import Link from 'next/link';
import PasswordInput from '@/components/ui/PasswordInput';
import * as z from 'zod';
import { getDirectGoogleUrl } from '@/core/utils/url-helper';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [isImageActuallyLoaded, setIsImageActuallyLoaded] = useState(false);

  const hasPassword = !galeria.is_public;
  const leadsEnabled = galeria.leads_enabled;

  // 🎯 DEDUPLICAÇÃO INTELIGENTE: Se já tem o lead, libera na hora
  useEffect(() => {
    if (!isOpen || !onSuccess) return;
    const leadCaptured = localStorage.getItem(`lead_captured_${galeria.id}`);
    if (leadCaptured === 'true' && !hasPassword) {
      onSuccess();
    }
  }, [isOpen, galeria.id, hasPassword, onSuccess]);

  const coverUrl = useMemo(() => getDirectGoogleUrl(galeria.cover_image_url, '1280'), [galeria.cover_image_url]);

  useEffect(() => {
    if (!coverUrl) return;
    const img = new Image();
    const checkCache = () => { if (img.complete && img.naturalWidth > 0) setIsImageActuallyLoaded(true); };
    img.onload = () => setIsImageActuallyLoaded(true);
    img.src = coverUrl;
    checkCache();
  }, [coverUrl]);

  const acessoGaleriaSchema = useMemo(() => {
    return z.object({
      name: z.string(),
      email: z.string(),
      whatsapp: z.string(),
      password: z.string(),
    }).superRefine((data, ctx) => {
      if (leadsEnabled) {
        if (galeria.leads_require_name && !data.name.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome obrigatório", path: ["name"] });
        }
        const whatsappDigits = data.whatsapp.replace(/\D/g, '');
        if (galeria.leads_require_whatsapp && whatsappDigits.length < 11) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número incompleto", path: ["whatsapp"] });
        }
        if (galeria.leads_require_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "E-mail inválido", path: ["email"] });
        }
      }
      if (hasPassword && !data.password.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Senha obrigatória", path: ["password"] });
      }
    });
  }, [leadsEnabled, hasPassword, galeria]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    setGlobalError('');

    const validation = acessoGaleriaSchema.safeParse(formData);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => { if (issue.path[0]) newErrors[issue.path[0] as string] = issue.message; });
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
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
        localStorage.setItem(`lead_captured_${galeria.id}`, 'true');
      }

      if (hasPassword) {
        const result = await authenticateGaleriaAccessAction(galeria.id, fullSlug, formData.password);
        if (result && !result.success) {
          setErrors({ password: result.error || 'Senha incorreta' });
          setLoading(false);
          return;
        }
      }

      // 🎯 EVITA DOUBLE LOADING: Removemos o reload() para não disparar o LoadingScreen da página novamente
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      //setGlobalError('Ocorreu um erro ao processar seu acesso.');
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
        className="w-full bg-champagne hover:bg-white text-petroleum font-bold py-3.5 rounded-luxury transition-all flex items-center justify-center gap-2 group uppercase tracking-widest text-[10px] shadow-lg shadow-champagne/10 disabled:opacity-50"
      >
        {loading ? (
          <div className="loading-luxury w-4 h-4 border-petroleum" />
        ) : (
          <>
            <CheckCircle size={14} className="group-hover:scale-110 transition-transform" />
            Acessar Galeria
          </>
        )}
      </button>
      <p className="mt-3 text-[8px] text-white/60 text-center uppercase tracking-[0.2em]">
        Ambiente seguro • Suas informações estão protegidas
      </p>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4">

      {/* BACKGROUND - TOTALMENTE VISÍVEL (Com efeito Hero) */}
      <div className="absolute inset-0 z-0">
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[1500ms] ease-in-out
            ${!isImageActuallyLoaded ? 'scale-110 blur-2xl opacity-50' : 'scale-100 blur-0 opacity-100'}`}
          style={{
            backgroundImage: `url(${coverUrl})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
      </div>

      <BaseModal
        isOpen={isOpen && !loading}
        onClose={() => { }}
        showCloseButton={false}
        title="Acesso à Galeria"
        subtitle={galeria.title}
        maxWidth="lg"
        overlayOpacity="10"    // Apenas 10% de escurecimento (quase invisível)
        blurLevel="none"       // Foto de fundo fica 100% nítida
        footer={footer}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-left mb-1">
            <Camera className="text-champagne w-8 h-8" strokeWidth={1.5} />
            <p className="text-petroleum/70 text-[13px] italic leading-relaxed text-left font-semibold">
              {hasPassword ? (
                <span>
                  Galeria protegida. Por favor, identifique-se para continuar.
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
                {galeria.leads_require_name && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-2">
                      <User size={12} className="text-petroleum/40" /> Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      minLength={5}
                      maxLength={50}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Como devemos te chamar?"
                      className={`w-full bg-white border ${errors.name ? 'border-red-500/50' : 'border-petroleum/20'} rounded-luxury px-4 h-11 text-petroleum text-sm outline-none focus:border-gold transition-all placeholder:text-petroleum/30`}
                    />
                    {errors.name && <p className="text-red-500/80 text-[9px] uppercase font-semibold">{errors.name}</p>}
                  </div>
                )}

                {(galeria.leads_require_whatsapp || galeria.leads_require_email) && (
                  <div className="flex flex-col md:flex-row gap-3">
                    {galeria.leads_require_whatsapp && (
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-2">
                          <Smartphone size={12} className="text-petroleum/40" /> WhatsApp
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: maskPhone(e) })}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          className={`w-full bg-white border ${errors.whatsapp ? 'border-red-500/50' : 'border-petroleum/20'} rounded-luxury px-4 h-11 text-petroleum text-sm outline-none focus:border-gold transition-all placeholder:text-petroleum/30`}
                        />
                        {errors.whatsapp && <p className="text-red-500/80 text-[9px] uppercase font-semibold">{errors.whatsapp}</p>}
                      </div>
                    )}
                    {galeria.leads_require_email && (
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-2">
                          <Mail size={12} className="text-petroleum/40" /> E-mail
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
                    )}
                  </div>
                )}
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
            {/* BLOCO LGPD EDITORIAL */}
            {(galeria.leads_require_name && galeria.leads_require_whatsapp || galeria.leads_require_email) && (

              <div className="pt-4 pb-2">
                <div className="flex items-start gap-3 group">
                  {/* container do checkbox */}
                  <div className="relative flex items-center mt-1 shrink-0 cursor-pointer">
                    <input
                      id="lgpd-consent"
                      type="checkbox"
                      required
                      className="peer h-4 w-4 appearance-none rounded-sm border border-petroleum/40 bg-white checked:bg-petroleum checked:border-petroleum transition-all cursor-pointer"
                    />
                    <CheckCircle size={11} className="absolute ml-0.5 text-gold opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>

                  {/* texto fora do label para evitar o uppercase global */}
                  <div className="text-[12px] text-petroleum font-semibold leading-relaxed !whitespace-normal break-words">
                    Esta coleta de dados é uma opção do organizador desta galeria.
                    os dados são processados pelo app <span className="font-bold">Sua Galeria</span> para a seguinte finalidade:
                    <span className="text-gold font-bold"> {galeria.lead_purpose || 'identificação para acesso à galeria'}</span>.
                    não sendo utilizados para nenhuma outra finalidade, conforme a
                    <button type="button" className="inline underline-offset-4 font-bold ml-1">
                      política de privacidade
                    </button>.
                  </div>
                </div>
              </div>
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
      `}      </style>
    </div>
  );
}
