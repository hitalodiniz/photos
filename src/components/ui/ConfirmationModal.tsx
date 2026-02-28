'use client';
import { AlertTriangle, Info, Loader2 } from 'lucide-react'; // ✅ Adicione Loader2

import BaseModal from '@/components/ui/BaseModal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  variant = 'danger',
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const headerIcon = (
    <div
      className={`shrink-0 ${variant === 'danger' ? 'text-red-500' : 'text-gold'}`}
    >
      {variant === 'danger' ? (
        <AlertTriangle size={20} strokeWidth={2.5} />
      ) : (
        <Info size={20} strokeWidth={2.5} />
      )}
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className={`btn-luxury-base w-full flex items-center justify-center gap-2 ${
          variant === 'danger'
            ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/10'
            : 'btn-luxury-primary'
        } ${isLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
      >
        {/* ✅ CORREÇÃO: Mostra spinner + texto lado a lado */}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isLoading ? 'Enviando...' : confirmText}</span>
      </button>

      <button
        onClick={onClose}
        disabled={isLoading} // ✅ Desabilita cancelar durante loading
        className="btn-luxury-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancelar
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      headerIcon={headerIcon}
      footer={footer}
      maxWidth="sm"
    >
      <div className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/80 font-medium text-center py-1">
        {typeof message === 'string'
          ? message.split('Esta ação').map((part, index) => (
              <span key={index} className="block">
                {index === 0 ? part : `Esta ação ${part}`}
                {index === 0 && <span className="block h-1" />}
              </span>
            ))
          : message}
      </div>
    </BaseModal>
  );
}
