'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Camera, Plus } from 'lucide-react';
import { createGaleria, updateGaleria } from '@/core/services/galeria.service';
import { SubmitButton } from '@/components/ui';
import SecondaryButton from '@/components/ui/SecondaryButton';
import GaleriaFormContent from './GaleriaFormContent';

export default function GaleriaModal({
  galeria = null,
  isOpen,
  onClose,
  onSuccess,
  onTokenExpired,
}) {
  const isEdit = !!galeria;
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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
        setTimeout(() => {
          onSuccess(true, { ...galeria, ...Object.fromEntries(formData) });
          onClose();
          setIsSuccess(false);
        }, 1200);
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

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300"
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
        className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-[0.5rem] shadow-2xl flex flex-col border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between py-2 px-8 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-champagne/40 rounded-xl text-gold border border-gold/10">
              {isEdit ? (
                <Camera size={18} strokeWidth={2} />
              ) : (
                <Plus size={18} strokeWidth={2} />
              )}
            </div>
            <h2 
              id="modal-title"
              className="text-xs font-semibold text-slate-900 uppercase tracking-widest"
            >
              {isEdit ? 'Editar Galeria' : 'Nova Galeria'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Fechar modal"
            title="Fechar (ESC)"
          >
            <X size={20} />
          </button>
        </div>
        {/* FORM CONTENT */}
        <div className="flex-1 px-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
          <form id="master-gallery-form" onSubmit={handleSubmit}>
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
            />
          </form>
        </div>
        {/* FOOTER MODAL */}
        <div className="p-2 bg-white/90 backdrop-blur-sm border-t flex flex-row justify-center items-center gap-2 md:gap-3 px-4 sticky bottom-0 z-50">
          <div className="w-[40%] md:w-auto">
            <SecondaryButton
              label="Cancelar"
              onClick={onClose}
              disabled={loading}
              className="w-full md:px-10"
            />
          </div>

          <div className="w-[60%] md:w-[240px]">
            <SubmitButton
              form="master-gallery-form"
              success={isSuccess}
              disabled={loading}
              className="w-full"
              label={
                loading ? 'Salvando...' : isEdit ? 'SALVAR ALTERAÇÕES' : 'CRIAR GALERIA'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
