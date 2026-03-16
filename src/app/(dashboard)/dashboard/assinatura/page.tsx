// src/app/(dashboard)/dashboard/assinatura/page.tsx
import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';
import {
  getUpgradeHistory,
  getSubscriptionExpiresAt,
  getLastChargeAmount,
} from '@/core/services/billing.service';
import { getAsaasSubscriptionStatus } from '@/core/services/asaas';
import { getPhotographerPoolStats } from '@/core/services/galeria.service';
import AssinaturaContent from '@/app/(dashboard)/dashboard/assinatura/AssinaturaContent';
import type { Profile } from '@/core/types/profile';
import type { UpgradeRequest } from '@/core/types/billing';
import type { PhotographerPoolStats } from '@/core/services/galeria.service';

export const metadata = {
  title: 'Minha assinatura',
};

export const dynamic = 'force-dynamic';

export interface AssinaturaPageData {
  profile: Profile;
  history: UpgradeRequest[];
  poolStats: PhotographerPoolStats;
  lastChargeAmount: number | undefined;
  subscriptionStatus: string;
  /** Data de expiração do plano pago (fim do período). Trial usa profile.plan_trial_expires. */
  expiresAt: string | null;
  /** ID da assinatura Asaas do pedido ativo (para reativar ou alterar meio de pagamento). */
  activeSubscriptionId: string | null;
  /** Status da última solicitação de upgrade (para lógica de reativação/cancelamento). */
  latestRequestStatus: string | null;
}

async function getAssinaturaPageData(
  profile: Profile,
): Promise<AssinaturaPageData> {
  const [history, poolStats] = await Promise.all([
    getUpgradeHistory(),
    getPhotographerPoolStats(profile.id),
  ]);

  const latest = history[0];
  const hasPaidPlan = profile.plan_key !== 'FREE';

  // Se o usuário está atualmente no plano FREE, o status mostrado deve ser "Gratuito",
  // independentemente do que o Asaas retornar para assinaturas antigas.
  let subscriptionStatus: string;
  if (!hasPaidPlan) {
    subscriptionStatus = 'FREE';
  } else {
    subscriptionStatus = (latest?.status as string) ?? 'ACTIVE';
  }

  const activeSubscriptionId =
    hasPaidPlan &&
    latest?.asaas_subscription_id?.trim() &&
    (latest.status === 'approved' ||
      latest.status === 'pending_cancellation' ||
      latest.status === 'pending_downgrade')
      ? latest.asaas_subscription_id.trim()
      : null;

  const latestRequestStatus = latest?.status ?? null;

  if (activeSubscriptionId) {
    const asaasStatus = await getAsaasSubscriptionStatus(activeSubscriptionId);
    if (asaasStatus.success && asaasStatus.status) {
      subscriptionStatus = asaasStatus.status;
    }
  }

  const [lastChargeAmount, expiresAt] = await Promise.all([
    getLastChargeAmount(history),
    getSubscriptionExpiresAt(history),
  ]);

  return {
    profile,
    history: history as UpgradeRequest[],
    poolStats,
    lastChargeAmount,
    subscriptionStatus,
    expiresAt,
    activeSubscriptionId,
     latestRequestStatus,
  };
}

export default async function AssinaturaPage() {
  const resultProfile = await getProfileDataFresh();
  if (!resultProfile.success || !resultProfile.profile) {
    redirect('/');
  }
  const profile = resultProfile.profile;
  const data = await getAssinaturaPageData(profile);

  return <AssinaturaContent data={data} />;
}
