'use client';

import { useMemo } from 'react';
import type { ExpiredSubscriptionCheck } from '@/core/types/billing';
import type { Galeria } from '@/core/types/galeria';
import { DowngradeAlert } from '@/components/dashboard/DowngradeAlert';

interface DashboardExpiredWrapperProps {
  expiredCheck: ExpiredSubscriptionCheck;
  profile: {
    id: string;
    full_name: string;
    plan_key?: any;
    is_trial?: boolean | null;
    plan_trial_expires?: string | null;
    metadata?: { last_downgrade_alert_viewed?: boolean } | null;
  } | null;
  galerias: Galeria[];
  children: React.ReactNode;
}

/**
 * Envolve o conteúdo do Dashboard e exibe o modal de adequação de plano
 * quando checkAndApplyExpiredSubscriptions aplicou downgrade e ocultou galerias.
 * Não redireciona para erro — mantém o usuário no Dashboard.
 */
export function DashboardExpiredWrapper({
  expiredCheck,
  profile,
  galerias,
  children,
}: DashboardExpiredWrapperProps) {
  const shouldShowModal =
    expiredCheck.applied ||
    profile?.metadata?.last_downgrade_alert_viewed === false;
  const shouldRender = useMemo(() => {
    return shouldShowModal && !!profile;
  }, [shouldShowModal, profile]);

  return (
    <>
      {children}
      {shouldRender ? (
        <DowngradeAlert profile={profile as any} galerias={galerias} />
      ) : null}
    </>
  );
}
