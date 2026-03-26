// src/core/services/asaas/api/payments.ts
'use server';

import { asaasRequest, asaasError } from './client';
import {
  normalizeCreditCard,
  normalizeCreditCardHolderInfo,
} from '../utils/formatters';
import type { CreateSubscriptionData } from '../types';
import type { BillingType } from '@/core/types/billing';

export async function getSubscriptionPayments(
  subscriptionId: string,
  statusFilter?: 'PENDING' | 'RECEIVED' | 'CONFIRMED',
): Promise<{
  success: boolean;
  payments?: Array<{ id: string; status?: string }>;
  error?: string;
}> {
  const path =
    statusFilter != null
      ? `/subscriptions/${subscriptionId}/payments?status=${statusFilter}`
      : `/subscriptions/${subscriptionId}/payments`;
  const { ok, data } = await asaasRequest<{
    data?: Array<{ id?: string; status?: string }>;
  }>(path);
  if (!ok)
    return { success: false, error: 'Erro ao buscar pagamentos da assinatura' };
  const list = (data.data ?? []).map((p) => ({
    id: p.id ?? '',
    status: p.status,
  }));
  return { success: true, payments: list };
}

export async function deletePendingPaymentsForSubscription(
  subscriptionId: string,
): Promise<{ deletedIds: string[]; errors: string[] }> {
  const deletedIds: string[] = [];
  const errors: string[] = [];
  const { success, payments, error } = await getSubscriptionPayments(
    subscriptionId,
    'PENDING',
  );
  if (!success || error) {
    errors.push(error ?? 'Falha ao listar pagamentos');
    return { deletedIds, errors };
  }
  const pending = (payments ?? []).filter((p) => p.id);
  for (const p of pending) {
    const res = await deleteAsaasPayment(p.id);
    if (res.success) {
      deletedIds.push(p.id);
      console.log('[Asaas] Upgrade gratuito: cobrança PENDING deletada', {
        subscriptionId,
        paymentId: p.id,
      });
    } else {
      errors.push(`${p.id}: ${res.error ?? 'Erro ao deletar'}`);
    }
  }
  if (deletedIds.length > 0) {
    console.log('[Asaas] Upgrade gratuito: cobranças PENDING deletadas', {
      subscriptionId,
      deletedPaymentIds: deletedIds,
    });
  }
  return { deletedIds, errors };
}

export async function getFirstPaymentFromSubscription(
  subscriptionId: string,
): Promise<{
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate?: string;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    data?: Array<Record<string, string>>;
  }>(`/subscriptions/${subscriptionId}/payments`);
  if (!ok)
    return { success: false, error: 'Erro ao buscar pagamentos da assinatura' };

  const payments = data.data ?? [];
  if (!payments.length)
    return {
      success: false,
      error: 'Nenhum pagamento gerado para a assinatura',
    };

  const first = payments[0];
  const invoiceUrl = first.invoiceUrl ?? null;
  const bankSlipUrl = first.bankSlipUrl ?? null;
  const paymentUrl = invoiceUrl ?? bankSlipUrl ?? first.pixQrCodeUrl ?? null;
  const dueDate =
    typeof first.dueDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(first.dueDate)
      ? first.dueDate.split('T')[0]
      : undefined;

  return {
    success: true,
    paymentId: first.id,
    paymentUrl: paymentUrl ?? undefined,
    invoiceUrl: invoiceUrl ?? undefined,
    bankSlipUrl: bankSlipUrl ?? undefined,
    dueDate,
  };
}

export async function createAsaasCreditCardPayment(
  customerId: string,
  value: number,
  dueDate: string,
  description: string,
  creditCardDetails: CreateSubscriptionData['creditCardDetails'],
  creditCardHolderInfo: CreateSubscriptionData['creditCardHolderInfo'],
): Promise<{
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  error?: string;
}> {
  if (!creditCardDetails || !creditCardHolderInfo) {
    return { success: false, error: 'Dados do cartão incompletos.' };
  }
  const { ok, data } = await asaasRequest<{
    id?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    errors?: unknown[];
  }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      dueDate,
      description,
      creditCard: normalizeCreditCard(creditCardDetails),
      creditCardHolderInfo: normalizeCreditCardHolderInfo(creditCardHolderInfo),
    }),
  });
  if (!ok || !data.id) {
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao criar cobrança no cartão',
      ),
    };
  }
  return {
    success: true,
    paymentId: data.id,
    invoiceUrl: data.invoiceUrl ?? data.bankSlipUrl ?? undefined,
  };
}

export async function getAsaasPaymentInvoiceUrl(
  paymentId: string,
): Promise<{ success: boolean; invoiceUrl?: string; error?: string }> {
  const { ok, data } = await asaasRequest<{
    invoiceUrl?: string;
    invoiceLink?: string;
    errors?: unknown[];
  }>(`/payments/${paymentId}`);
  if (!ok)
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao buscar pagamento',
      ),
    };
  const url = data.invoiceUrl ?? data.invoiceLink ?? null;
  return {
    success: true,
    invoiceUrl:
      typeof url === 'string' && url.startsWith('http') ? url : undefined,
  };
}

export async function getAsaasPaymentCheckoutUrls(
  paymentId: string,
): Promise<{
  success: boolean;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate?: string;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    invoiceUrl?: string;
    invoiceLink?: string;
    bankSlipUrl?: string;
    dueDate?: string;
    errors?: unknown[];
  }>(`/payments/${paymentId}`);
  if (!ok)
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao buscar pagamento',
      ),
    };
  const invoice = data.invoiceUrl ?? data.invoiceLink ?? null;
  const boleto = data.bankSlipUrl ?? null;
  return {
    success: true,
    ...(typeof invoice === 'string' && invoice.startsWith('http')
      ? { invoiceUrl: invoice }
      : {}),
    ...(typeof boleto === 'string' && boleto.startsWith('http')
      ? { bankSlipUrl: boleto }
      : {}),
    ...(typeof data.dueDate === 'string' ? { dueDate: data.dueDate } : {}),
  };
}

export async function getAsaasPaymentStatus(
  paymentId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  const { ok, data } = await asaasRequest<{
    status?: string;
    errors?: unknown[];
  }>(`/payments/${paymentId}`);
  if (!ok)
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao buscar status do pagamento',
      ),
    };
  return {
    success: true,
    status:
      typeof data.status === 'string' ? data.status.toUpperCase() : undefined,
  };
}

export async function getPaymentBillingInfo(paymentId: string): Promise<{
  success: boolean;
  billingType?: BillingType;
  cardLast4?: string;
  cardBrand?: string;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    billingType?: BillingType;
    creditCardNumber?: string;
    creditCardBrand?: string;
    errors?: unknown[];
  }>(`/payments/${paymentId}/billingInfo`);

  if (!ok)
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao buscar dados do método de pagamento',
      ),
    };

  const bt =
    typeof data.billingType === 'string'
      ? (data.billingType as BillingType)
      : undefined;
  const last4 =
    typeof data.creditCardNumber === 'string'
      ? data.creditCardNumber.trim()
      : undefined;
  const brand =
    typeof data.creditCardBrand === 'string'
      ? data.creditCardBrand.trim()
      : undefined;

  return {
    success: true,
    ...(bt && { billingType: bt }),
    ...(last4 && { cardLast4: last4 }),
    ...(brand && { cardBrand: brand }),
  };
}

export async function deleteAsaasPayment(
  paymentId: string,
): Promise<{ success: boolean; error?: string }> {
  const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
    `/payments/${paymentId}`,
    { method: 'DELETE' },
  );
  return ok
    ? { success: true }
    : {
        success: false,
        error: asaasError(
          data as Record<string, unknown>,
          'Erro ao cancelar cobrança',
        ),
      };
}
