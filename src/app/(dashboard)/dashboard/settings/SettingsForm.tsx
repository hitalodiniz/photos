'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserSettingsSchema, MessageTemplatesSchema } from '@/core/types/profile';
import { updateProfileSettings } from '@/core/services/profile.service';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Layout, 
  Settings2, 
  MessageSquare, 
  Save, 
  CheckCircle2, 
  Monitor, 
  Smartphone, 
  Tablet,
  Palette,
  Image as ImageIcon,
  User,
  Info,
  ChevronRight,
  Home
} from 'lucide-react';
import { Toast } from '@/components/ui';
import FormPageBase from '@/components/ui/FormPageBase';
import { GalleryDesignFields } from '@/features/galeria/components/admin/GalleryDesignFields';

const CombinedSchema = z.object({
  settings: UserSettingsSchema,
  message_templates: MessageTemplatesSchema,
});

type CombinedData = z.infer<typeof CombinedSchema>;

const FormSection = ({
  title,
  icon,
  children
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-luxury border border-petroleum/40 p-4 md:p-6 space-y-4">
    <div className="flex items-center gap-2 pb-3 border-b border-petroleum/40">
      {icon && <div className="text-gold">{icon}</div>}
      <h3 className="text-xs font-bold uppercase tracking-widest text-petroleum ">
        {title}
      </h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export default function SettingsForm({ profile }: { profile: any }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const defaultValues: CombinedData = {
    settings: {
      display: {
        show_contract_type: profile.settings?.display?.show_contract_type ?? true,
      },
      defaults: {
        list_on_profile: profile.settings?.defaults?.list_on_profile ?? false,
        enable_guest_registration: profile.settings?.defaults?.enable_guest_registration ?? false,
        required_guest_fields: profile.settings?.defaults?.required_guest_fields ?? ['name', 'whatsapp'],
        data_treatment_purpose: profile.settings?.defaults?.data_treatment_purpose ?? '',
        background_color: profile.settings?.defaults?.background_color ?? '#FFFFFF',
        background_photo: profile.settings?.defaults?.background_photo ?? '',
        grid_mobile: profile.settings?.defaults?.grid_mobile ?? 2,
        grid_tablet: profile.settings?.defaults?.grid_tablet ?? 3,
        grid_desktop: profile.settings?.defaults?.grid_desktop ?? 4,
      },
    },
    message_templates: {
      luxury_share: profile.message_templates?.luxury_share ?? '',
      card_share: profile.message_templates?.card_share ?? '',
      photo_share: profile.message_templates?.photo_share ?? '',
      guest_share: profile.message_templates?.guest_share ?? '',
    },
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<any>({
    resolver: zodResolver(CombinedSchema),
    defaultValues,
  });

  const onSubmit = async (data: CombinedData) => {
    setIsSaving(true);
    setIsSuccess(false);
    try {
      const result = await updateProfileSettings(data);
      if (result.success) {
        setIsSuccess(true);
        setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        setToast({ message: result.error || 'Erro ao salvar configurações.', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Ocorreu um erro ao salvar.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const showContractType = watch('settings.display.show_contract_type');
  const listOnProfile = watch('settings.defaults.list_on_profile');
  const enableGuestRegistration = watch('settings.defaults.enable_guest_registration');
  const requiredGuestFields = watch('settings.defaults.required_guest_fields');
  const gridMobile = watch('settings.defaults.grid_mobile');
  const gridTablet = watch('settings.defaults.grid_tablet');
  const gridDesktop = watch('settings.defaults.grid_desktop');

  const toggleRequiredField = (field: string) => {
    const current = [...requiredGuestFields];
    if (current.includes(field)) {
      if (current.length > 1) {
        setValue('settings.defaults.required_guest_fields', current.filter(f => f !== field), { shouldDirty: true });
      }
    } else {
      setValue('settings.defaults.required_guest_fields', [...current, field], { shouldDirty: true });
    }
  };

  return (
    <FormPageBase
      title="Preferências do Usuário"
      isEdit={true}
      loading={isSaving}
      isSuccess={isSuccess}
      hasUnsavedChanges={isDirty}
      onClose={() => router.back()}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="SALVAR PREFERÊNCIAS"
      id="settings-form"
    >
      {/* CONTEÚDO COM SCROLL INTERNO */}
      <div className="flex-1 bg-slate-50/30 pt-6">
        <div className="max-w-5xl mx-auto p-4 md:p-10 space-y-3">

          {/* SEÇÃO EXIBIÇÃO */}
          <FormSection title="Exibição" icon={<Settings2 size={16} />}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum">
                  Habilitar tipo de galeria "Contrato"
                </label>
                <p className="text-[11px] text-petroleum/80 italic">
                  Se desativado, não será exibido o tipo "Contrato" na criação de galerias que será salva com o tipo "Cobertura", onde não se tem nome e Whatsapp do cliente .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setValue('settings.display.show_contract_type', !showContractType, { shouldDirty: true })}
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showContractType ? 'bg-gold' : 'bg-slate-200'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${showContractType ? 'translate-x-4' : ''}`}
                />
              </button>
            </div>
          </FormSection>

          <FormSection title="Padrões de Galeria" icon={<Layout size={16} />}>
            <div className="flex flex-col gap-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum ">
                    Exibir galeria no meu perfil público
                  </label>
                  <button
                    type="button"
                    onClick={() => setValue('settings.defaults.list_on_profile', !listOnProfile, { shouldDirty: true })}
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${listOnProfile ? 'bg-green-500' : 'bg-slate-200'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${listOnProfile ? 'translate-x-4' : ''}`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum ">
                    Habilitar cadastro de visitante por padrão
                  </label>
                  <button
                    type="button"
                    onClick={() => setValue('settings.defaults.enable_guest_registration', !enableGuestRegistration, { shouldDirty: true })}
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${enableGuestRegistration ? 'bg-gold' : 'bg-slate-200'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enableGuestRegistration ? 'translate-x-4' : ''}`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                  {enableGuestRegistration && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum">
                        Campos obrigatórios
                      </label>
                      <div className="flex flex-wrap gap-3 p-2.5 bg-slate-50 rounded-luxury border border-petroleum/20 h-11 items-center">
                        {['name', 'email', 'whatsapp'].map((field) => (
                          <div
                            key={field}
                            onClick={() => toggleRequiredField(field)}
                            className="flex items-center gap-1.5 cursor-pointer group"
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center ${requiredGuestFields.includes(field) ? 'bg-gold border-gold' : 'bg-white border-petroleum/40'}`}
                            >
                              {requiredGuestFields.includes(field) && <CheckCircle2 size={10} className="text-white" />}
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-petroleum/80 group-hover:text-petroleum">
                              {field === 'name' ? 'Nome' : field === 'email' ? 'E-mail' : 'Whatsapp'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`space-y-1.5 ${!enableGuestRegistration ? 'sm:col-span-2' : ''}`}>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum flex items-center gap-2">
                      Finalidade do tratamento (LGPD)
                    </label>
                    <input
                      {...register('settings.defaults.data_treatment_purpose')}
                      placeholder="Ex: identificação para acesso à galeria"
                      className="w-full px-3 h-11 bg-white border border-petroleum/20 rounded-luxury text-petroleum text-[13px] outline-none focus:border-gold transition-all"
                    />
                  </div>
                </div>
              </div>

            <div className="space-y-6 border-t border-petroleum/20 pt-6">
              <GalleryDesignFields
                showBackgroundPhoto={!!watch('settings.defaults.background_photo')}
                setShowBackgroundPhoto={(val) => {
                  if (!val) setValue('settings.defaults.background_photo', '', { shouldDirty: true });
                }}
                onBackgroundPhotoUrlChange={(val) => setValue('settings.defaults.background_photo', val, { shouldDirty: true })}
                backgroundColor={watch('settings.defaults.background_color')}
                setBackgroundColor={(val) => setValue('settings.defaults.background_color', val, { shouldDirty: true })}
                columns={{
                  mobile: watch('settings.defaults.grid_mobile'),
                  tablet: watch('settings.defaults.grid_tablet'),
                  desktop: watch('settings.defaults.grid_desktop')
                }}
                setColumns={(cols) => {
                  setValue('settings.defaults.grid_mobile', cols.mobile, { shouldDirty: true });
                  setValue('settings.defaults.grid_tablet', cols.tablet, { shouldDirty: true });
                  setValue('settings.defaults.grid_desktop', cols.desktop, { shouldDirty: true });
                }}
                register={register}
              />
            </div>
            </div>
          </FormSection>

          {/* SEÇÃO MODELOS DE MENSAGENS */}
          <FormSection title="Modelos de Mensagens WhatsApp" icon={<MessageSquare size={16} />}>
            <div className="bg-champagne/20 p-4 rounded-luxury border border-gold/20 flex gap-3 items-start mb-2">
              <Info size={16} className="text-gold shrink-0 mt-0.5" />
              <div className="text-[11px] text-petroleum/80 leading-relaxed">
                Personalize as mensagens enviadas aos seus clientes. Use as variáveis abaixo entre chaves para preenchimento automático:<br/>
                <span className="font-bold text-petroleum">{"{title}"}</span> - Título da Galeria | <span className="font-bold text-petroleum">{"{url}"}</span> - Link da Galeria | <span className="font-bold text-petroleum">{"{clientName}"}</span> - Nome do Cliente | <span className="font-bold text-petroleum">{"{date}"}</span> - Data do Evento
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum ">
                  Compartilhamento Luxury
                </label>
                <textarea
                  {...register('message_templates.luxury_share')}
                  placeholder="Olá {clientName}, aqui está o link da sua galeria: {url}"
                  className="w-full bg-white border border-petroleum/20 rounded-luxury p-4 text-[13px] text-petroleum outline-none focus:border-gold transition-all min-h-[120px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum ">
                  Compartilhamento de Card
                </label>
                <textarea
                  {...register('message_templates.card_share')}
                  className="w-full bg-white border border-petroleum/20 rounded-luxury p-4 text-[13px] text-petroleum outline-none focus:border-gold transition-all min-h-[120px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum ">
                  Compartilhamento de Foto Única
                </label>
                <textarea
                  {...register('message_templates.photo_share')}
                  className="w-full bg-white border border-petroleum/20 rounded-luxury p-4 text-[13px] text-petroleum outline-none focus:border-gold transition-all min-h-[120px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-petroleum ">
                  Convite para Visitante
                </label>
                <textarea
                  {...register('message_templates.guest_share')}
                  className="w-full bg-white border border-petroleum/20 rounded-luxury p-4 text-[13px] text-petroleum outline-none focus:border-gold transition-all min-h-[120px] resize-none"
                />
              </div>
            </div>
          </FormSection>
        </div>
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