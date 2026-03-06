// src/core/services/billing.service.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import type {
  BillingProfile,
  UpgradeRequest,
  UpgradeRequestStatus,
} from '@/core/types/billing';

/**
 * Carrega tb_billing_profiles do usuário atual.
 * Retorna null se ainda não cadastrado (primeiro upgrade).
 */
export async function getBillingProfile(): Promise<BillingProfile | null> {
  const { success, userId } = await getAuthenticatedUser();
  if (!success || !userId) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tb_billing_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as BillingProfile;
}

/**
 * Lista tb_upgrade_requests do usuário atual, ordenado por created_at DESC.
 * Usado na página /dashboard/planos para mostrar histórico.
 */
export async function getUpgradeHistory(): Promise<UpgradeRequest[]> {
  const { success, userId } = await getAuthenticatedUser();
  if (!success || !userId) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tb_upgrade_requests')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as UpgradeRequest[];
}

/**
 * Permite ao usuário cancelar uma solicitação 'pending'.
 */
export async function cancelUpgradeRequest(
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  const { success, userId } = await getAuthenticatedUser();
  if (!success || !userId) {
    return { success: false, error: 'Não autenticado' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from('tb_upgrade_requests')
    .select('id, status, profile_id')
    .eq('id', requestId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Solicitação não encontrada' };
  }

  if (existing.profile_id !== userId) {
    return { success: false, error: 'Solicitação não pertence ao usuário' };
  }

  if ((existing.status as UpgradeRequestStatus) !== 'pending') {
    return {
      success: false,
      error: 'Apenas solicitações pendentes podem ser canceladas',
    };
  }

  const { error: updateError } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('profile_id', userId);

  if (updateError) {
    console.error('[billing] cancelUpgradeRequest:', updateError);
    return { success: false, error: 'Erro ao cancelar solicitação' };
  }

  return { success: true };
}
