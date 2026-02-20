'use client';

import { MessageTemplates, MessageTemplatesSchema } from '@/core/types/profile';
import { z } from 'zod';
import React, { useRef, useState, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  MessageSquare,
  RotateCcw,
  Save,
  Settings,
  Tag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSegment } from '@/hooks/useSegment';
import { updateProfileSettings } from '@/core/services/profile.service';
import { ConfirmationModal, Toast } from '@/components/ui';
import FormPageBase from '@/components/ui/FormPageBase';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import BaseModal from '@/components/ui/BaseModal';

const CombinedSchema = z.object({
  message_templates: MessageTemplatesSchema,
});

type CombinedData = z.infer<typeof CombinedSchema>;
type MessageKey = keyof CombinedData['message_templates'];

// --- COMPONENTES AUXILIARES ---

const WhatsAppPreview = React.memo(
  ({ text, siteName }: { text: string; siteName: string }) => {
    return (
      <div className="bg-[#e5ddd5] rounded-xl p-4 md:p-6 overflow-hidden relative min-h-[250px] border border-petroleum/10 shadow-inner font-sans">
        <div className="absolute top-0 left-0 w-full bg-[#075e54] py-2 px-4 flex items-center gap-2 z-10">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <MessageSquare size={12} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-[9px] font-semibold leading-none">
              {siteName}
            </span>
            <span className="text-white/60 text-[7px]">Online</span>
          </div>
        </div>
        <div className="mt-10 flex justify-start animate-in fade-in slide-in-from-left-2">
          <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[95%] relative">
            <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent" />
            <p className="text-[12px] text-slate-800 whitespace-pre-line leading-relaxed italic">
              {text || 'Digite sua mensagem...'}
            </p>
            <div className="flex justify-end mt-1">
              <span className="text-[8px] text-slate-400">
                {new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const FormSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-luxury border border-petroleum/10 p-6 ">
    <div className="flex items-center gap-3 border-b border-petroleum/10 pb-4">
      {icon && <div className="text-petroleum">{icon}</div>}
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-petroleum">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

// --- COMPONENTE PRINCIPAL ---

export default function MessageSettingsForm({ profile }: { profile: any }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { terms } = useSegment();
  const [showResetModal, setShowResetModal] = useState<MessageKey | null>(null);

  const MESSAGE_TITLES: Record<MessageKey, string> = {
    card_share: 'Espaço de Galerias',
    photo_share: `${terms.item.charAt(0).toUpperCase() + terms.item.slice(1)} Individual`,
    guest_share: `Galeria de ${terms.item.charAt(0).toUpperCase() + terms.item.slice(1)}`,
  };

  const MESSAGE_LABELS: Record<MessageKey, string> = {
    card_share: `Mensagem de compartilhamento de galeria no Espaço de Galerias`,
    photo_share: `Mensagem de compartilhamento de ${terms.item} única pelo visitante`,
    guest_share: `Mensagem de compartilhamento da galeria pelo visitante`,
  };

  const DEFAULT_MESSAGES: Record<MessageKey, string> = {
    card_share: GALLERY_MESSAGES.CARD_SHARE(
      '{galeria_titulo}',
      '{galeria_link}',
    ),
    photo_share: GALLERY_MESSAGES.PHOTO_SHARE(
      '{galeria_titulo}',
      '{galeria_link}',
    ),
    guest_share: GALLERY_MESSAGES.GUEST_SHARE(
      '{galeria_titulo}',
      '{galeria_link}',
    ),
  };

  const VARIAVEIS_MENSAGEM = {
    profissional: [
      'profissional_nome',
      'profissional_fone',
      'profissional_instagram',
      'profissional_link_perfil',
      'profissional_email',
    ],
    galeria: [
      'galeria_titulo',
      'galeria_nome_cliente',
      'galeria_data',
      'galeria_local',
      'galeria_categoria',
      'galeria_senha',
      'galeria_link',
    ],
  };

  const ALL_VALID_TAGS = useMemo(
    () =>
      new Set([
        ...VARIAVEIS_MENSAGEM.galeria,
        ...VARIAVEIS_MENSAGEM.profissional,
        'url',
      ]),
    [],
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editingMessageKey, setEditingMessageKey] = useState<MessageKey | null>(
    null,
  );
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const defaultValues: CombinedData = useMemo(
    () => ({
      message_templates: {
        card_share: profile.message_templates?.card_share ?? '',
        photo_share: profile.message_templates?.photo_share ?? '',
        guest_share: profile.message_templates?.guest_share ?? '',
      },
    }),
    [profile],
  );

  const {
    handleSubmit,
    watch,
    setValue,
    getValues,
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
        setToast({ message: 'Mensagens salvas com sucesso!', type: 'success' });
        router.refresh();
        setTimeout(() => setIsSuccess(false), 3000);
      }
    } catch {
      setToast({ message: 'Erro ao salvar.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = useCallback(
    (variable: string) => {
      const textarea = textareaRef.current;
      if (!editingMessageKey || !textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentPath = `message_templates.${editingMessageKey}` as const;
      const currentValue =
        getValues(currentPath) || DEFAULT_MESSAGES[editingMessageKey] || '';

      const tag = `{${variable}}`;
      const newValue =
        currentValue.substring(0, start) + tag + currentValue.substring(end);

      setValue(currentPath, newValue, {
        shouldDirty: true,
        shouldValidate: true,
      });

      setTimeout(() => {
        textarea.focus();
        const pos = start + tag.length;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    },
    [editingMessageKey, setValue, getValues],
  );

  const validateTags = useCallback(
    (text: string): boolean => {
      const matches = text.matchAll(/\{([^}]+)\}/g);
      for (const match of matches) {
        if (!ALL_VALID_TAGS.has(match[1])) return false;
      }
      return true;
    },
    [ALL_VALID_TAGS],
  );

  const currentText =
    watch(`message_templates.${editingMessageKey as MessageKey}`) || '';

  const invalidTags = useMemo(() => {
    const matches = Array.from(currentText.matchAll(/\{([^}]+)\}/g));
    return matches.map((m) => m[1]).filter((tag) => !ALL_VALID_TAGS.has(tag));
  }, [currentText, ALL_VALID_TAGS]);

  const hasError = invalidTags.length > 0;

  return (
    <PlanGuard feature="canCustomWhatsApp" label="Edição de Mensagens">
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
        <div className="max-w-full mx-auto ">
          <FormSection
            title="Mensagens de compartilhamento"
            icon={<MessageSquare size={16} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(MESSAGE_LABELS) as MessageKey[]).map((key) => {
                const val = watch(`message_templates.${key}`);
                const isDefault = !val || val.trim() === '';
                const displayContent = isDefault ? DEFAULT_MESSAGES[key] : val;

                return (
                  <div
                    key={key}
                    className="flex flex-col bg-white rounded-luxury overflow-hidden shadow-xl border border-petroleum/10 hover:border-gold/30 transition-all min-h-[350px]"
                  >
                    <div className="bg-petroleum px-5 h-11 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <MessageSquare size={16} className="text-gold" />
                        <h3 className="text-[11px] font-semibold uppercase tracking-luxury-widest text-white">
                          {MESSAGE_TITLES[key]}
                        </h3>
                      </div>
                      <span
                        className={`text-[8px] px-2 rounded-full font-semibold ${isDefault ? 'bg-gold text-petroleum' : 'bg-white/20 text-white border border-white/10'}`}
                      >
                        {isDefault ? 'PADRÃO' : 'CUSTOM'}
                      </span>
                    </div>
                    <div className="px-6 py-3 flex-grow">
                      <p className="text-[12px] text-petroleum/80 font-semibold italic mb-3">
                        {MESSAGE_LABELS[key]}
                      </p>
                      <p className="text-[12px] text-petroleum italic whitespace-pre-line leading-relaxed">
                        "{displayContent}"
                      </p>
                    </div>
                    <div className="bg-petroleum/95 px-4 h-14 grid grid-cols-2 gap-3 items-center border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowResetModal(key)}
                        className="flex items-center justify-center gap-2 h-9 bg-white/5 text-white rounded-luxury text-[11px] font-semibold hover:bg-red-500/20 transition-all border border-white/10"
                      >
                        <RotateCcw size={12} /> Resetar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMessageKey(key)}
                        className="flex items-center justify-center gap-2 h-9 bg-champagne text-petroleum rounded-luxury text-[11px] font-semibold hover:bg-gold transition-all shadow-lg"
                      >
                        <Settings size={13} /> Configurar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>

          {editingMessageKey && (
            <BaseModal
              isOpen={!!editingMessageKey}
              onClose={() => setEditingMessageKey(null)}
              title={`Configurar: ${MESSAGE_TITLES[editingMessageKey]}`}
              maxWidth="4xl"
              footer={
                <div className="flex justify-end items-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMessageKey(null)}
                    className="btn-secondary-petroleum"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => !hasError && setEditingMessageKey(null)}
                    className="btn-luxury-primary"
                    disabled={hasError}
                  >
                    <Save size={14} />
                    Confirmar Alterações
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start py-2">
                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-petroleum/50">
                        Editor de Texto
                      </label>
                      {hasError && (
                        <span className="text-[9px] font-semibold text-red-500 uppercase animate-pulse">
                          Tag inválida
                        </span>
                      )}
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={
                        currentText || DEFAULT_MESSAGES[editingMessageKey] || ''
                      }
                      onChange={(e) =>
                        setValue(
                          `message_templates.${editingMessageKey}`,
                          e.target.value,
                          { shouldDirty: true },
                        )
                      }
                      className={`input-luxury h-64 p-5 resize-none transition-colors ${hasError ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 text-petroleum'}`}
                      placeholder="Escreva sua mensagem aqui..."
                    />
                    {hasError && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                        <AlertCircle size={14} />
                        <p className="text-[10px]">
                          Tags inválidas:{' '}
                          <span className="font-semibold">
                            {invalidTags.join(', ')}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="bg-petroleum/5 p-5 rounded-luxury border border-petroleum/5">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag size={12} className="text-gold" />
                      <span className="text-[10px] font-semibold uppercase text-petroleum">
                        Variáveis
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...VARIAVEIS_MENSAGEM.galeria,
                        ...VARIAVEIS_MENSAGEM.profissional,
                      ].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          className="btn-luxury-base bg-white text-[10px] hover:border-gold/50"
                        >
                          {v.includes('profissional') ? '👤' : '•'}{' '}
                          {v.split('_').slice(1).join(' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="lg:sticky lg:top-0 space-y-4">
                  <label className="text-[11px] font-bold uppercase text-petroleum/50">
                    Visualização
                  </label>
                  <WhatsAppPreview
                    text={currentText || DEFAULT_MESSAGES[editingMessageKey]}
                    siteName={terms.site_name}
                  />
                </div>
              </div>
            </BaseModal>
          )}
        </div>

        <ConfirmationModal
          isOpen={!!showResetModal}
          onClose={() => setShowResetModal(null)}
          title="Restaurar Padrão"
          message={`Deseja realmente restaurar a mensagem para o padrão original?`}
          confirmText="Sim, Restaurar"
          variant="danger"
          onConfirm={() => {
            if (showResetModal) {
              setValue(`message_templates.${showResetModal}`, '', {
                shouldDirty: true,
              });
              setShowResetModal(null);
            }
          }}
        />
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </FormPageBase>
    </PlanGuard>
  );
}
