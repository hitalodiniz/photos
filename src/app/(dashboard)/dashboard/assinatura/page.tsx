// src/app/(dashboard)/dashboard/assinatura/page.tsx
import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';
import {
  getUpgradeHistory,
  getSubscriptionExpiresAt,
  getLastChargeAmount,
  getCurrentUpgradeRequestFromHistory,
} from '@/core/services/billing.service';
import { getAsaasSubscription, getAsaasSubscriptionStatus } from '@/core/services/asaas';
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
  /** Cache de datas vindas do Asaas por ID da assinatura. */
  asaasDatesBySubscriptionId: Record<
    string,
    {
      nextDueDate: string | null;
      endDate: string | null;
    }
  >;
  /** Existe linha em tb_upgrade_requests com is_current = true (ciclo vigente). */
  hasPaidSubscriptionRecord: boolean;
}

function isRenewedHistoryStatus(status: unknown): boolean {
  return String(status ?? '').toUpperCase() === 'RENEWED';
}

/**
 * Assinatura Asaas do ciclo vigente. Quando pending_downgrade/cancellation tem ID
 * divergente do último aprovado, usa o do aprovado (é a assinatura real em vigência).
 */
function resolveActiveSubscriptionId(history: UpgradeRequest[]): string | null {
  const latestApprovedWithSub = history.find(
    (item) =>
      (item.status === 'approved' || isRenewedHistoryStatus(item.status)) &&
      !!item.asaas_subscription_id?.trim(),
  );
  const latestPendingCancelWithSub = history.find(
    (item) =>
      (item.status === 'pending_cancellation' ||
        item.status === 'pending_downgrade') &&
      !!item.asaas_subscription_id?.trim(),
  );
  const approvedSub =
    latestApprovedWithSub?.asaas_subscription_id?.trim() ?? '';
  const pendingSub =
    latestPendingCancelWithSub?.asaas_subscription_id?.trim() ?? '';
  if (approvedSub && pendingSub && approvedSub !== pendingSub) {
    return approvedSub;
  }
  return pendingSub || approvedSub || null;
}

async function getAssinaturaPageData(
  profile: Profile,
): Promise<AssinaturaPageData> {
  const [history, poolStats] = await Promise.all([
    getUpgradeHistory(),
    getPhotographerPoolStats(profile.id),
  ]);

  const latest = history[0];
  const currentUpgradeRequest = getCurrentUpgradeRequestFromHistory(
    history as UpgradeRequest[],
  );
  const hasPaidSubscriptionRecord = !!currentUpgradeRequest;

  let subscriptionStatus: string;
  if (!hasPaidSubscriptionRecord) {
    subscriptionStatus = 'FREE';
  } else {
    subscriptionStatus =
      (currentUpgradeRequest?.asaas_raw_status as string) ??
      (currentUpgradeRequest?.status as string) ??
      'ACTIVE';
  }

  const activeSubscriptionId = hasPaidSubscriptionRecord
    ? (currentUpgradeRequest?.asaas_subscription_id?.trim() ||
        resolveActiveSubscriptionId(history as UpgradeRequest[])) ??
      null
    : null;

  const latestRequestStatus = latest?.status ?? null;

  const uniqueSubscriptionIds = Array.from(
    new Set(
      history
        .map((item) => item.asaas_subscription_id?.trim() ?? '')
        .filter((id) => !!id),
    ),
  );

  const asaasDatesBySubscriptionId: AssinaturaPageData['asaasDatesBySubscriptionId'] =
    {};

  if (activeSubscriptionId) {
    const asaasStatus = await getAsaasSubscriptionStatus(activeSubscriptionId);
    if (asaasStatus.success && asaasStatus.status) {
      subscriptionStatus = asaasStatus.status;
    }
  }

  if (uniqueSubscriptionIds.length) {
    const dateResults = await Promise.all(
      uniqueSubscriptionIds.map(async (subscriptionId) => {
        const details = await getAsaasSubscription(subscriptionId);
        return { subscriptionId, details };
      }),
    );

    for (const { subscriptionId, details } of dateResults) {
      if (!details.success) continue;
      asaasDatesBySubscriptionId[subscriptionId] = {
        nextDueDate: details.nextDueDate ?? null,
        endDate: details.endDate ?? null,
      };
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
    asaasDatesBySubscriptionId,
    hasPaidSubscriptionRecord,
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
