import type { SupabaseClient } from '@supabase/supabase-js';
import type { UpgradeRequest } from '@/core/types/billing';

export function getCurrentUpgradeRequestFromHistory(
  history: UpgradeRequest[],
): UpgradeRequest | null {
  return history.find((r) => r.is_current === true) ?? null;
}

type RpcClient = Pick<SupabaseClient, 'rpc'>;

/**
 * Transação no banco: zera is_current do perfil e marca a linha indicada.
 */
export async function setUpgradeRequestAsCurrent(
  supabase: RpcClient,
  profileId: string,
  requestId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('set_upgrade_request_as_current', {
    p_profile_id: profileId,
    p_request_id: requestId,
  });
  if (error) return { error: error.message };
  return {};
}
