// src/actions/billing.actions.ts
'use server';
import {
  getOverdueBadgeData,
  getOverdueSince,
} from '@/core/services/billing.service';

export async function fetchOverdueSince(
  profileId: string,
): Promise<string | null> {
  return getOverdueSince(profileId);
}

export async function fetchOverdueBadgeData(profileId: string): Promise<{
  overdueSince: string | null;
  paymentHref: string | null;
}> {
  return getOverdueBadgeData(profileId);
}
