'use client';
import { useState, useEffect, useRef, ReactNode } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import { SubmitButton } from '@/components/ui';

interface FormPageBaseProps {
  title: string;
  isEdit?: boolean;
  loading?: boolean;
  isSuccess?: boolean;
  hasUnsavedChanges?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onFormChange?: () => void;
  children: ReactNode;
  footerStatusText?: string;
  submitLabel?: string;
  id?: string;
}

export default function FormPageBase({
  title,
  isEdit = false,
  loading = false,
  isSuccess = false,
  hasUnsavedChanges = false,
  onClose,
  onSubmit,
  onFormChange,
  children,
  footerStatusText,
  submitLabel,
  id = 'master-form',
}: FormPageBaseProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // 🎯 UX: Trava scroll do body quando modal está aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // 🎯 UX: Auto-focus no primeiro campo após renderização
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector(
        'input[type="text"], input[type="date"], select, textarea'
      ) as HTMLInputElement;
      firstInput?.focus();
    }, 100);

    return () => {
      document.body.style.overflow = 'unset';
      clearTimeout(timer);
    };
  }, []);

  // 🎯 UX: Fechar com tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [loading, onClose]);

  // 🎯 UX: Focus trap - mantém foco dentro do modal
  useEffect(() => {
    if (!modalRef.current) return;

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
  }, []);

  const defaultSubmitLabel = loading 
    ? 'Salvando...' 
    : isEdit ? 'SALVAR ALTERAÇÕES' : 'CRIAR';

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-page-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full h-full bg-white flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-50 bg-petroleum border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Voltar"
              title="Voltar (ESC)"
            >
              <ArrowLeft size={20} />
            </button>

            <h2 
              id="form-page-title"
              className="flex-1 text-center text-sm font-semibold text-white uppercase tracking-widest mx-4 truncate"
            >
              {title}
            </h2>

            <div className="w-[200px] flex justify-end shrink-0">
              <SubmitButton
                form={id}
                success={isSuccess}
                disabled={loading}
                icon={<Save size={14} />}
                className="w-full"
                label={submitLabel || defaultSubmitLabel}
              />
            </div>
          </div>
        </div>

        {/* FORM CONTENT */}
        <div className="flex-1 overflow-hidden">
          <div className="w-full max-w-7xl mx-auto h-full">
            <form 
              id={id} 
              onSubmit={onSubmit} 
              className="h-full" 
              onChange={onFormChange}
            >
              {children}
            </form>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 z-50 bg-petroleum border-t border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="text-[10px] text-white/70 uppercase tracking-widest">
              {footerStatusText || (hasUnsavedChanges ? 'Alterações não salvas' : 'Tudo salvo')}
            </div>

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
                form={id}
                success={isSuccess}
                disabled={loading}
                icon={<Save size={14} />}
                className="px-6"
                label={submitLabel || defaultSubmitLabel}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
