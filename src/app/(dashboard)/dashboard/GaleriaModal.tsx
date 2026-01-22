'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Camera, Plus, ArrowLeft, Save, CheckCircle2, Sparkles, Link2, Check, MessageCircle } from 'lucide-react';
import { createGaleria, updateGaleria } from '@/core/services/galeria.service';
import { SubmitButton } from '@/components/ui';
import SecondaryButton from '@/components/ui/SecondaryButton';
import GaleriaFormContent from './GaleriaFormContent';
import BaseModal from '@/components/ui/BaseModal';
import { getPublicGalleryUrl, copyToClipboard, getLuxuryMessageData } from '@/core/utils/url-helper';
import { executeShare } from '@/core/utils/share-helper';
import { useNavigation } from '@/components/providers/NavigationProvider';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export default function GaleriaModal({
  galeria = null,
  isOpen,
  onClose,
  onSuccess,
  onTokenExpired,
}) {
  const isEdit = !!galeria;
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedGaleria, setSavedGaleria] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // 🎯 ESTADOS DE CUSTOMIZAÇÃO COM VALORES PADRÃO TIPO "EDITORIAL"
  const [isPublic, setIsPublic] = useState(true);
  const [showCoverInGrid, setShowCoverInGrid] = useState(true);
  const [gridBgColor, setGridBgColor] = useState('#F3E5AB');
  const [columns, setColumns] = useState({ mobile: 2, tablet: 3, desktop: 4 });

  // 🔄 EFEITO DE INICIALIZAÇÃO E RESET
  useEffect(() => {
    if (isOpen) {
      // 🎯 UX: Trava scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden';
      
      if (galeria) {
        // MODO EDIÇÃO
        setIsPublic(galeria.is_public === true || galeria.is_public === 'true');
        setShowCoverInGrid(
          galeria.show_cover_in_grid === true ||
            galeria.show_cover_in_grid === 'true',
        );
        setGridBgColor(galeria.grid_bg_color || '#F3E5AB');
        setColumns({
          mobile: Number(galeria.columns_mobile) || 2,
          tablet: Number(galeria.columns_tablet) || 3,
          desktop: Number(galeria.columns_desktop) || 4,
        });
      } else {
        // MODO CRIAÇÃO
        setIsPublic(true);
        setShowCoverInGrid(false);
        setGridBgColor('#FFFFFF');
        setColumns({ mobile: 2, tablet: 3, desktop: 4 });
      }

      // 🎯 UX: Auto-focus no primeiro campo após renderização
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector('input[type="text"], input[type="date"], select') as HTMLInputElement;
        firstInput?.focus();
      }, 100);
    } else {
      // 🎯 UX: Restaura scroll quando modal fecha
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [galeria, isOpen]);

  // 🎯 UX: Fechar com tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  // 🎯 UX: Focus trap - mantém foco dentro do modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 1. Captura inicial do formulário
    const formData = new FormData(e.currentTarget);

    // 2. Extração de variáveis cruciais (vêm do FormData via inputs hiddens no filho)
    const driveId = formData.get('drive_folder_id') as string;
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const selectedCategory = formData.get('category') as string;
    const hasClient = formData.get('has_contracting_client') === 'true';
    const clientName = formData.get('client_name') as string;
    const password = formData.get('password') as string;
    const isPublicValue = formData.get('is_public') === 'true';

    // Captura de Leads
    const leadsEnabled = formData.get('leads_enabled') === 'true';
    const leadsRequireName = formData.get('leads_require_name') === 'true';
    const leadsRequireEmail = formData.get('leads_require_email') === 'true';
    const leadsRequireWhatsapp = formData.get('leads_require_whatsapp') === 'true';

    // --- 3. VALIDAÇÃO EDITORIAL ---
    if (!title?.trim()) {
      onSuccess(false, 'O título é obrigatório.');
      return;
    }
    if (!date) {
      onSuccess(false, 'A data é obrigatória.');
      return;
    }
    if (!selectedCategory || selectedCategory === 'undefined') {
      onSuccess(false, 'Selecione uma categoria.');
      return;
    }
    if (!driveId || driveId === '' || driveId === 'null') {
      onSuccess(false, 'Selecione uma pasta do Drive.');
      return;
    }
    if (hasClient && !clientName?.trim()) {
      onSuccess(false, 'Nome do cliente é obrigatório.');
      return;
    }

    // Validação de Leads: Se habilitado, pelo menos um campo deve ser obrigatório
    if (leadsEnabled && !leadsRequireName && !leadsRequireEmail && !leadsRequireWhatsapp) {
      onSuccess(false, 'Se a captura de leads estiver habilitada, pelo menos um campo deve ser obrigatório.');
      return;
    }

    // Validação inteligente:
    // Se for PRIVADO e NÃO for EDIÇÃO -> Senha obrigatória.
    // Se for PRIVADO e for EDIÇÃO -> Senha só obrigatória se o banco não tiver uma senha anterior.
    if (!isPublicValue) {
      const hasExistingPassword = isEdit && galeria?.password;
      if (!hasExistingPassword && !password) {
        onSuccess(false, 'Defina uma senha para a galeria privada.');
        return;
      }

      // Se o campo estiver vazio ou tiver menos de 4 dígitos, barra o envio
      if (!password || password.length < 4 || password.length > 8) {
        onSuccess(false, 'A senha privada deve ter entre 4 e 8 números.');
        return;
      }
    }
    // --- 4. CONSOLIDAÇÃO FINAL DOS DADOS ---
    setLoading(true);

    // Garante que campos de estado do Pai que o Filho refletiu em hidden sejam lidos
    // Aqui fazemos um "Double Check" injetando os estados atuais do pai no FormData
    formData.set('is_public', String(isPublicValue));
    formData.set('show_cover_in_grid', String(showCoverInGrid));
    formData.set('grid_bg_color', gridBgColor);
    formData.set('columns_mobile', String(columns.mobile));
    formData.set('columns_tablet', String(columns.tablet));
    formData.set('columns_desktop', String(columns.desktop));

    // Limpeza de WhatsApp
    const whatsappRaw = formData.get('client_whatsapp') as string;
    if (whatsappRaw)
      formData.set('client_whatsapp', whatsappRaw.replace(/\D/g, ''));

    // Padronização Cobertura
    if (!hasClient) {
      formData.set('client_name', 'Cobertura');
      formData.set('client_whatsapp', '');
    }

    try {
      const result = isEdit
        ? await updateGaleria(galeria.id, formData)
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
        onSuccess(false, result.error || 'Falha ao salvar.');
      }
    } catch (error) {
      console.error('Erro no handleSubmit:', error);
      onSuccess(false, 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const photographer = galeria?.photographer || savedGaleria?.photographer;
    const url = getPublicGalleryUrl(photographer, savedGaleria?.slug || galeria?.slug || '');
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    const photographer = galeria?.photographer || savedGaleria?.photographer;
    const url = getPublicGalleryUrl(photographer, savedGaleria?.slug || galeria?.slug || '');
    const message = getLuxuryMessageData(savedGaleria || galeria, url);
    executeShare({
      title: (savedGaleria || galeria).title,
      text: message,
      phone: (savedGaleria || galeria).client_whatsapp,
    });
  };

  // Get title from form for header display
  const [formTitle, setFormTitle] = useState(galeria?.title || '');

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        // 🎯 UX: Fechar ao clicar no backdrop (fora do modal)
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full h-full bg-white flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* STICKY HEADER - Azul Petróleo Profundo */}
        <div className="sticky top-0 z-50 bg-petroleum border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Botão Voltar - Esquerda */}
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Voltar"
              title="Voltar (ESC)"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Título Centralizado */}
            <h2 
              id="modal-title"
              className="flex-1 text-center text-sm font-semibold text-white uppercase tracking-widest mx-4"
            >
              {formTitle || (isEdit ? 'Editar Galeria' : 'Nova Galeria')}
            </h2>

            {/* Botão SALVAR ALTERAÇÕES - Direita */}
            <div className="w-[200px] flex justify-end shrink-0">
              <SubmitButton
                form="master-gallery-form"
                success={isSuccess}
                disabled={loading}
                icon={<Save size={14} />}
                className="w-full"
                label={
                  loading ? 'Salvando...' : isEdit ? 'SALVAR ALTERAÇÕES' : 'CRIAR GALERIA'
                }
              />
            </div>
          </div>
        </div>

        {/* FORM CONTENT - Layout Duas Colunas (65/35) */}
        <div className="flex-1 overflow-hidden">
          <div className="w-full max-w-7xl mx-auto h-full">
            <form id="master-gallery-form" onSubmit={handleSubmit} className="h-full" onChange={() => setHasUnsavedChanges(true)}>
              <GaleriaFormContent
                initialData={galeria}
                isEdit={isEdit}
                customization={{ showCoverInGrid, gridBgColor, columns }}
                setCustomization={{
                  setShowCoverInGrid,
                  setGridBgColor,
                  setColumns,
                }}
                onPickerError={(msg: string) => onSuccess(false, msg)}
                onTokenExpired={onTokenExpired}
                onTitleChange={setFormTitle}
              />
            </form>
          </div>
        </div>

        {/* STICKY FOOTER - Azul Petróleo Profundo */}
        <div className="sticky bottom-0 z-50 bg-petroleum border-t border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Status de Salvamento - Esquerda */}
            <div className="text-[10px] text-white/70 uppercase tracking-widest">
              {hasUnsavedChanges ? 'Alterações não salvas' : 'Tudo salvo'}
            </div>

            {/* Botões - Direita */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary-petroleum"
              >
                CANCELAR
              </button>
              <SubmitButton
                form="master-gallery-form"
                success={isSuccess}
                disabled={loading}
                icon={<Save size={14} />}
                className="px-6"
                label={
                  loading ? 'Salvando...' : isEdit ? 'SALVAR ALTERAÇÕES' : 'CRIAR GALERIA'
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 MODAL DE SUCESSO PADRONIZADO (EDITORIAL) */}
      <BaseModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          onSuccess(true, savedGaleria);
          onClose();
        }}
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
                  setShowSuccessModal(false);
                  onSuccess(true, savedGaleria);
                  onClose();
                }}
                className="btn-secondary-white w-full"
              >
                <ArrowLeft size={14} /> Espaço de Galerias
              </button>

              <a
                href={getPublicGalleryUrl(galeria?.photographer || savedGaleria?.photographer, savedGaleria?.slug || galeria?.slug || '')}
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
                    <Link2 size={16} />
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
