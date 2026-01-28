'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createGaleria, updateGaleria } from '@/core/services/galeria.service';
import { SubmitButton } from '@/components/ui';
import { Save, CheckCircle2, Sparkles, Link2, Check, ArrowLeft } from 'lucide-react';
import GaleriaFormContent from './GaleriaFormContent';
import type { Galeria } from '@/core/types/galeria';
import { Toast } from '@/components/ui';
import GoogleConsentAlert from '@/components/auth/GoogleConsentAlert';
import BaseModal from '@/components/ui/BaseModal';
import { getPublicGalleryUrl, copyToClipboard, getLuxuryMessageData } from '@/core/utils/url-helper';
import { executeShare } from '@/core/utils/share-helper';
import { useNavigation } from '@/components/providers/NavigationProvider';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

interface PhotographerProfile {
  id: string;
  username: string;
  full_name: string;
  google_refresh_token?: string | null;
  settings?: any;
}

interface GaleriaFormPageProps {
  galeria: Galeria | null;
  isEdit: boolean;
  initialProfile: PhotographerProfile;
}

export default function GaleriaFormPage({
  galeria,
  isEdit,
  initialProfile,
}: GaleriaFormPageProps) {
  const router = useRouter();
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedGaleria, setSavedGaleria] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formTitle, setFormTitle] = useState(galeria?.title || '');
  const [showConsentAlert, setShowConsentAlert] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // 🎯 Form Initialization
  const { register, setValue, watch, handleSubmit: handleFormSubmit } = useForm({
    defaultValues: {
      lead_purpose: galeria?.lead_purpose || initialProfile.settings?.defaults?.data_treatment_purpose || '',
      leads_enabled: galeria ? (galeria.leads_enabled === true || String(galeria.leads_enabled) === 'true') : (initialProfile?.settings?.defaults?.enable_guest_registration ?? false),
    }
  });

  // 🎯 ESTADOS DE CUSTOMIZAÇÃO COM VALORES PADRÃO
  const [showCoverInGrid, setShowCoverInGrid] = useState(() => {
    if (galeria) {
      return (
        galeria.show_cover_in_grid === true ||
        String(galeria.show_cover_in_grid) === 'true'
      );
    }
    // Se for uma nova galeria, verifica se há uma foto de fundo padrão
    return !!initialProfile.settings?.defaults?.background_photo;
  });
  const [gridBgColor, setGridBgColor] = useState(
    galeria?.grid_bg_color || initialProfile.settings?.defaults?.background_color || '#FFFFFF',
  );
  const [columns, setColumns] = useState({
    mobile: galeria?.columns_mobile || initialProfile.settings?.defaults?.grid_mobile || 2,
    tablet: galeria?.columns_tablet || initialProfile.settings?.defaults?.grid_tablet || 3,
    desktop: galeria?.columns_desktop || initialProfile.settings?.defaults?.grid_desktop || 4,
  });

  // 🎯 UX: Auto-focus no primeiro campo
  useEffect(() => {
    setTimeout(() => {
      const firstInput = formRef.current?.querySelector(
        'input[type="text"], input[type="date"], select',
      ) as HTMLInputElement;
      firstInput?.focus();
    }, 100);
  }, []);

  // 🎯 UX: Trava scroll do body quando página está ativa
  useEffect(() => {
    document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    
    // 🎯 Captura dados do useForm (como lead_purpose e leads_enabled que agora são gerenciados por componente compartilhado)
    const formValues = watch();
    formData.set('lead_purpose', formValues.lead_purpose || '');
    formData.set('leads_enabled', String(!!formValues.leads_enabled));

    const driveId = formData.get('drive_folder_id') as string;
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const selectedCategory = formData.get('category') as string;
    const hasClient = formData.get('has_contracting_client') === 'true';
    const clientName = formData.get('client_name') as string;
    const password = formData.get('password') as string;
    const isPublicValue = formData.get('is_public') === 'true';

    // Validações
    if (!title?.trim()) {
      setToast({ message: 'O título é obrigatório.', type: 'error' });
      return;
    }
    if (!date) {
      setToast({ message: 'A data é obrigatória.', type: 'error' });
      return;
    }
    if (!selectedCategory || selectedCategory === 'undefined') {
      setToast({ message: 'Selecione uma categoria.', type: 'error' });
      return;
    }
    if (!driveId || driveId === '' || driveId === 'null') {
      setToast({ message: 'Selecione uma pasta do Drive.', type: 'error' });
      return;
    }
    if (hasClient && !clientName?.trim()) {
      setToast({ message: 'Nome do cliente é obrigatório.', type: 'error' });
      return;
    }
    if (!isPublicValue) {
      const hasExistingPassword = isEdit && galeria?.password;
      if (!hasExistingPassword && !password) {
        setToast({
          message: 'Defina uma senha para a galeria privada.',
          type: 'error',
        });
        return;
      }
      if (!password || password.length < 4 || password.length > 8) {
        setToast({
          message: 'A senha privada deve ter entre 4 e 8 números.',
          type: 'error',
        });
        return;
      }
    }

    setLoading(true);

    formData.set('is_public', String(isPublicValue));
    formData.set('show_cover_in_grid', String(showCoverInGrid));
    formData.set('grid_bg_color', gridBgColor);
    formData.set('columns_mobile', String(columns.mobile));
    formData.set('columns_tablet', String(columns.tablet));
    formData.set('columns_desktop', String(columns.desktop));

    const whatsappRaw = formData.get('client_whatsapp') as string;
    if (whatsappRaw) formData.set('client_whatsapp', whatsappRaw.replace(/\D/g, ''));

    if (!hasClient) {
      formData.set('client_name', 'Cobertura');
      formData.set('client_whatsapp', '');
    }

    try {
      const result = isEdit
        ? await updateGaleria(galeria!.id, formData)
        : await createGaleria(formData);

      if (result.success) {
        setIsSuccess(true);
        setHasUnsavedChanges(false);
        setSavedGaleria(result.data);
        setTimeout(() => {
          setShowSuccessModal(true);
          setIsSuccess(false);
        }, 800);
      } else {
        setToast({
          message: result.error || 'Falha ao salvar.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Erro no handleSubmit:', error);
      setToast({ message: 'Erro de conexão.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const url = getPublicGalleryUrl(initialProfile, savedGaleria?.slug || galeria?.slug || '');
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    const url = getPublicGalleryUrl(initialProfile, savedGaleria?.slug || galeria?.slug || '');
    const message = getLuxuryMessageData(savedGaleria || galeria, url);
    executeShare({
      title: (savedGaleria || galeria).title,
      text: message,
      phone: (savedGaleria || galeria).client_whatsapp,
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* FORM CONTENT - Layout Duas Colunas (65/35) */}
      <div className="flex-1 overflow-hidden">
        <div className="w-full max-w-7xl mx-auto h-full">
          <form
            ref={formRef}
            id="galeria-form"
            onSubmit={handleSubmit}
            className="h-full"
            onChange={() => setHasUnsavedChanges(true)}
          >
            <GaleriaFormContent
              initialData={galeria}
              isEdit={isEdit}
              customization={{ showCoverInGrid, gridBgColor, columns }}
              setCustomization={{
                setShowCoverInGrid,
                setGridBgColor,
                setColumns,
              }}
              onPickerError={(msg: string) =>
                setToast({ message: msg, type: 'error' })
              }
              onTokenExpired={() => setShowConsentAlert(true)}
              onTitleChange={setFormTitle}
              profile={initialProfile}
              register={register}
              setValue={setValue}
              watch={watch}
            />
          </form>
        </div>
      </div>

      {/* STICKY FOOTER - Azul Petróleo Profundo */}
      <div className="sticky bottom-0 z-50 bg-petroleum border-t border-white/10">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Status de Salvamento - Esquerda */}
          <div className="text-[10px] text-white/70 uppercase tracking-widest">
            {hasUnsavedChanges ? 'Alterações não salvas' : 'Tudo salvo'}
          </div>

          {/* Botões - Direita */}
          <div className="flex items-center gap-4">
            {isEdit && (
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="btn-secondary-petroleum px-4"
              >
                CANCELAR
              </button>
            )}
            <SubmitButton
              form="galeria-form"
              success={isSuccess}
              className="px-6"
              icon={<Save size={14} />}
              label={
                loading
                  ? 'Salvando...'
                  : isEdit
                    ? 'SALVAR ALTERAÇÕES'
                    : 'CRIAR GALERIA'
              }
            />
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <GoogleConsentAlert
        isOpen={showConsentAlert}
        onClose={() => setShowConsentAlert(false)}
        onConfirm={() => {
          setShowConsentAlert(false);
          window.location.reload();
        }}
      />

      {/* 🎯 MODAL DE SUCESSO PADRONIZADO (EDITORIAL) */}
      <BaseModal
        isOpen={showSuccessModal}
        showCloseButton={isEdit}
        onClose={() => setShowSuccessModal(false)}
        title={isEdit ? 'Galeria Atualizada' : 'Galeria Criada'}
        subtitle={isEdit ? 'Suas alterações foram salvas' : 'Sua nova galeria está pronta'}
        maxWidth="lg"
        headerIcon={
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/5">
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
        }
        footer={
          <div className="flex flex-col gap-3">
            {/* Linha Única: Ações Principais com Larguras Iguais */}
            <div className="grid grid-cols-2 gap-3 w-full items-center">
              <button
                onClick={() => {
                  navigate('/dashboard', 'Voltando ao painel...');
                }}
                className="btn-secondary-white w-full"
              >
                <ArrowLeft size={14} /> Espaço de Galerias
              </button>

              <a
                href={getPublicGalleryUrl(initialProfile, savedGaleria?.slug || galeria?.slug || '')}
                target="_blank"
                className="w-full h-10 flex items-center justify-center gap-2 bg-champagne text-petroleum rounded-luxury font-semibold text-[10px] uppercase tracking-luxury hover:bg-white transition-all shadow-xl active:scale-[0.98]"
              >
                <Sparkles size={14} /> Visualizar Galeria
              </a>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/80 font-medium text-center px-4">
            A galeria <strong>{formTitle}</strong> foi {isEdit ? 'atualizada' : 'criada'} com sucesso e já pode ser compartilhada com seus clientes.
          </p>
          
          <div className="p-4 bg-slate-50 border border-petroleum/10 rounded-luxury flex flex-col items-center gap-4">
            <p className="text-[10px] font-semibold text-petroleum/80 text-center uppercase tracking-luxury">
              Compartilhe o link direto com seu cliente:
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="h-11 px-6 flex items-center justify-center gap-2 text-white bg-[#25D366] hover:bg-[#20ba56] rounded-luxury shadow-md transition-all text-[10px] font-bold uppercase tracking-widest active:scale-95"
                title="Compartilhar via WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 fill-current" />
                WhatsApp
              </button>

              <button
                onClick={handleCopyLink}
                className="h-11 px-6 flex items-center justify-center gap-2 text-petroleum bg-white border border-petroleum/20 rounded-luxury shadow-sm hover:border-petroleum/40 transition-all text-[10px] font-bold uppercase tracking-widest active:scale-95"
                title="Copiar Link da Galeria"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-600 animate-in zoom-in duration-300" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Link2 size={16} className="text-petroleum/40" />
                    Copiar Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
