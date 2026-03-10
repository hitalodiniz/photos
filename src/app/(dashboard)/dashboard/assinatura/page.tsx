// src/app/(dashboard)/dashboard/assinatura/page.tsx
import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';
import {
  getUpgradeHistory,
  getSubscriptionExpiresAt,
  getLastChargeAmount,
} from '@/core/services/billing.service';
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
}

async function getAssinaturaPageData(
  profile: Profile,
): Promise<AssinaturaPageData> {
  const [history, poolStats] = await Promise.all([
    getUpgradeHistory(),
    getPhotographerPoolStats(profile.id),
  ]);

  const latest = history[0];
  const subscriptionStatus =
    (latest?.status as string) ??
    (profile.plan_key !== 'FREE' ? 'active' : 'free');

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
