'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  Layout,
  ShieldCheck,
  User,
  Eye,
  Users,
  Palette,
  Briefcase,
  Shield,
  FolderSync,
  ImageIcon,
} from 'lucide-react';

import { UserSettingsSchema } from '@/core/types/profile';
import { updateProfileSettings } from '@/core/services/profile.service';

import { usePlan } from '@/core/context/PlanContext';
import { Toast } from '@/components/ui';
import FormPageBase from '@/components/ui/FormPageBase';
import { LeadCaptureSection } from '@/components/ui/LeadCaptureSection';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { GalleryDesignFields } from '@/features/galeria/components/admin/GaleriaDesignFields';

const CombinedSchema = z.object({
  settings: UserSettingsSchema,
});

type CombinedData = z.infer<typeof CombinedSchema>;

const FormSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-luxury border border-slate-400 p-4 space-y-3">
    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
      {icon && <div className="text-gold">{icon}</div>}
      <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
        {title}
      </h3>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

export default function SettingsForm({ profile }: { profile: any }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const { permissions } = usePlan();

  const defaultValues: CombinedData = {
    settings: {
      display: {
        show_contract_type:
          profile.settings?.display?.show_contract_type ?? true,
        default_type: profile.settings?.display?.default_type ?? 'contract',
      },
      defaults: {
        list_on_profile: profile.settings?.defaults?.list_on_profile ?? false,
        is_public: profile.settings?.defaults?.is_public ?? true,
        enable_guest_registration: permissions.canCaptureLeads
          ? (profile.settings?.defaults?.enable_guest_registration ?? false)
          : false,
        required_guest_fields: profile.settings?.defaults
          ?.required_guest_fields ?? ['name', 'whatsapp'],
        data_treatment_purpose:
          profile.settings?.defaults?.data_treatment_purpose ?? '',
        background_color:
          profile.settings?.defaults?.background_color ?? '#FFFFFF',
        background_photo: profile.settings?.defaults?.background_photo ?? '',
        grid_mobile: profile.settings?.defaults?.grid_mobile ?? 2,
        grid_tablet: profile.settings?.defaults?.grid_tablet ?? 3,
        grid_desktop: profile.settings?.defaults?.grid_desktop ?? 4,
      },
    },
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<CombinedData>({
    resolver: zodResolver(CombinedSchema),
    defaultValues,
  });

  const onSubmit = async (data: CombinedData) => {
    setIsSaving(true);
    try {
      const result = await updateProfileSettings(data);
      if (result.success) {
        setIsSuccess(true);
        setToast({
          message: 'Preferências salvas com sucesso!',
          type: 'success',
        });
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        setToast({ message: result.error || 'Erro ao salvar.', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Ocorreu um erro técnico.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const settings = watch('settings');

  return (
    <FormPageBase
      title="Preferências do Aplicativo"
      isEdit={true}
      loading={isSaving}
      isSuccess={isSuccess}
      hasUnsavedChanges={isDirty}
      onClose={() => router.back()}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="SALVAR PREFERÊNCIAS"
      id="settings-form"
    >
      <div className="max-w-5xl mx-auto space-y-3 pb-4 font-sans">
        {/* SEÇÃO 1: PADRÕES DE IDENTIFICAÇÃO (ALINHADO HORIZONTALMENTE) */}
        <FormSection title="Padrões de Identificação" icon={<User size={14} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* TIPO PADRÃO */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum/60 flex items-center gap-1.5">
                <Briefcase size={12} strokeWidth={2} className="text-gold" />
                Tipo de Galeria Padrão
              </label>

              <div className="flex p-1 bg-slate-50 rounded-luxury border border-slate-200 h-10 items-center relative">
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[0.35rem] transition-all duration-300 bg-champagne border border-gold/20 shadow-sm ${
                    settings.display.default_type === 'contract'
                      ? 'left-1'
                      : 'left-[calc(50%+1px)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setValue('settings.display.default_type', 'contract', {
                      shouldDirty: true,
                    })
                  }
                  className={`relative z-10 flex-1 text-[9px] font-semibold uppercase tracking-luxury-widest transition-colors ${
                    settings.display.default_type === 'contract'
                      ? 'text-black'
                      : 'text-petroleum/60'
                  }`}
                >
                  Contrato
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setValue('settings.display.default_type', 'event', {
                      shouldDirty: true,
                    })
                  }
                  className={`relative z-10 flex-1 text-[9px] font-semibold uppercase tracking-luxury-widest transition-colors ${
                    settings.display.default_type === 'event'
                      ? 'text-black'
                      : 'text-petroleum/60'
                  }`}
                >
                  Cobertura
                </button>
              </div>
              <p className="text-[9px] text-petroleum/50 italic px-1">
                Define qual opção virá selecionada ao criar uma nova galeria.
              </p>
            </div>

            {/* VISIBILIDADE NO PERFIL */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum/60 flex items-center gap-1.5">
                <Eye size={12} strokeWidth={2} className="text-gold" />
                Listagem no Perfil
              </label>

              <div className="flex items-center justify-between p-1 px-4 bg-slate-50 rounded-luxury border border-slate-200 h-10">
                <span className="text-[9px] font-semibold uppercase tracking-luxury-widest text-petroleum/80">
                  {settings.defaults.list_on_profile ? 'Ativado' : 'Desativado'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setValue(
                      'settings.defaults.list_on_profile',
                      !settings.defaults.list_on_profile,
                      { shouldDirty: true },
                    )
                  }
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${settings.defaults.list_on_profile ? 'bg-gold' : 'bg-slate-200'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${settings.defaults.list_on_profile ? 'translate-x-4' : ''}`}
                  />
                </button>
              </div>
              <p className="text-[9px] text-petroleum/50 italic px-1">
                Define se as novas galerias serão exibidas automaticamente no
                seu perfil público.
              </p>
            </div>
          </div>
        </FormSection>

        {/* SEÇÃO 2: PRIVACIDADE PADRÃO */}
        <FormSection
          title="Privacidade Padrão"
          icon={<ShieldCheck size={14} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum/60 flex items-center gap-1.5">
                <Shield size={12} className="text-gold" />
                Acesso Inicial
              </label>
              <div className="flex bg-slate-100 p-1 rounded-luxury border border-slate-200 h-10 items-center">
                <button
                  type="button"
                  onClick={() =>
                    setValue('settings.defaults.is_public', true, {
                      shouldDirty: true,
                    })
                  }
                  className={`flex-1 h-full rounded-[0.4rem] text-[9px] font-bold uppercase tracking-widest transition-all ${settings.defaults.is_public ? 'bg-champagne shadow-sm text-petroleum' : 'text-slate-400'}`}
                >
                  Público
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setValue('settings.defaults.is_public', false, {
                      shouldDirty: true,
                    })
                  }
                  className={`flex-1 h-full rounded-[0.4rem] text-[9px] font-bold uppercase tracking-widest transition-all ${!settings.defaults.is_public ? 'bg-champagne shadow-sm text-petroleum' : 'text-slate-400'}`}
                >
                  Privado
                </button>
              </div>
              <p className="text-[9px] text-petroleum/50 italic px-1">
                Define se novas galerias começam como públicas ou protegidas.
              </p>
            </div>
          </div>
        </FormSection>

        {/* SEÇÃO 3: CAPTURA DE LEADS PADRÃO */}
        <FormSection title="Cadastro de Visitante" icon={<Users size={14} />}>
          <div className="space-y-2">
            <LeadCaptureSection
              enabled={settings.defaults.enable_guest_registration}
              setEnabled={(val) =>
                setValue('settings.defaults.enable_guest_registration', val, {
                  shouldDirty: true,
                })
              }
              requiredFields={settings.defaults.required_guest_fields}
              setRequiredFields={(val) =>
                setValue('settings.defaults.required_guest_fields', val, {
                  shouldDirty: true,
                })
              }
              register={register}
              setValue={setValue}
              watch={watch}
              purposeFieldName="settings.defaults.data_treatment_purpose"
              initialPurposeValue={
                profile.settings?.defaults?.data_treatment_purpose
              }
              toggleLabel="Habilitar cadastro por padrão em novas galerias"
              showLayout="grid"
              isEdit={true}
            />
            <p className="text-[9px] text-petroleum/50 italic px-1 pt-2">
              Configure se deseja capturar dados dos visitantes da galeria.
            </p>
          </div>
        </FormSection>

        {/* SEÇÃO 4: DESIGN PADRÃO */}
        <FormSection title="Design Padrão" icon={<Palette size={14} />}>
          <div className="space-y-4">
            <GalleryDesignFields
              showBackgroundPhoto={!!settings.defaults.background_photo}
              setShowBackgroundPhoto={(val) =>
                !val &&
                setValue('settings.defaults.background_photo', '', {
                  shouldDirty: true,
                })
              }
              backgroundColor={settings.defaults.background_color}
              setBackgroundColor={(val) =>
                setValue('settings.defaults.background_color', val, {
                  shouldDirty: true,
                })
              }
              onBackgroundPhotoUrlChange={(val) =>
                setValue('settings.defaults.background_photo', val, {
                  shouldDirty: true,
                })
              }
              columns={{
                mobile: settings.defaults.grid_mobile,
                tablet: settings.defaults.grid_tablet,
                desktop: settings.defaults.grid_desktop,
              }}
              setColumns={(cols) => {
                setValue('settings.defaults.grid_mobile', cols.mobile, {
                  shouldDirty: true,
                });
                setValue('settings.defaults.grid_tablet', cols.tablet, {
                  shouldDirty: true,
                });
                setValue('settings.defaults.grid_desktop', cols.desktop, {
                  shouldDirty: true,
                });
              }}
              register={register}
            />
            <p className="text-[9px] text-petroleum/50 italic px-1">
              Personalize a aparência que suas novas galerias terão por padrão.
            </p>
          </div>
        </FormSection>
        {/* SEÇÃO 2: PADRÕES DO GOOGLE DRIVE (NOVA) */}
        <FormSection
          title="Padrões do Google Drive"
          icon={<FolderSync size={14} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* PASTA RAIZ PADRÃO */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum/60 flex items-center gap-1.5">
                <FolderSync size={12} strokeWidth={2} className="text-gold" />
                Pasta Raiz (ID)
              </label>
              <input
                {...register('settings.defaults.google_drive_root_id')}
                placeholder="ID da pasta no Google Drive"
                className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-luxury text-[12px] outline-none focus:border-gold transition-all"
              />
              <p className="text-[9px] text-petroleum/50 italic px-1">
                O seletor de arquivos abrirá diretamente nesta pasta (Ex: sua
                pasta de 'Trabalhos').
              </p>
            </div>

            {/* RENOMEAR FOTOS PADRÃO */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum/60 flex items-center gap-1.5">
                <ImageIcon size={12} strokeWidth={2} className="text-gold" />
                Renomeação Sequencial
              </label>
              <div className="flex items-center justify-between p-1 px-4 bg-slate-50 rounded-luxury border border-slate-200 h-10">
                <span className="text-[9px] font-semibold uppercase tracking-luxury-widest text-petroleum/80">
                  {watch('settings.defaults.rename_files_sequential')
                    ? 'Ativado'
                    : 'Desativado'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setValue(
                      'settings.defaults.rename_files_sequential',
                      !watch('settings.defaults.rename_files_sequential'),
                      { shouldDirty: true },
                    )
                  }
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${watch('settings.defaults.rename_files_sequential') ? 'bg-gold' : 'bg-slate-200'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${watch('settings.defaults.rename_files_sequential') ? 'translate-x-4' : ''}`}
                  />
                </button>
              </div>
              <p className="text-[9px] text-petroleum/50 italic px-1">
                Padroniza fotos para "foto-001.jpg" automaticamente em novas
                galerias.
              </p>
            </div>
          </div>
        </FormSection>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </FormPageBase>
  );
}
