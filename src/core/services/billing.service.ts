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

function billingPeriodToMonths(period: string | null | undefined): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/**
 * Extrai a data de vencimento das notes (ex.: upgrade gratuito "Nova data de vencimento: 2026-06-16T...").
 * Retorna a Date ou null.
 */
function parseExpiryFromNotes(notes: string | null | undefined): Date | null {
  if (!notes?.trim()) return null;
  const match = notes.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1].trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calcula a data de expiração do plano pago a partir do histórico.
 * Preferência: data extraída das notes da solicitação aprovada ("Nova data de vencimento:");
 * caso contrário usa processed_at + billing_period.
 * Retorna ISO string ou null.
 */
export async function getSubscriptionExpiresAt(
  history: UpgradeRequest[],
): Promise<string | null> {
  const approved = history.find((r) => r.status === 'approved');
  if (!approved) return null;

  const fromNotes = parseExpiryFromNotes(approved.notes);
  if (fromNotes) return fromNotes.toISOString();

  if (!approved.processed_at) return null;
  const start = new Date(approved.processed_at);
  const months = billingPeriodToMonths(approved.billing_period);
  const endsAt = addMonths(start, months);
  return endsAt.toISOString();
}

/**
 * Retorna o valor da última cobrança para exibição.
 * Preferência: solicitação aprovada; fallback: qualquer registro com amount_final > 0.
 */
export async function getLastChargeAmount(
  history: UpgradeRequest[],
): Promise<number | undefined> {
  const approved = history.find((r) => r.status === 'approved');
  if (approved?.amount_final != null && approved.amount_final > 0) {
    return approved.amount_final;
  }
  const withCharge = history.find(
    (r) => r.amount_final != null && r.amount_final > 0,
  );
  return withCharge?.amount_final;
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
