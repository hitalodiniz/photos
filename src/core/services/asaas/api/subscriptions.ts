// src/core/services/asaas/api/subscriptions.ts
'use server';

import { asaasRequest, asaasError } from './client';
import {
  normalizeCreditCard,
  normalizeCreditCardHolderInfo,
} from '../utils/formatters';
import type { CreateSubscriptionData } from '../types';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { appendBillingNotesBlock } from '@/core/services/asaas/utils/billing-notes-doc';

const BOLETO_VALIDITY_DAYS_AFTER_DUE = 30;

export async function createAsaasSubscription(data: CreateSubscriptionData) {
  try {
    const today = utcIsoFrom(nowFn()).split('T')[0];
    const nextDueDate =
      data.nextDueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.nextDueDate)
        ? data.nextDueDate
        : today;

    const body: Record<string, unknown> = {
      customer: data.customerId,
      billingType: data.billingType,
      cycle: data.cycle,
      value: data.value,
      description: data.description,
      nextDueDate,
      // Gera a cobrança 5 dias antes do vencimento para permitir lembretes.
      daysBeforeDue: 5,
      updatePendingPayments: data.updatePendingPayments ?? true,
    };
    if (data.billingType === 'BOLETO') {
      // Boleto com validade curta: aceita pagamento somente até D+3.
      body.daysBeforeExpirationByBillingSelfRegistration =
        BOLETO_VALIDITY_DAYS_AFTER_DUE;
    }

    if (data.installmentCount && data.installmentCount > 1)
      body.installmentCount = data.installmentCount;
    if (data.maxPayments != null && data.maxPayments >= 1)
      body.maxPayments = data.maxPayments;

    if (data.billingType === 'CREDIT_CARD' && data.creditCardDetails) {
      body.creditCard = normalizeCreditCard(data.creditCardDetails);
      if (data.creditCardHolderInfo)
        body.creditCardHolderInfo = normalizeCreditCardHolderInfo(
          data.creditCardHolderInfo,
        );
    }
    if (data.discount && data.discount.value > 0) {
      body.discount = {
        value: data.discount.value,
        dueDateLimitDays: data.discount.dueDateLimitDays,
        type: data.discount.type,
      };
    }

    const { ok, data: sub } = await asaasRequest<{
      id?: string;
      invoiceUrl?: string;
      bankSlipUrl?: string;
      errors?: unknown[];
    }>('/subscriptions', { method: 'POST', body: JSON.stringify(body) });

    if (!ok || !sub.id) {
      return {
        success: false,
        error: asaasError(
          sub as Record<string, unknown>,
          'Erro ao criar assinatura',
        ),
      };
    }
    return {
      success: true,
      subscriptionId: sub.id,
      invoiceUrl: sub.invoiceUrl,
      bankSlipUrl: sub.bankSlipUrl,
    };
  } catch (e) {
    console.error('[Asaas] createAsaasSubscription:', e);
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
    };
  }
}

export async function updateAsaasSubscriptionNextDueDate(
  subscriptionId: string,
  nextDueDate: string,
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate))
    return { success: false, error: 'nextDueDate deve ser YYYY-MM-DD' };
  const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
    `/subscriptions/${subscriptionId}`,
    { method: 'PUT', body: JSON.stringify({ nextDueDate }) },
  );
  return ok
    ? { success: true }
    : {
        success: false,
        error: asaasError(
          data as Record<string, unknown>,
          'Erro ao atualizar assinatura',
        ),
      };
}

export async function updateAsaasSubscriptionPlanAndDueDate(
  subscriptionId: string,
  params: {
    value: number;
    description: string;
    nextDueDate: string;
    billingType?: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
    cycle?: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY';
    updatePendingPayments?: boolean;
    discount?: {
      value: number;
      dueDateLimitDays: number;
      type: 'FIXED' | 'PERCENTAGE';
    };
  },
): Promise<{ success: boolean; error?: string }> {
  const {
    value,
    description,
    nextDueDate,
    billingType,
    cycle,
    updatePendingPayments,
    discount,
  } = params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate))
    return { success: false, error: 'nextDueDate deve ser YYYY-MM-DD' };
  const body: Record<string, unknown> = {
    value,
    description,
    nextDueDate,
    updatePendingPayments: updatePendingPayments ?? true,
  };
  if (billingType) body.billingType = billingType;
  if (billingType === 'BOLETO') {
    // Mantém validade curta também em updates de assinatura para boleto.
    body.daysBeforeExpirationByBillingSelfRegistration =
      BOLETO_VALIDITY_DAYS_AFTER_DUE;
  }
  if (cycle) body.cycle = cycle;
  if (discount && discount.value > 0) body.discount = discount;
  const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
    `/subscriptions/${subscriptionId}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  return ok
    ? { success: true }
    : {
        success: false,
        error: asaasError(
          data as Record<string, unknown>,
          'Erro ao atualizar assinatura no Asaas',
        ),
      };
}

export async function setAsaasSubscriptionEndDate(
  subscriptionId: string,
  endDateYYYYMMDD: string,
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDateYYYYMMDD))
    return { success: false, error: 'endDate deve ser YYYY-MM-DD' };
  const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
    `/subscriptions/${subscriptionId}`,
    { method: 'PUT', body: JSON.stringify({ endDate: endDateYYYYMMDD }) },
  );
  return ok
    ? { success: true }
    : {
        success: false,
        error: asaasError(
          data as Record<string, unknown>,
          'Erro ao definir fim da assinatura',
        ),
      };
}

export async function cancelAsaasSubscriptionById(
  subscriptionId: string,
  options?: { deletePendingPayments?: boolean },
): Promise<{ success: boolean; error?: string }> {
  const deletePendingPayments = options?.deletePendingPayments ?? true;
  const path = deletePendingPayments
    ? `/subscriptions/${subscriptionId}?deletePendingPayments=true`
    : `/subscriptions/${subscriptionId}`;
  const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(path, {
    method: 'DELETE',
  });
  return ok
    ? { success: true }
    : {
        success: false,
        error: asaasError(
          data as Record<string, unknown>,
          'Erro ao cancelar assinatura',
        ),
      };
}

export async function getAsaasSubscription(subscriptionId: string): Promise<{
  success: boolean;
  nextDueDate?: string;
  status?: string;
  endDate?: string | null;
  billingType?: string;
  value?: number;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    nextDueDate?: string;
    status?: string;
    endDate?: string | null;
    billingType?: string;
    value?: number;
    errors?: unknown[];
  }>(`/subscriptions/${subscriptionId}`);
  if (!ok)
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao buscar assinatura',
      ),
    };
  return {
    success: true,
    nextDueDate: data.nextDueDate,
    status: data.status,
    endDate: data.endDate ?? null,
    billingType: data.billingType,
    value: typeof data.value === 'number' ? data.value : undefined,
  };
}

export async function getAsaasSubscriptionStatus(
  subscriptionId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  const result = await getAsaasSubscription(subscriptionId);
  return result.success
    ? { success: true, status: result.status }
    : { success: false, error: result.error };
}

export async function listSubscriptionsByCustomer(
  customerId: string,
  statusFilter?: 'ACTIVE' | 'EXPIRED' | 'INACTIVE',
): Promise<{
  success: boolean;
  subscriptions?: Array<{ id: string; status?: string }>;
  error?: string;
}> {
  const params = new URLSearchParams({ customer: customerId });
  if (statusFilter) params.set('status', statusFilter);
  const path = `/subscriptions?${params.toString()}`;
  const { ok, data } = await asaasRequest<{
    data?: Array<{ id?: string; status?: string }>;
    errors?: unknown[];
  }>(path);
  if (!ok)
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao listar assinaturas do cliente',
      ),
    };
  const list = (data.data ?? []).map((s) => ({
    id: s.id ?? '',
    status: s.status,
  }));
  return { success: true, subscriptions: list };
}

export async function getActiveSubscriptionIdForCustomer(
  customerId: string,
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  const { success, subscriptions, error } = await listSubscriptionsByCustomer(
    customerId,
    'ACTIVE',
  );
  if (!success || error) return { success: false, error };
  const first = (subscriptions ?? []).find((s) => s.id);
  return first?.id
    ? { success: true, subscriptionId: first.id }
    : { success: true };
}

export async function reactivateSubscription(
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getAsaasSubscription(subscriptionId);
    if (!current.success) return current;
    if (
      !current.nextDueDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(current.nextDueDate)
    ) {
      return {
        success: false,
        error:
          'Não foi possível obter a data do próximo vencimento da assinatura.',
      };
    }

    const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
      `/subscriptions/${subscriptionId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'ACTIVE',
          nextDueDate: current.nextDueDate,
          endDate: null,
        }),
      },
    );
    if (!ok)
      return {
        success: false,
        error: asaasError(
          data as Record<string, unknown>,
          'Erro ao reativar assinatura',
        ),
      };

    // Sincroniza o histórico local: cancela pedidos de cancelamento agendado
    // e adiciona trilha explícita de reativação com data/hora.
    const auth = await getAuthenticatedUser();
    if (auth.success && auth.userId) {
      const supabase = await createSupabaseServerClient();
      const nowDate = nowFn();
      const nowIso = utcIsoFrom(nowDate);
      const nowBr = nowDate.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });
      const noteLine = `[Reactivation ${nowIso}] Assinatura reativada em ${nowBr}.`;

      // Reativação só deve afetar a linha agendada da assinatura atual.
      // Nunca propagar [Reactivation] para registros anteriores approved/renewed.
      const { data: pendingForSub } = await supabase
        .from('tb_upgrade_requests')
        .select('id, status, notes')
        .eq('profile_id', auth.userId)
        .eq('asaas_subscription_id', subscriptionId)
        .in('status', ['pending_cancellation', 'pending_downgrade'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingForSub?.id) {
        const mergedNotes = appendBillingNotesBlock(
          pendingForSub.notes,
          noteLine,
        );
        await supabase
          .from('tb_upgrade_requests')
          .update({
            status: 'approved',
            notes: mergedNotes,
            scheduled_cancel_at: null,
            updated_at: nowIso,
          })
          .eq('id', pendingForSub.id);
      }

      // Limpa scheduled_cancel_at nas demais linhas desta assinatura (sem duplicar nota).
      await supabase
        .from('tb_upgrade_requests')
        .update({
          scheduled_cancel_at: null,
          updated_at: nowIso,
        })
        .eq('profile_id', auth.userId)
        .eq('asaas_subscription_id', subscriptionId)
        .not('scheduled_cancel_at', 'is', null);
    }

    return { success: true };
  } catch (e) {
    console.error('[Asaas] reactivateSubscription:', e);
    return { success: false, error: 'Erro de conexão ao reativar assinatura' };
  }
}

/**
 * Re-dispara a cobrança pendente usando o cartão já salvo na assinatura (sem enviar PAN/CCV).
 * Equivale a PUT com `billingType: CREDIT_CARD` + `updatePendingPayments: true` sem payload de cartão.
 */
export async function retryPendingCreditCardSubscription(
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      billingType: 'CREDIT_CARD',
      updatePendingPayments: true,
    };
    const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
      `/subscriptions/${subscriptionId}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
    return ok
      ? { success: true }
      : {
          success: false,
          error: asaasError(
            data as Record<string, unknown>,
            'Erro ao retentar cobrança no cartão',
          ),
        };
  } catch (e) {
    console.error('[Asaas] retryPendingCreditCardSubscription:', e);
    return {
      success: false,
      error: 'Erro de conexão ao retentar cobrança',
    };
  }
}

export async function updateSubscriptionBillingMethod(
  subscriptionId: string,
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD',
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  } | null,
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone: string;
  } | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      billingType,
      updatePendingPayments: true,
    };
    if (billingType === 'BOLETO') {
      // Regerar boleto com validade curta (D+3 após vencimento).
      body.daysBeforeExpirationByBillingSelfRegistration =
        BOLETO_VALIDITY_DAYS_AFTER_DUE;
    }

    if (billingType === 'BOLETO' || billingType === 'PIX') {
      body.creditCard = null;
      body.creditCardHolderInfo = null;
    } else if (billingType === 'CREDIT_CARD') {
      if (!creditCard || !creditCardHolderInfo) {
        return {
          success: false,
          error:
            'Dados do cartão e do titular são obrigatórios para cartão de crédito.',
        };
      }
      body.creditCard = normalizeCreditCard({
        holderName: creditCard.holderName,
        number: creditCard.number,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      });
      body.creditCardHolderInfo = normalizeCreditCardHolderInfo({
        name: creditCardHolderInfo.name,
        email: creditCardHolderInfo.email,
        cpfCnpj: creditCardHolderInfo.cpfCnpj,
        postalCode: creditCardHolderInfo.postalCode,
        addressNumber: creditCardHolderInfo.addressNumber,
        addressComplement: creditCardHolderInfo.addressComplement,
        phone: creditCardHolderInfo.phone,
        mobilePhone: creditCardHolderInfo.mobilePhone,
      });
    }

    const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
      `/subscriptions/${subscriptionId}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
    return ok
      ? { success: true }
      : {
          success: false,
          error: asaasError(
            data as Record<string, unknown>,
            'Erro ao atualizar forma de pagamento',
          ),
        };
  } catch (e) {
    console.error('[Asaas] updateSubscriptionBillingMethod:', e);
    return {
      success: false,
      error: 'Erro de conexão ao atualizar forma de pagamento',
    };
  }
}

/**
 * Remove o endDate de uma assinatura no Asaas, reativando-a indefinidamente.
 * Usado quando o usuário cancela uma intenção de mudança agendada (pending_change).
 *
 * Envia endDate: null via PUT — o Asaas aceita null para limpar o campo.
 * Mantém nextDueDate inalterado para não perturbar o ciclo de cobrança.
 */
/**
 * Remove agendamento de fim de assinatura e força ACTIVE (ex.: após rollback de upgrade não pago).
 */
export async function clearAsaasSubscriptionScheduledEnd(
  subscriptionId: string,
  nextDueDateYYYYMMDD: string,
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDateYYYYMMDD))
    return { success: false, error: 'nextDueDate deve ser YYYY-MM-DD' };
  const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
    `/subscriptions/${subscriptionId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        status: 'ACTIVE',
        endDate: null,
        nextDueDate: nextDueDateYYYYMMDD,
      }),
    },
  );
  return ok
    ? { success: true }
    : {
        success: false,
        error: asaasError(
          data as Record<string, unknown>,
          'Erro ao remover encerramento agendado da assinatura',
        ),
      };
}

export async function removeAsaasSubscriptionEndDate(
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Busca nextDueDate atual para não sobrescrever acidentalmente
    const current = await getAsaasSubscription(subscriptionId);
    if (!current.success) {
      return { success: false, error: current.error };
    }

    const body: Record<string, unknown> = { endDate: null };

    // Repassar nextDueDate evita que o Asaas redefina a data para hoje
    if (
      current.nextDueDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(current.nextDueDate)
    ) {
      body.nextDueDate = current.nextDueDate;
    }

    const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
      `/subscriptions/${subscriptionId}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );

    return ok
      ? { success: true }
      : {
          success: false,
          error: asaasError(
            data as Record<string, unknown>,
            'Erro ao remover data de encerramento da assinatura',
          ),
        };
  } catch (e) {
    console.error('[Asaas] removeAsaasSubscriptionEndDate:', e);
    return {
      success: false,
      error: 'Erro de conexão ao remover data de encerramento',
    };
  }
}
