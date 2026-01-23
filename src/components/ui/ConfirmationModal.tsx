'use client';
import { AlertTriangle, Info } from 'lucide-react';

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
    <div className={`shrink-0 ${variant === 'danger' ? 'text-red-500' : 'text-gold'}`}>
      {variant === 'danger' ? <AlertTriangle size={20} strokeWidth={2.5} /> : <Info size={20} strokeWidth={2.5} />}
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className={`w-full py-4 rounded-luxury font-bold uppercase text-[10px] tracking-luxury transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${
          variant === 'danger'
            ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/10'
            : 'bg-champagne text-petroleum hover:bg-white shadow-champagne/10'
        }`}
      >
        {isLoading ? (
          <div className="loading-luxury w-4 h-4 border-white/30 border-t-white" />
        ) : (
          confirmText
        )}
      </button>

      <button
        onClick={onClose}
        className="w-full py-3 text-petroleum/40 text-[9px] font-bold uppercase tracking-luxury hover:text-gold transition-colors"
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
