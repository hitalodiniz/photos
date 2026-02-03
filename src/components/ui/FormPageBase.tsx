'use client';
import { useEffect, useRef, ReactNode } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { SubmitButton } from '@/components/ui';
import { div } from 'framer-motion/client';

interface FormPageBaseProps {
  title: string;
  isEdit?: boolean;
  loading?: boolean;
  isSuccess?: boolean;
  isShowButtons?: boolean;
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
  isEdit = false,
  loading = false,
  isSuccess = false,
  isShowButtons = true,
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

  // 🎯 UX: Auto-focus no primeiro campo após renderização
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector(
        'input[type="text"], input[type="date"], select, textarea',
      ) as HTMLInputElement;
      firstInput?.focus();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const defaultSubmitLabel = loading
    ? 'Salvando...'
    : isEdit
      ? 'SALVAR ALTERAÇÕES'
      : 'CRIAR';

  return (
    <div
      className="w-full min-h-[calc(100vh-55px)] flex flex-col animate-in fade-in duration-300"
      role="main"
      aria-labelledby="form-page-title"
    >
      <div ref={modalRef} className="relative w-full flex-1 flex flex-col">
        {/* FORM CONTENT */}
        <div className="flex-1">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-10">
            <form
              id={id}
              onSubmit={onSubmit}
              className="flex flex-col"
              onChange={onFormChange}
            >
              {children}
            </form>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 z-[60] shrink-0 bg-petroleum border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
          {isShowButtons && (
            <div className="flex items-center justify-between px-6 py-4">
              <div className="text-[10px] text-white/90 uppercase tracking-luxury-widest">
                {footerStatusText ||
                  (hasUnsavedChanges ? 'Alterações não salvas' : 'Tudo salvo')}
              </div>

              <div className="flex items-center gap-3">
                {isEdit && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="btn-secondary-petroleum"
                  >
                    CANCELAR
                  </button>
                )}
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
          )}
        </div>
      </div>
    </div>
  );
}
