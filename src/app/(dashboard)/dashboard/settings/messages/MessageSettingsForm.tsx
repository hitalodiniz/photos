'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageTemplatesSchema } from '@/core/types/profile';
import { updateProfileSettings } from '@/core/services/profile.service';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Save, ChevronRight } from 'lucide-react';
import { Toast } from '@/components/ui';
import FormPageBase from '@/components/ui/FormPageBase';
import BaseModal from '@/components/ui/BaseModal';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { MessageParamEditor } from '@/components/ui/MessageParamEditor';

const CombinedSchema = z.object({
  message_templates: MessageTemplatesSchema,
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
  <div className="bg-white rounded-luxury border border-petroleum/10 p-6 md:p-8 space-y-6 shadow-sm">
    <div className="flex items-center gap-3 border-b border-petroleum/10 pb-4">
      {icon && <div className="text-gold">{icon}</div>}
      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-petroleum">
        {title}
      </h3>
    </div>
    <div className="pt-2">{children}</div>
  </div>
);

const MESSAGE_TITLES: Record<string, string> = {
  card_share: 'Espaço de Galerias',
  photo_share: 'Foto Individual',
  guest_share: 'Galeria de Fotos',
};

const MESSAGE_LABELS: Record<string, string> = {
  card_share: 'Mensagem de compartilhamento de galeria no Espaço de Galerias',
  photo_share:
    'Mensagem de compartilhamento de foto única pelo visitante da galeria',
  guest_share: 'Mensagem de compartilhamento da galeria pelo visitante',
};

const DEFAULT_MESSAGES: Record<string, string> = {
  card_share: GALLERY_MESSAGES.CARD_SHARE(
    '{galeria_nome_cliente}',
    '{galeria_titulo}',
    '{galeria_data}',
    '{url}',
  ),
  photo_share: GALLERY_MESSAGES.PHOTO_SHARE('{galeria_titulo}', '{url}'),
  guest_share: GALLERY_MESSAGES.GUEST_SHARE('{galeria_titulo}', '{url}'),
};

const VARIAVEIS_MENSAGEM = {
  usuario: [
    'usuario_nome',
    'usuario_fone',
    'usuario_instagram',
    'usuario_link_perfil',
    'usuario_email',
  ],
  galeria: [
    'galeria_titulo',
    'galeria_nome_cliente',
    'galeria_data',
    'galeria_local',
    'galeria_categoria',
    'galeria_senha',
  ],
};

export default function MessageSettingsForm({ profile }: { profile: any }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [editingMessageKey, setEditingMessageKey] = useState<string | null>(
    null,
  );

  const defaultValues: CombinedData = {
    message_templates: {
      CARD_SHARE: profile.message_templates?.CARD_SHARE ?? '',
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
        setToast({
          message: 'Mensagens salvas com sucesso!',
          type: 'success',
        });
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        setToast({
          message: result.error || 'Erro ao salvar mensagens.',
          type: 'error',
        });
      }
    } catch (error) {
      setToast({ message: 'Ocorreu um erro ao salvar.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const getMessagePreview = (key: string) => {
    const customValue = watch(`message_templates.${key}` as any);
    if (customValue && customValue.trim() !== '') {
      return { text: customValue, isDefault: false };
    }
    return { text: DEFAULT_MESSAGES[key], isDefault: true };
  };

  return (
    <FormPageBase
      title="Modelos de Mensagens"
      isEdit={true}
      loading={isSaving}
      isSuccess={isSuccess}
      hasUnsavedChanges={isDirty}
      onClose={() => router.back()}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="SALVAR MENSAGENS"
      id="message-settings-form"
    >
      <div className="flex flex-col lg:flex-row">
        <div className="w-full relative z-10 pb-24">
          <div className="max-w-full mx-auto space-y-8">
            <FormSection
              title="Personalização das Mensagens Automáticas"
              icon={<MessageSquare size={16} />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                {Object.entries(MESSAGE_LABELS).map(([key, label]) => {
                  const preview = getMessagePreview(key);
                  return (
                    <div
                      key={key}
                      onClick={() => setEditingMessageKey(key)}
                      className="flex flex-col bg-white rounded-luxury overflow-hidden shadow-2xl transition-all border border-petroleum/10 hover:border-gold/30 hover:ring-1 hover:ring-gold/20 cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both min-h-[320px]"
                    >
                      {/* HEADER DO CARD: Estilo Privacidade */}
                      <div className="bg-petroleum backdrop-blur-md px-5 h-11 flex items-center gap-4 shrink-0 border-b border-white/10">
                        <div className="text-gold shrink-0 drop-shadow-[0_0_8px_rgba(243,229,171,0.4)]">
                          <MessageSquare size={18} />
                        </div>
                        <h3 className="text-[12px] font-bold uppercase tracking-[0.15em] text-white leading-none flex-1 truncate">
                          {MESSAGE_TITLES[key as keyof typeof MESSAGE_TITLES]}
                        </h3>
                        {preview.isDefault ? (
                          <span className="text-[8px] bg-gold text-black px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest">
                            PADRÃO
                          </span>
                        ) : (
                          <span className="text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest border border-white/10">
                            CUSTOM
                          </span>
                        )}
                      </div>

                      {/* CORPO DO CARD */}
                      <div className="p-7 bg-white flex-grow flex flex-col justify-between h-full">
                        <div>
                          <p className="text-[14px] leading-relaxed text-petroleum/80 font-bold italic mb-3">
                            {label}
                          </p>
                          <p className="text-[13px] leading-relaxed text-petroleum/60 font-medium line-clamp-6 italic whitespace-pre-line">
                            "{preview.text}"
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-end">
                          <div className="flex items-center gap-2 text-petroleum/30 group-hover:text-gold transition-colors">
                            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">
                              Configurar
                            </span>
                            <ChevronRight
                              size={14}
                              className="group-hover:translate-x-0.5 transition-transform"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormSection>

            {toast && (
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
              />
            )}

            {editingMessageKey && (
              <BaseModal
                isOpen={!!editingMessageKey}
                onClose={() => setEditingMessageKey(null)}
                title="Configurar mensagem de compartilhamento"
                maxWidth="3xl"
                subtitle={MESSAGE_LABELS[editingMessageKey]}
              >
                <MessageParamEditor
                  label={MESSAGE_LABELS[editingMessageKey]}
                  value={watch(`message_templates.${editingMessageKey}`) || ''}
                  onChange={(val) =>
                    setValue(`message_templates.${editingMessageKey}`, val, {
                      shouldDirty: true,
                    })
                  }
                  onReset={() =>
                    setValue(`message_templates.${editingMessageKey}`, '', {
                      shouldDirty: true,
                    })
                  }
                  variables={[
                    ...VARIAVEIS_MENSAGEM.galeria,
                    ...VARIAVEIS_MENSAGEM.usuario,
                  ]}
                />

                <div className="mt-8 pt-6 border-t border-petroleum/10">
                  <button
                    type="button"
                    onClick={() => setEditingMessageKey(null)}
                    className="w-full bg-petroleum text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-petroleum/90 transition-all rounded-none"
                  >
                    CONFIRMAR EDIÇÃO
                  </button>
                </div>
              </BaseModal>
            )}
          </div>
        </div>
      </div>
    </FormPageBase>
  );
}
