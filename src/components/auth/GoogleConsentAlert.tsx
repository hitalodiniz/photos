'use client';

import { AlertTriangle } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';

interface GoogleConsentAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function GoogleConsentAlert({
  isOpen,
  onClose,
  onConfirm,
}: GoogleConsentAlertProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const headerIcon = (
    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10">
      <AlertTriangle className="text-amber-500 w-6 h-6" strokeWidth={2.5} />
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleConfirm}
        className="w-full py-4 rounded-luxury font-bold uppercase text-[10px] tracking-luxury transition-all active:scale-95 flex items-center justify-center gap-2 bg-champagne text-petroleum hover:bg-white shadow-lg shadow-champagne/10"
      >
        Entendi, continuar
      </button>

      <button
        onClick={onClose}
        className="w-full py-3 text-white/90 text-[9px] font-bold uppercase tracking-luxury hover:text-gold transition-colors"
      >
        Cancelar
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Permissão Necessária"
      subtitle="Acesso ao Google Drive"
      headerIcon={headerIcon}
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-3">
        <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum font-medium text-center">
          Para usar o Google Picker e importar fotos do Google Drive, é
          necessário conceder permissão de acesso ao Google Drive.
        </p>
        <div className="p-4 bg-slate-50 border border-petroleum/10 rounded-luxury italic">
          <p className="text-[11px] md:text-[12px] leading-relaxed text-petroleum/70 text-center">
            Você será redirecionado para a tela de consentimento do Google para
            autorizar o acesso.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
