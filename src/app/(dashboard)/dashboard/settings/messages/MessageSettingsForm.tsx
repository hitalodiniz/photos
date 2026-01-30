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
  <div className="bg-white rounded-luxury border border-petroleum/40 p-4 md:p-6 space-y-4">
    <div className="flex items-center gap-2 pb-3 border-b border-petroleum/40">
      {icon && <div className="text-petroleum">{icon}</div>}
      <h3 className="text-xs font-bold uppercase tracking-widest text-petroleum ">
        {title}
      </h3>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const MESSAGE_LABELS: Record<string, string> = {
  card_share:
    'Compartilhamento de galeria pelo proprietário no Espaço de Galerias',
  photo_share: 'Compartilhamento de foto única pelo visitante da galeria',
  guest_share: 'Compartilhamento da galeria pelo visitante',
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
          <div className="max-w-5xl mx-auto space-y-6">
            <FormSection
              title="Modelos de Mensagens"
              icon={<MessageSquare size={16} />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                {Object.entries(MESSAGE_LABELS).map(([key, label]) => {
                  const preview = getMessagePreview(key);
                  return (
                    <div
                      key={key}
                      onClick={() => setEditingMessageKey(key)}
                      className="group relative flex flex-col overflow-hidden rounded-none border border-petroleum/40 bg-white transition-all w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both hover:border-petroleum/70 cursor-pointer min-h-[180px]"
                    >
                      {/* HEADER DO CARD - Estilo GaleriaCard */}
                      <div className="bg-slate-50 border-b border-petroleum/10 p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={14} className="text-gold" />
                          <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
                            {label}
                          </label>
                        </div>
                        {preview.isDefault && (
                          <span className="text-[8px] font-bold text-gold uppercase tracking-tighter bg-gold/5 px-1.5 py-0.5 border border-gold/10">
                            Padrão
                          </span>
                        )}
                      </div>

                      {/* CONTEÚDO - Preview da Mensagem */}
                      <div className="flex-1 p-4">
                        <p className="text-[11px] italic text-petroleum/60 line-clamp-4 leading-relaxed font-sans">
                          {preview.text}
                        </p>
                      </div>

                      {/* FOOTER DO CARD - Estilo GaleriaCard */}
                      <div className="flex items-center justify-end p-3 bg-slate-50/50 border-t border-petroleum/10">
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-petroleum/20 text-petroleum hover:text-gold hover:border-gold transition-all rounded-none shadow-sm group-hover:border-gold/50"
                        >
                          <span className="text-[9px] font-bold uppercase tracking-widest">
                            Configurar
                          </span>
                          <ChevronRight
                            size={12}
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </button>
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
