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
        className="w-full py-4 rounded-xl font-semibold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 bg-[#F3E5AB] text-black hover:bg-[#F3E5AB]/90 shadow-lg shadow-[#F3E5AB]/20"
      >
        Entendi, continuar
      </button>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl font-medium text-[12px] text-white/70 hover:text-white hover:bg-white/5 transition-all border border-white/10"
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
      <div className="space-y-4">
        <p className="text-[14px] leading-relaxed text-white/90 font-medium">
          Para usar o Google Picker e importar fotos do Google Drive, é necessário conceder permissão de acesso ao Google Drive.
        </p>
        <p className="text-[14px] leading-relaxed text-white/70">
          Você será redirecionado para a tela de consentimento do Google para autorizar o acesso.
        </p>
      </div>
    </BaseModal>
  );
}
