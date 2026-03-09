'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import type { ExpiredSubscriptionCheck } from '@/core/types/billing';

interface PlanAdequacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Resultado de checkAndApplyExpiredSubscriptions quando applied && excess_galleries.length > 0 */
  expiredCheck: ExpiredSubscriptionCheck;
}

/**
 * Modal exibido no Dashboard quando o período Premium expirou e galerias
 * excedentes foram ocultadas (soft downgrade). Mantém o usuário no Dashboard
 * e oferece upgrade para reativar as galerias.
 */
export function PlanAdequacyModal({
  isOpen,
  onClose,
  expiredCheck,
}: PlanAdequacyModalProps) {
  const count = expiredCheck.excess_galleries?.length ?? 0;
  const message =
    count > 0
      ? `Seu período Premium expirou. Para manter a conta ativa no plano FREE, ocultamos ${count} ${count === 1 ? 'galeria' : 'galerias'}. Seus arquivos continuam seguros. Faça o upgrade agora para reativá-las instantaneamente.`
      : 'Seu período Premium expirou. Faça o upgrade para voltar a acessar todos os recursos.';

  const footer = (
    <div className="flex flex-col gap-2 w-full">
      <Link
        href="/planos"
        className="btn-luxury-primary w-full flex items-center justify-center gap-2"
        onClick={onClose}
      >
        <Crown size={14} />
        Fazer upgrade agora
      </Link>
      <button type="button" onClick={onClose} className="btn-luxury-secondary">
        Entendi
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Adequação de plano"
      subtitle="Período Premium encerrado"
      headerIcon={<Crown size={20} className="text-gold" />}
      footer={footer}
      maxWidth="sm"
    >
      <p className="text-[13px] text-petroleum/90 leading-relaxed">{message}</p>
    </BaseModal>
  );
}
