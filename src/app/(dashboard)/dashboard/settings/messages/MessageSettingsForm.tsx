'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Settings,
  RotateCcw,
  Tag,
  Layout,
  AlertCircle,
} from 'lucide-react';

import { MessageTemplates, MessageTemplatesSchema } from '@/core/types/profile';
import { updateProfileSettings } from '@/core/services/profile.service';
import { Toast } from '@/components/ui';
import FormPageBase from '@/components/ui/FormPageBase';
import BaseModal from '@/components/ui/BaseModal';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { div } from 'framer-motion/client';

// --- SCHEMAS E TIPOS ---
type EditableMessageKey = keyof Omit<MessageTemplates, 'CARD_SHARE'>;
type EditableMessagePath = `message_templates.${EditableMessageKey}`;

const CombinedSchema = z.object({
  message_templates: MessageTemplatesSchema,
});

type CombinedData = z.infer<typeof CombinedSchema>;

// --- CONFIGURAÇÕES DE TEXTOS E VARIÁVEIS ---
const MESSAGE_TITLES: Record<string, string> = {
  card_share: 'Espaço de Galerias',
  photo_share: 'Foto Individual',
  guest_share: 'Galeria de Fotos',
};

const MESSAGE_LABELS: Record<string, string> = {
  card_share: 'Mensagem de compartilhamento de galeria no Espaço de Galerias',
  photo_share: 'Mensagem de compartilhamento de foto única pelo visitante',
  guest_share: 'Mensagem de compartilhamento da galeria pelo visitante',
};

const DEFAULT_MESSAGES: Record<string, string> = {
  card_share: GALLERY_MESSAGES.CARD_SHARE('{galeria_titulo}', '{galeria_link}'),
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

const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  profissional_nome: 'Nome completo do profissional responsável.',
  profissional_fone: 'Telefone de contato do profissional.',
  profissional_instagram: 'Link para o perfil do Instagram do profissional.',
  profissional_link_perfil:
    'Link para o perfil público do profissional no Sua Galeria.',
  profissional_email: 'e-Mail de contato do profissional.',
  galeria_titulo: 'Título da galeria.',
  galeria_nome_cliente: 'Nome do cliente da galeria, se existir.',
  galeria_data: 'Data de registro da galeria.',
  galeria_local: 'Local onde a galeria foi realizada.',
  galeria_categoria: 'Categoria da galeria (ex: Casamento, Ensaio).',
  galeria_senha: 'Senha de acesso, se a galeria for privada.',
  galeria_link: 'Link público para acessar a galeria.',
};

const ALL_VALID_TAGS = [
  ...VARIAVEIS_MENSAGEM.galeria,
  ...VARIAVEIS_MENSAGEM.profissional,
  'url',
];
// --- COMPONENTES AUXILIARES ---

const WhatsAppPreview = React.memo(({ text }: { text: string }) => {
  // Função para destacar tags visualmente no preview
  const formatPreviewText = (rawText: string) => {
    const parts = rawText.split(/(\{.*?\})/g);
    return parts.map((part, i) =>
      part.startsWith('{') && part.endsWith('}') ? (
        <span key={i} className="text-emerald-600 font-semibold">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="bg-[#e5ddd5] rounded-xl p-4 md:p-6 overflow-hidden relative min-h-[250px] border border-petroleum/10 shadow-inner font-sans">
      <div className="absolute top-0 left-0 w-full bg-[#075e54] py-2 px-4 flex items-center gap-2 z-10">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
          <MessageSquare size={12} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-white text-[9px] font-semibold leading-none">
            Sua Galeria
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
});

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
      <h3 className="text-[11px] font-semibold uppercase tracking-luxury text-petroleum">
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

  type MessageKey = 'card_share' | 'photo_share' | 'guest_share';

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editingMessageKey, setEditingMessageKey] = useState<string | null>(
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
        router.refresh(); // Revalida o cache
        setTimeout(() => setIsSuccess(false), 3000);
      }
    } catch {
      setToast({ message: 'Erro ao salvar.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // 🎯 insertVariable com useCallback para evitar loops
  const insertVariable = useCallback(
    (variable: string) => {
      if (!editingMessageKey || !textareaRef.current) return;

      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentPath = `message_templates.${editingMessageKey}` as any;

      // 🎯 Captura o texto atual ou o padrão caso o usuário ainda não tenha digitado nada
      const currentText =
        watch(currentPath) || DEFAULT_MESSAGES[editingMessageKey] || '';

      const newValue = `${currentText.substring(0, start)}{${variable}}${currentText.substring(end)}`;

      setValue(currentPath, newValue, { shouldDirty: true });

      setTimeout(() => {
        textarea.focus();
        const pos = start + variable.length + 2;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    },
    [editingMessageKey, setValue, watch],
  );

  const validateTags = (text: string): boolean => {
    const allValidTags = [
      ...VARIAVEIS_MENSAGEM.galeria,
      ...VARIAVEIS_MENSAGEM.profissional,
      'url',
    ];
    // Regex para encontrar tudo que está entre chaves
    const foundTags = text.match(/\{([^}]+)\}/g);

    if (!foundTags) return true;

    return foundTags.every((tag) => {
      const tagName = tag.replace(/\{|\}/g, '');
      return allValidTags.includes(tagName);
    });
  };

  const currentText =
    watch(`message_templates.${editingMessageKey as any}`) || '';

  const invalidTags = useMemo(() => {
    const matches = currentText.match(/\{([^}]+)\}/g);
    if (!matches) return [];

    return matches
      .map((tag) => tag.replace(/\{|\}/g, ''))
      .filter((tagName) => !ALL_VALID_TAGS.includes(tagName));
  }, [currentText]);

  const hasError = invalidTags.length > 0;

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
      <div className="max-w-full mx-auto ">
        <FormSection
          title="Mensagens de compartilhamento no WhatsApp e em redes sociais"
          icon={<MessageSquare size={16} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(MESSAGE_LABELS).map((key) => {
              const val = watch(
                `message_templates.${key as keyof CombinedData['message_templates']}`,
              );
              const isDefault = !val || val.trim() === '';
              const displayContent = isDefault ? DEFAULT_MESSAGES[key] : val;

              return (
                <div
                  key={key}
                  className="flex flex-col bg-white rounded-luxury overflow-hidden shadow-xl border border-petroleum/10
                   hover:border-gold/30 transition-all min-h-[350px]"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Restaurar para o padrão?')) {
                          setValue(
                            `message_templates.${key as keyof CombinedData['message_templates']}`,
                            '',
                            { shouldDirty: true },
                          );
                        }
                      }}
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
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start py-2">
              <div className="space-y-6">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <label>
                      Editor de Texto
                    </label>
                    {hasError && (
                      <span className="text-[9px] font-semibold text-red-500 uppercase animate-pulse">
                        Tag inválida detectada
                      </span>
                    )}
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={
                      currentText ||
                      DEFAULT_MESSAGES[editingMessageKey as any] ||
                      ''
                    }
                    onChange={(e) =>
                      setValue(
                        `message_templates.${editingMessageKey as any}`,
                        e.target.value,
                        { shouldDirty: true },
                      )
                    }
                    className={`input-luxury h-64 p-5 resize-none ${
                      hasError
                        ? 'bg-red-50 border-red-200 text-red-900 focus:ring-red-100'
                        : 'bg-slate-50 border-petroleum/10 text-petroleum'
                    }`}
                    placeholder="Escreva sua mensagem aqui..."
                  />

                  {hasError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                      <AlertCircle size={14} />
                      <p className="text-[10px] font-medium">
                        As seguintes tags não funcionam:{' '}
                        <span className="font-semibold">
                          {invalidTags.map((t) => `{${t}}`).join(', ')}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-petroleum/5 p-5 rounded-luxury border border-petroleum/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag size={12} className="text-gold" />
                    <span className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                      Variáveis de Inserção
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {VARIAVEIS_MENSAGEM.galeria.map((v) => (
                      <button
                    type="button"
                    onClick={() => insertVariable(v)}
                    title={VARIABLE_DESCRIPTIONS[v]}
                    className="btn-luxury-base bg-white"
                  >
                        • {v.replace('galeria_', '').replace('_', ' ')}
                      </button>
                    ))}
                    {VARIAVEIS_MENSAGEM.profissional.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        title={VARIABLE_DESCRIPTIONS[v]}
                        className="btn-luxury-base bg-petroleum/10"
                      >
                        👤 {v.replace('profissional_', '').replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-6 border-t border-petroleum/10">
                  <button
                    type="button"
                    onClick={() => {
                      const currentText = watch(
                        `message_templates.${editingMessageKey as any}`,
                      );
                      if (currentText && !validateTags(currentText)) {
                        setToast({
                          message:
                            'Atenção: Você utilizou uma tag inválida. Verifique os nomes entre chaves.',
                          type: 'error',
                        });
                        return;
                      }
                      setEditingMessageKey(null);
                    }}
                    className="btn-luxury-primary w-60"
                  >
                    Confirmar Edição
                  </button>
                </div>
              </div>

              <div className="lg:sticky lg:top-0 space-y-4">
                <label>
                  Visualização
                </label>
                <WhatsAppPreview
                  text={
                    watch(`message_templates.${editingMessageKey as any}`) ||
                    DEFAULT_MESSAGES[editingMessageKey]
                  }
                />
              </div>
            </div>
          </BaseModal>
        )}
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
