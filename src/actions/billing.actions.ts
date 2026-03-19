// src/actions/billing.actions.ts
'use server';
import { getOverdueSince } from '@/core/services/billing.service';

export async function fetchOverdueSince(
  profileId: string,
): Promise<string | null> {
  return getOverdueSince(profileId);
}
