'use client';

import { useState, useCallback } from 'react';
import { PlanAdequacyModal } from '@/components/dashboard/PlanAdequacyModal';
import type { ExpiredSubscriptionCheck } from '@/core/types/billing';

interface DashboardExpiredWrapperProps {
  expiredCheck: ExpiredSubscriptionCheck;
  children: React.ReactNode;
}

/**
 * Envolve o conteúdo do Dashboard e exibe o modal de adequação de plano
 * quando checkAndApplyExpiredSubscriptions aplicou downgrade e ocultou galerias.
 * Não redireciona para erro — mantém o usuário no Dashboard.
 */
export function DashboardExpiredWrapper({
  expiredCheck,
  children,
}: DashboardExpiredWrapperProps) {
  const shouldShowModal =
    expiredCheck.applied &&
    expiredCheck.excess_galleries?.length > 0;
  const [modalOpen, setModalOpen] = useState(shouldShowModal);

  const handleClose = useCallback(() => {
    setModalOpen(false);
  }, []);

  return (
    <>
      {children}
      {shouldShowModal && (
        <PlanAdequacyModal
          isOpen={modalOpen}
          onClose={handleClose}
          expiredCheck={expiredCheck}
        />
      )}
    </>
  );
}
