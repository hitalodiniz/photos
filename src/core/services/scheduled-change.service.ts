// ADICIONAR ao src/core/services/asaas.service.ts
//
// Estas funções implementam o fluxo de downgrade agendado fora da janela
// de arrependimento (> 7 dias após compra).
//
// Fluxo:
//   1. scheduleDowngradeChange → cria registro pending_change + assinatura
//      nova no Asaas com nextDueDate = vencimento atual + endDate na sub atual
//   2. cancelScheduledChange   → cancela a nova sub no Asaas + remove endDate
//      da sub atual + marca pending_change como cancelled
//   3. Cron apply-downgrades   → ao vencer, aprova o pending_change e atualiza
//      plan_key no perfil (ver cron abaixo)
//
// IMPORTS adicionais necessários no topo do asaas.service.ts:
//   import { removeAsaasSubscriptionEndDate } from './asaas/api/subscriptions';
// ─────────────────────────────────────────────────────────────────────────────

'use server';

import {
  createSupabaseAdmin,
  createSupabaseServerClient,
} from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { revalidateUserCache } from '@/actions/revalidate.actions';
import {
  PLANS_BY_SEGMENT,
  getPeriodPrice,
  planOrder,
  type PlanKey,
  type SegmentType,
} from '@/core/config/plans';
import type {
  BillingPeriod,
  BillingType,
  UpgradeRequestPayload,
  UpgradeRequestResult,
} from '@/core/types/billing';
import {
  addMonths,
  addDays,
  billingPeriodToMonths,
  parseExpiryFromNotes,
} from './asaas/utils/dates';
import { formatSnapshotAddress } from './asaas/utils/formatters';
import { upsertBillingProfile } from './asaas/billing/billing-profile';
import { createOrUpdateAsaasCustomer } from './asaas/api/customers';
import {
  createAsaasSubscription,
  setAsaasSubscriptionEndDate,
  cancelAsaasSubscriptionById,
  removeAsaasSubscriptionEndDate,
} from './asaas/api/subscriptions';
import { getCurrentActiveRequest } from './asaas.service';
import { appendBillingNotesBlock } from './asaas/utils/billing-notes-doc';

// ─────────────────────────────────────────────────────────────────────────────
// scheduleDowngradeChange
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agenda o downgrade para um plano inferior quando o usuário está fora da
 * janela de arrependimento (> 7 dias após a compra).
 *
 * O que faz:
 *   1. Resolve a data de vencimento do plano atual
 *   2. Cria nova assinatura no Asaas com nextDueDate = vencimento atual
 *      (o Asaas só vai cobrar a partir dessa data)
 *   3. Seta endDate na assinatura atual = vencimento atual
 *      (o Asaas para de cobrar a assinatura atual após essa data)
 *   4. Insere registro pending_change na tb_upgrade_requests
 *
 * O cron daily aplica o downgrade quando processed_at <= now.
 */
export async function scheduleDowngradeChange(
  payload: UpgradeRequestPayload,
): Promise<UpgradeRequestResult> {
  const supabase = await createSupabaseServerClient();
  const {
    success: authOk,
    profile,
    userId,
    email,
  } = await getAuthenticatedUser();
  if (!authOk || !profile || !userId)
    return { success: false, error: 'Usuário não autenticado' };

  const { data: pendingDowngradeBlock } = await supabase
    .from('tb_upgrade_requests')
    .select('id')
    .eq('profile_id', userId)
    .eq('status', 'pending_downgrade')
    .limit(1)
    .maybeSingle();
  if (pendingDowngradeBlock) {
    return {
      success: false,
      error:
        'Há um cancelamento com downgrade agendado. Não é possível alterar o plano até essa solicitação ser concluída ou alterada.',
    };
  }

  const segment = (payload.segment ?? 'PHOTOGRAPHER') as SegmentType;
  const targetPlanKey = payload.plan_key_requested as PlanKey;
  const targetPeriod: BillingPeriod = payload.billing_period ?? 'monthly';
  const planInfo = PLANS_BY_SEGMENT[segment]?.[targetPlanKey];

  if (!planInfo || planInfo.price <= 0)
    return { success: false, error: 'Plano inválido ou gratuito' };

  const planKeyCurrent = ((profile.plan_key &&
    String(profile.plan_key).toUpperCase()) ??
    'FREE') as PlanKey;

  // Validação: só permite downgrade (plano inferior)
  const targetIdx = planOrder.indexOf(targetPlanKey);
  const currentIdx = planOrder.indexOf(planKeyCurrent);
  if (targetIdx >= currentIdx)
    return {
      success: false,
      error: 'Use o fluxo normal para upgrades ou mesmo plano.',
    };

  // ── Busca vencimento do plano atual ──────────────────────────────────────
  const currentRequest = await getCurrentActiveRequest(
    userId,
    planKeyCurrent,
    supabase,
  );
  if (!currentRequest?.processed_at)
    return {
      success: false,
      error: 'Não foi possível determinar o vencimento do plano atual.',
    };

  const startDate = new Date(currentRequest.processed_at);
  const monthsCurrent = billingPeriodToMonths(currentRequest.billing_period);
  let currentPlanExpiresAt = addMonths(startDate, monthsCurrent);
  const expiryFromNotes = parseExpiryFromNotes(currentRequest.notes);
  if (expiryFromNotes && expiryFromNotes.getTime() > currentPlanExpiresAt.getTime())
    currentPlanExpiresAt = expiryFromNotes;

  const now = nowFn();
  const daysSincePurchase = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Janela de arrependimento só bloqueia quando houve desembolso real.
  // Em upgrades com aproveitamento de crédito (amount_final = 0), não bloqueia.
  const hasPaidAmount = (currentRequest.amount_final ?? 0) > 0;
  if (daysSincePurchase <= 7 && hasPaidAmount)
    return {
      success: false,
      error:
        'Dentro da janela de arrependimento — use o fluxo normal de downgrade.',
    };

  // Não agenda se já expirou
  if (currentPlanExpiresAt.getTime() <= now.getTime())
    return { success: false, error: 'O plano atual já expirou.' };

  // Verifica se já existe pending_change para este usuário
  const { data: existingChange } = await supabase
    .from('tb_upgrade_requests')
    .select('id, plan_key_requested, asaas_subscription_id')
    .eq('profile_id', userId)
    .eq('status', 'pending_change')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingChange) {
    return {
      success: false,
      error:
        'Você já possui uma mudança de plano agendada. Cancele a intenção atual antes de criar uma nova.',
    };
  }

  const endDateStr = utcIsoFrom(currentPlanExpiresAt).split('T')[0];
  const newPlanStartsAt = addDays(currentPlanExpiresAt, 1);
  const nextDueDateStr = utcIsoFrom(newPlanStartsAt).split('T')[0];

  // ── Upsert billing profile + customer Asaas ──────────────────────────────
  const billingFullName = payload.full_name?.trim() ?? profile.full_name ?? '';

  const upsertResult = await upsertBillingProfile(userId, {
    full_name: billingFullName || undefined,
    cpf_cnpj: payload.cpf_cnpj,
    postal_code: payload.postal_code,
    address: payload.address,
    address_number: payload.address_number,
    complement: payload.complement,
    province: payload.province,
    city: payload.city,
    state: payload.state,
  });
  if (!upsertResult.success)
    return { success: false, error: upsertResult.error };

  const { data: billingRow } = await supabase
    .from('tb_billing_profiles')
    .select('asaas_customer_id')
    .eq('id', userId)
    .single();

  const customerResult = await createOrUpdateAsaasCustomer(
    {
      name: billingFullName || (profile.full_name ?? 'Cliente'),
      email: email ?? '',
      cpfCnpj: payload.cpf_cnpj,
      phone: payload.whatsapp,
      postalCode: payload.postal_code,
      address: payload.address,
      addressNumber: payload.address_number,
      complement: payload.complement,
      province: payload.province,
      city: payload.city,
      state: payload.state,
    },
    billingRow?.asaas_customer_id ?? null,
  );
  if (!customerResult.success || !customerResult.customerId)
    return {
      success: false,
      error: customerResult.error ?? 'Erro ao criar cliente no gateway',
    };

  const asaasCustomerId = customerResult.customerId;
  await supabase
    .from('tb_billing_profiles')
    .update({
      asaas_customer_id: asaasCustomerId,
      updated_at: utcIsoFrom(now),
    })
    .eq('id', userId);

  // ── Monta dados de cartão se necessário ──────────────────────────────────
  let creditCardDetails: any;
  let creditCardHolderInfo: any;
  const isCreditCard = payload.billing_type === 'CREDIT_CARD';
  const useSavedCard = isCreditCard && payload.use_saved_card === true;

  if (isCreditCard && !useSavedCard && !payload.credit_card) {
    return {
      success: false,
      error:
        'Dados do cartão são obrigatórios quando não usar cartão já cadastrado.',
    };
  }

  if (isCreditCard && !useSavedCard && payload.credit_card) {
    const c = payload.credit_card;
    if (
      !c.credit_card_holder_name?.trim() ||
      !c.credit_card_number?.replace(/\D/g, '') ||
      !c.credit_card_expiry_month ||
      !c.credit_card_expiry_year ||
      !c.credit_card_ccv
    ) {
      return { success: false, error: 'Dados do cartão incompletos.' };
    }
    creditCardDetails = {
      holderName: c.credit_card_holder_name.trim(),
      number: c.credit_card_number.replace(/\D/g, ''),
      expiryMonth: c.credit_card_expiry_month
        .replace(/\D/g, '')
        .padStart(2, '0')
        .slice(-2),
      expiryYear: c.credit_card_expiry_year.replace(/\D/g, ''),
      ccv: c.credit_card_ccv.replace(/\D/g, ''),
    };
    creditCardHolderInfo = {
      name: billingFullName || (profile.full_name ?? 'Cliente'),
      email: email ?? '',
      cpfCnpj: payload.cpf_cnpj.replace(/\D/g, ''),
      postalCode: payload.postal_code.replace(/\D/g, ''),
      addressNumber: payload.address_number,
      addressComplement: payload.complement ?? undefined,
      phone: payload.whatsapp.replace(/\D/g, ''),
      mobilePhone: payload.whatsapp.replace(/\D/g, ''),
    };
  }

  // ── 1. Cria nova assinatura no Asaas com nextDueDate futuro ──────────────
  const asaasCycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' =
    targetPeriod === 'annual'
      ? 'YEARLY'
      : targetPeriod === 'semiannual'
        ? 'SEMIANNUALLY'
        : 'MONTHLY';

  const planPrice = getPeriodPrice(planInfo, targetPeriod).totalPrice;

  const subResult = await createAsaasSubscription({
    customerId: asaasCustomerId,
    billingType: payload.billing_type,
    cycle: asaasCycle,
    value: planPrice,
    description: `Plano ${planInfo.name} (agendado)`,
    nextDueDate: nextDueDateStr,
    ...(creditCardDetails && { creditCardDetails }),
    ...(creditCardHolderInfo && { creditCardHolderInfo }),
  });

  if (!subResult.success || !subResult.subscriptionId)
    return {
      success: false,
      error: subResult.error ?? 'Erro ao criar assinatura agendada',
    };

  const newSubscriptionId = subResult.subscriptionId;

  // ── 2. Seta endDate na assinatura atual ──────────────────────────────────
  if (currentRequest.asaas_subscription_id) {
    const endResult = await setAsaasSubscriptionEndDate(
      currentRequest.asaas_subscription_id,
      endDateStr,
    );
    if (!endResult.success) {
      // Rollback: cancela a nova assinatura para não deixar duplicata
      await cancelAsaasSubscriptionById(newSubscriptionId).catch(console.error);
      return {
        success: false,
        error:
          endResult.error ?? 'Erro ao agendar encerramento da assinatura atual',
      };
    }
  }

  // ── 3. Insere registro pending_change ────────────────────────────────────
  const snapshot_address = formatSnapshotAddress(payload);
  const notes =
    `Mudança agendada para Plano ${planInfo.name} (${targetPeriod}).\n` +
    `Plano atual (${planKeyCurrent}) vigente até ${endDateStr}.\n` +
    `Nova assinatura Asaas: ${newSubscriptionId} com nextDueDate ${nextDueDateStr}.\n` +
    `Assinatura atual encerrada em: ${endDateStr}.`;

  const { data: insertRow, error: insertError } = await supabase
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: planKeyCurrent,
      plan_key_requested: targetPlanKey,
      billing_type: payload.billing_type,
      billing_period: targetPeriod,
      snapshot_name: billingFullName || (profile.full_name ?? ''),
      snapshot_cpf_cnpj: payload.cpf_cnpj,
      snapshot_email: email ?? '',
      snapshot_whatsapp: payload.whatsapp,
      snapshot_address,
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: newSubscriptionId,
      asaas_payment_id: null,
      payment_url: null,
      amount_original: planPrice,
      amount_discount: 0,
      amount_final: planPrice,
      installments: 1,
      status: 'pending_change',
      // processed_at = data em que a mudança deve ser aplicada (dia seguinte ao vencimento atual)
      processed_at: utcIsoFrom(newPlanStartsAt),
      notes,
    })
    .select('id')
    .single();

  if (insertError) {
    // Rollback parcial: tenta cancelar nova sub e remover endDate da atual
    await cancelAsaasSubscriptionById(newSubscriptionId).catch(console.error);
    if (currentRequest.asaas_subscription_id) {
      await removeAsaasSubscriptionEndDate(
        currentRequest.asaas_subscription_id,
      ).catch(console.error);
    }
    return {
      success: false,
      error: 'Erro ao registrar mudança agendada. Tente novamente.',
    };
  }

  await revalidateUserCache(userId).catch(console.warn);

  return {
    success: true,
    billing_type: payload.billing_type,
    request_id: insertRow?.id,
    is_scheduled_change: true,
    scheduled_change_effective_at: utcIsoFrom(newPlanStartsAt),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelScheduledChange
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cancela uma intenção de downgrade agendada (pending_change).
 *
 * O que faz:
 *   1. Cancela a nova assinatura no Asaas (a futura)
 *   2. Remove o endDate da assinatura atual (para continuar cobrando normalmente)
 *   3. Marca o registro pending_change como 'cancelled' no banco
 */
export async function cancelScheduledChange(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const { success: authOk, userId } = await getAuthenticatedUser();
  if (!authOk || !userId) return { success: false, error: 'Não autenticado' };

  // Busca o pending_change ativo
  const { data: pendingChange } = await supabase
    .from('tb_upgrade_requests')
    .select('id, asaas_subscription_id, plan_key_current, notes')
    .eq('profile_id', userId)
    .eq('status', 'pending_change')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingChange)
    return { success: false, error: 'Nenhuma mudança agendada encontrada.' };

  const newSubId = pendingChange.asaas_subscription_id?.trim();

  // ── 1. Cancela a nova assinatura no Asaas ────────────────────────────────
  if (newSubId) {
    const cancelResult = await cancelAsaasSubscriptionById(newSubId);
    if (!cancelResult.success)
      return {
        success: false,
        error:
          cancelResult.error ??
          'Erro ao cancelar assinatura agendada no gateway.',
      };
  }

  // ── 2. Remove endDate da assinatura atual ────────────────────────────────
  const { data: currentRows } = await supabase
    .from('tb_upgrade_requests')
    .select('asaas_subscription_id')
    .eq('profile_id', userId)
    .eq('is_current', true)
    .maybeSingle();

  const currentSubId = currentRows?.asaas_subscription_id?.trim();
  if (currentSubId) {
    const removeResult = await removeAsaasSubscriptionEndDate(currentSubId);
    if (!removeResult.success) {
      // Não fatal — loga mas não bloqueia o cancelamento
      console.error(
        '[cancelScheduledChange] Falha ao remover endDate da assinatura atual:',
        removeResult.error,
      );
    }
  }

  // ── 3. Marca pending_change como cancelled ───────────────────────────────
  const { error: updateError } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes: appendBillingNotesBlock(
        pendingChange.notes ?? null,
        'Intenção de mudança cancelada pelo usuário antes do vencimento.',
      ),
      updated_at: utcIsoFrom(nowFn()),
    })
    .eq('id', pendingChange.id);

  if (updateError)
    return {
      success: false,
      error: 'Gateway atualizado, mas falha ao salvar no sistema.',
    };

  await revalidateUserCache(userId).catch(console.warn);

  return { success: true };
}
