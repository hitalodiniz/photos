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

export async function getLatestPendingPaymentFromSubscription(
  subscriptionId: string,
): Promise<{
  success: boolean;
  paymentId?: string;
  dueDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    data?: Array<{
      id?: string;
      dueDate?: string;
      dateCreated?: string;
      invoiceUrl?: string;
      bankSlipUrl?: string;
    }>;
    errors?: unknown[];
  }>(`/subscriptions/${subscriptionId}/payments?status=PENDING`);
  if (!ok)
    return {
      success: false,
      error: 'Erro ao buscar cobrança pendente da assinatura',
    };

  const list = (data.data ?? [])
    .filter((p) => typeof p.id === 'string' && p.id.trim().length > 0)
    .sort((a, b) => {
      const aTs = Date.parse(String(a.dateCreated ?? ''));
      const bTs = Date.parse(String(b.dateCreated ?? ''));
      const left = Number.isNaN(aTs) ? 0 : aTs;
      const right = Number.isNaN(bTs) ? 0 : bTs;
      return right - left;
    });
  const p = list[0];
  if (!p?.id) return { success: true };
  return {
    success: true,
    paymentId: p.id,
    dueDate: p.dueDate,
    invoiceUrl: p.invoiceUrl,
    bankSlipUrl: p.bankSlipUrl,
  };
}

export async function createAsaasReplacementPayment(params: {
  customerId: string;
  subscriptionId: string;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
  value: number;
  dueDate: string;
  description: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  } | null;
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone: string;
  } | null;
}): Promise<{
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate?: string;
  error?: string;
}> {
  const body: Record<string, unknown> = {
    customer: params.customerId,
    subscription: params.subscriptionId,
    billingType: params.billingType,
    value: params.value,
    dueDate: params.dueDate,
    description: params.description,
  };
  if (params.billingType === 'CREDIT_CARD') {
    if (!params.creditCard || !params.creditCardHolderInfo) {
      return { success: false, error: 'Dados do cartão são obrigatórios.' };
    }
    body.creditCard = normalizeCreditCard(params.creditCard);
    body.creditCardHolderInfo = normalizeCreditCardHolderInfo(
      params.creditCardHolderInfo,
    );
  }

  const { ok, data } = await asaasRequest<{
    id?: string;
    dueDate?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    errors?: unknown[];
  }>('/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!ok || !data.id) {
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao gerar nova cobrança de regularização',
      ),
    };
  }
  return {
    success: true,
    paymentId: data.id,
    dueDate: data.dueDate,
    invoiceUrl: data.invoiceUrl,
    bankSlipUrl: data.bankSlipUrl,
  };
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
    data?: Array<{
      id?: string;
      status?: string;
      dueDate?: string;
      dateCreated?: string;
      invoiceUrl?: string;
      bankSlipUrl?: string;
      pixQrCodeUrl?: string;
    }>;
  }>(`/subscriptions/${subscriptionId}/payments`);
  if (!ok)
    return { success: false, error: 'Erro ao buscar pagamentos da assinatura' };

  const payments = data.data ?? [];
  if (!payments.length)
    return {
      success: false,
      error: 'Nenhum pagamento gerado para a assinatura',
    };

  // Prioriza a cobrança "pagável" mais recente:
  // 1) status PENDING
  // 2) status OVERDUE (quando ainda aceito)
  // 3) qualquer outro status
  const scored = payments
    .filter((p) => typeof p.id === 'string' && p.id.trim().length > 0)
    .map((p) => {
      const status = String(p.status ?? '').toUpperCase();
      const statusPriority =
        status === 'PENDING' ? 0 : status === 'OVERDUE' ? 1 : 2;
      const createdAtTs = Date.parse(String(p.dateCreated ?? ''));
      const dueDateTs = Date.parse(String(p.dueDate ?? ''));
      return {
        raw: p,
        statusPriority,
        createdAtTs: Number.isNaN(createdAtTs) ? 0 : createdAtTs,
        dueDateTs: Number.isNaN(dueDateTs) ? 0 : dueDateTs,
      };
    })
    .sort((a, b) => {
      if (a.statusPriority !== b.statusPriority) {
        return a.statusPriority - b.statusPriority;
      }
      if (a.createdAtTs !== b.createdAtTs) {
        return b.createdAtTs - a.createdAtTs;
      }
      return b.dueDateTs - a.dueDateTs;
    });

  const first = scored[0]?.raw ?? payments[0];
  const invoiceUrl = first?.invoiceUrl ?? null;
  const bankSlipUrl = first?.bankSlipUrl ?? null;
  const paymentUrl = invoiceUrl ?? bankSlipUrl ?? first?.pixQrCodeUrl ?? null;
  const dueDate =
    typeof first?.dueDate === 'string' &&
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

export async function updateAsaasPaymentValue(
  paymentId: string,
  value: number,
): Promise<{
  success: boolean;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate?: string;
  error?: string;
}> {
  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    return { success: false, error: 'Valor inválido para atualização da cobrança.' };
  }

  const { ok, data } = await asaasRequest<{
    invoiceUrl?: string;
    invoiceLink?: string;
    bankSlipUrl?: string;
    dueDate?: string;
    errors?: unknown[];
  }>(`/payments/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify({ value: normalizedValue }),
  });

  if (!ok) {
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao ajustar valor da cobrança',
      ),
    };
  }

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
