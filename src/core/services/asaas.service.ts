// src/core/services/asaas.service.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { revalidateUserCache } from '@/actions/revalidate.actions';
import {
  PLANS_BY_SEGMENT,
  getPeriodPrice,
  MAX_GALLERIES_HARD_CAP_BY_PLAN,
  PIX_DISCOUNT_PERCENT,
  planOrder,
  type PlanKey,
  type SegmentType,
} from '@/core/config/plans';
import type {
  BillingPeriod,
  BillingProfile,
  BillingType,
  CancellationResult,
  ExpiredSubscriptionCheck,
  PaymentMethodSummary,
  UpgradePriceCalculation,
  UpgradePreviewResult,
  UpgradeRequestPayload,
  UpgradeRequestResult,
} from '@/core/types/billing';

// ─── Config ───────────────────────────────────────────────────────────────────

const ASAAS_API_URL =
  process.env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

function getAsaasApiKey(): string | null {
  return process.env.ASAAS_API_KEY?.trim() || null;
}

/** Chama a API do Asaas e retorna { ok, data }. Nunca lança — erros retornam ok=false. */
async function asaasRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data: T }> {
  const apiKey = getAsaasApiKey();
  if (!apiKey)
    return {
      ok: false,
      data: {
        errors: [
          {
            description:
              'Chave Asaas não configurada (ASAAS_API_KEY no .env.local).',
          },
        ],
      } as T,
    };

  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...options,
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function asaasError(data: Record<string, unknown>, fallback: string): string {
  const errors = data?.errors as Array<{ description?: string }> | undefined;
  return errors?.[0]?.description ?? fallback;
}

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface CreateCustomerData {
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  city: string;
  state: string;
}

export interface CreateSubscriptionData {
  customerId: string;
  billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX';
  cycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY';
  value: number;
  description: string;
  nextDueDate?: string;
  maxPayments?: number;
  installmentCount?: number;
  creditCardDetails?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone: string;
  };
}

// ─── Helpers de formatação de cartão ─────────────────────────────────────────

function normalizeCreditCard(
  details: CreateSubscriptionData['creditCardDetails'],
) {
  if (!details) return undefined;
  const expYear = details.expiryYear.replace(/\D/g, '');
  return {
    holderName: details.holderName,
    number: details.number.replace(/\D/g, ''),
    expiryMonth: details.expiryMonth
      .replace(/\D/g, '')
      .padStart(2, '0')
      .slice(-2),
    expiryYear:
      expYear.length <= 2
        ? `20${expYear.padStart(2, '0').slice(-2)}`
        : expYear.slice(-4),
    ccv: details.ccv.replace(/\D/g, ''),
  };
}

function normalizeCreditCardHolderInfo(
  info: CreateSubscriptionData['creditCardHolderInfo'],
) {
  if (!info) return undefined;
  return {
    name: info.name,
    email: info.email,
    cpfCnpj: info.cpfCnpj.replace(/\D/g, ''),
    postalCode: info.postalCode.replace(/\D/g, ''),
    addressNumber: info.addressNumber,
    addressComplement: info.addressComplement ?? null,
    phone: info.phone.replace(/\D/g, '') || null,
    mobilePhone: info.mobilePhone.replace(/\D/g, '') || null,
  };
}

// ─── 1. Criar ou recuperar cliente Asaas ─────────────────────────────────────
/**
 * Reutiliza o cliente já vinculado ao perfil (existingAsaasCustomerId) quando disponível.
 * Caso contrário, busca por CPF; só reutiliza se o e-mail bater (evita gravar pagamento em conta errada).
 */
export async function createOrUpdateAsaasCustomer(
  data: CreateCustomerData,
  existingAsaasCustomerId?: string | null,
) {
  const apiKey = getAsaasApiKey();
  if (!apiKey)
    return {
      success: false,
      error: 'Chave Asaas não configurada (ASAAS_API_KEY no .env.local).',
    };

  if (existingAsaasCustomerId?.trim()) {
    return {
      success: true,
      customerId: existingAsaasCustomerId.trim(),
      isNew: false,
    };
  }

  try {
    const cpfDigits = data.cpfCnpj.replace(/\D/g, '');
    const { ok: searchOk, data: searchData } = await asaasRequest<{
      data?: Array<{ id: string; email?: string }>;
    }>(`/customers?cpfCnpj=${cpfDigits}`);

    if (searchOk && searchData.data?.length) {
      const currentEmail = data.email.trim().toLowerCase();
      const byEmail = searchData.data.find(
        (c) => (c.email ?? '').trim().toLowerCase() === currentEmail,
      );
      if (byEmail)
        return { success: true, customerId: byEmail.id, isNew: false };
      // Mesmo CPF, e-mail diferente → cria novo cliente para este perfil
    }

    const { ok, data: customer } = await asaasRequest<{
      id?: string;
      errors?: unknown[];
    }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        cpfCnpj: cpfDigits,
        phone: data.phone.replace(/\D/g, ''),
        mobilePhone: data.phone.replace(/\D/g, ''),
        postalCode: data.postalCode.replace(/\D/g, ''),
        address: data.address,
        addressNumber: data.addressNumber,
        complement: data.complement,
        province: data.province,
        city: data.city,
        state: data.state,
        notificationDisabled: false,
      }),
    });

    if (!ok || !customer.id) {
      return {
        success: false,
        error: asaasError(
          customer as Record<string, unknown>,
          'Erro ao criar cliente no Asaas',
        ),
      };
    }
    return { success: true, customerId: customer.id, isNew: true };
  } catch (e) {
    console.error('[Asaas] createOrUpdateAsaasCustomer:', e);
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
    };
  }
}

// ─── 2. Criar assinatura recorrente ──────────────────────────────────────────

export async function createAsaasSubscription(data: CreateSubscriptionData) {
  try {
    const nextDueDate =
      data.nextDueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.nextDueDate)
        ? data.nextDueDate
        : new Date().toISOString().split('T')[0];

    const body: Record<string, unknown> = {
      customer: data.customerId,
      billingType: data.billingType,
      cycle: data.cycle,
      value: data.value,
      description: data.description,
      nextDueDate,
    };

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

// ─── 3. Atualizar nextDueDate de uma assinatura ───────────────────────────────

async function updateAsaasSubscriptionNextDueDate(
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

/** PUT /v3/subscriptions/{id} com value, description, nextDueDate e opcional updatePendingPayments. */
async function updateAsaasSubscriptionPlanAndDueDate(
  subscriptionId: string,
  params: {
    value: number;
    description: string;
    nextDueDate: string;
    /** false quando cobranças PENDING foram deletadas manualmente antes do PUT. */
    updatePendingPayments?: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  const { value, description, nextDueDate, updatePendingPayments } = params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate))
    return { success: false, error: 'nextDueDate deve ser YYYY-MM-DD' };
  const body: Record<string, unknown> = {
    value,
    description,
    nextDueDate,
  };
  if (updatePendingPayments === false) body.updatePendingPayments = false;
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

// ─── 4. Definir endDate (cancelamento agendado) ───────────────────────────────

async function setAsaasSubscriptionEndDate(
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

// ─── 5. Buscar primeiro pagamento / listar pagamentos de uma assinatura ───────

/** Lista assinaturas do cliente no Asaas (GET /v3/subscriptions?customer=xxx). Usado quando o plano atual veio de upgrade gratuito e asaas_subscription_id está nulo no banco. */
async function listSubscriptionsByCustomer(
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

/**
 * Retorna o ID da primeira assinatura ACTIVE do cliente.
 * Usado em upgrade gratuito quando currentRequest e lastPaid não têm asaas_subscription_id (ex.: migrações sucessivas).
 */
async function getActiveSubscriptionIdForCustomer(
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

/** Lista pagamentos da assinatura; opcionalmente filtra por status (ex.: PENDING). */
async function getSubscriptionPayments(
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

/**
 * Remove todos os pagamentos PENDING da assinatura (ex.: cobrança antiga de R$ 79 em 12/04).
 * Usado antes do PUT da assinatura em upgrade/downgrade com valor zero, para que o Asaas
 * agende uma nova cobrança na nextDueDate atualizada.
 */
async function deletePendingPaymentsForSubscription(
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
      console.log(
        '[Asaas] Upgrade gratuito: cobrança PENDING deletada',
        { subscriptionId, paymentId: p.id },
      );
    } else {
      errors.push(`${p.id}: ${res.error ?? 'Erro ao deletar'}`);
    }
  }
  if (deletedIds.length > 0) {
    console.log(
      '[Asaas] Upgrade gratuito: cobranças PENDING deletadas',
      { subscriptionId, deletedPaymentIds: deletedIds },
    );
  }
  return { deletedIds, errors };
}

async function getFirstPaymentFromSubscription(
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

// ─── 6. Cobrança avulsa com cartão (diferença quando crédito cobre N meses) ──

async function createAsaasCreditCardPayment(
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

// ─── 7. Buscar QR Code PIX de um pagamento ───────────────────────────────────

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

/** Busca QR Code PIX (imagem base64 + payload copia e cola) para um pagamento. */
async function getPixQrCodeFromPayment(
  paymentId: string,
): Promise<{
  success: boolean;
  encodedImage?: string;
  payload?: string;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    encodedImage?: string;
    payload?: string;
    errors?: unknown[];
  }>(`/payments/${paymentId}/pixQrCode`);
  if (!ok)
    return {
      success: false,
      error: asaasError(
        data as Record<string, unknown>,
        'Erro ao buscar QR Code PIX',
      ),
    };
  return {
    success: true,
    encodedImage:
      typeof data.encodedImage === 'string' ? data.encodedImage : undefined,
    payload: typeof data.payload === 'string' ? data.payload : undefined,
  };
}

async function getAsaasPaymentStatus(
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

/**
 * Busca informações de cobrança de um pagamento (ex.: últimos 4 dígitos do cartão).
 * Usa o endpoint /payments/{id}/billingInfo do Asaas.
 */
async function getPaymentBillingInfo(
  paymentId: string,
): Promise<{
  success: boolean;
  billingType?: BillingType;
  cardLast4?: string;
  cardBrand?: string;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    billingType?: BillingType;
    creditCardNumber?: string; // Asaas retorna apenas os 4 últimos dígitos
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

// ─── 8. Upsert Billing Profile ────────────────────────────────────────────────

export async function upsertBillingProfile(
  profileId: string,
  data: Omit<
    BillingProfile,
    'id' | 'cpf_cnpj_type' | 'created_at' | 'updated_at'
  >,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('tb_billing_profiles').upsert(
    {
      id: profileId,
      full_name: data.full_name ?? null,
      cpf_cnpj: data.cpf_cnpj,
      postal_code: data.postal_code,
      address: data.address,
      address_number: data.address_number,
      complement: data.complement ?? null,
      province: data.province,
      city: data.city,
      state: data.state,
      ...(data.asaas_customer_id != null && {
        asaas_customer_id: data.asaas_customer_id,
      }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: false },
  );
  if (error) {
    console.error('[DB] Erro ao salvar billing profile:', error);
    return { success: false, error: 'Erro ao salvar dados fiscais' };
  }
  return { success: true };
}

// ─── 9. Helpers de data / cálculo ────────────────────────────────────────────

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(n));
  return d;
}

function billingPeriodToMonths(period: string | null | undefined): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

function periodOrder(p: BillingPeriod): number {
  if (p === 'annual') return 12;
  if (p === 'semiannual') return 6;
  return 1;
}

/**
 * Extrai a data de vencimento gravada nas notes pelo fluxo de upgrade gratuito.
 * Formato: "Nova data de vencimento: <ISO>".
 */
function parseExpiryFromNotes(notes: string | null | undefined): Date | null {
  if (!notes?.trim()) return null;
  const match = notes.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1].trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ano comercial: 30 dias/mês, sem variação por calendário. Usado em todos os cálculos pro-rata. */
const COMMERCIAL_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  semiannual: 180,
  annual: 360,
};

function billingPeriodToCommercialDays(
  period: string | null | undefined,
): 30 | 180 | 360 {
  const p = (period ?? 'monthly') as BillingPeriod;
  return (COMMERCIAL_DAYS[p] ?? 30) as 30 | 180 | 360;
}

function formatSnapshotAddress(data: {
  address: string;
  address_number: string;
  complement?: string;
  province: string;
  city: string;
  state: string;
  postal_code: string;
}): string {
  return `${data.address}, ${data.address_number}${data.complement ? ` – ${data.complement}` : ''}, ${data.province}, ${data.city}/${data.state} – ${data.postal_code}`;
}

// ─── 10. requestUpgrade ───────────────────────────────────────────────────────

export async function requestUpgrade(
  payload: UpgradeRequestPayload,
): Promise<UpgradeRequestResult> {
  const apiKey = getAsaasApiKey();
  if (!apiKey) {
    return {
      success: false,
      error:
        'Configuração de pagamento indisponível. Configure ASAAS_API_KEY no .env.local e reinicie o servidor.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    success: authOk,
    profile,
    userId,
    email,
  } = await getAuthenticatedUser();
  if (!authOk || !profile || !userId)
    return { success: false, error: 'Usuário não autenticado' };

  const segment = (payload.segment ?? 'PHOTOGRAPHER') as SegmentType;
  const planKey = payload.plan_key_requested as PlanKey;
  const planInfo = PLANS_BY_SEGMENT[segment]?.[planKey];
  if (!planInfo || planInfo.price <= 0)
    return { success: false, error: 'Plano inválido ou gratuito' };

  const planKeyCurrent = ((profile.plan_key &&
    String(profile.plan_key).toUpperCase()) ??
    'FREE') as PlanKey;

  // Usuário isento no mesmo plano → sem cobrança
  if (profile.is_exempt === true && planKey === planKeyCurrent)
    return { success: true, billing_type: 'PIX' };

  const billingPeriod: BillingPeriod = payload.billing_period ?? 'monthly';

  // Cancelar solicitação pendente anterior (exceto mesmo PIX em re-tentativa)
  const pendingRequest = await getPendingUpgradeRequest(userId, supabase);
  const isSamePendingPix =
    pendingRequest?.billing_type === 'PIX' &&
    pendingRequest.plan_key_requested === planKey &&
    pendingRequest.billing_period === billingPeriod;
  let paymentAlreadyReceivedWarning = false;

  if (pendingRequest && !isSamePendingPix) {
    const cancelResult = await cancelPendingUpgradeInAsaasAndDb(
      pendingRequest,
      supabase,
    );
    if (!cancelResult.success)
      return {
        success: false,
        error:
          cancelResult.error ??
          'Não foi possível invalidar a cobrança anterior. Tente novamente em instantes.',
      };
    paymentAlreadyReceivedWarning =
      cancelResult.paymentAlreadyReceived === true;
  }

  // Crédito residual: zerado para FREE e para isentos (sem reaproveitamento de planos cancelados)
  let currentRequest = await getCurrentActiveRequest(
    userId,
    planKeyCurrent,
    supabase,
  );
  if (planKeyCurrent === 'FREE' || profile.is_exempt === true)
    currentRequest = null;

  // Se o plano atual veio de aproveitamento de crédito (amount_final === 0), usar o valor
  // da última transação paga em dinheiro como base do pró-rata (ex.: R$ 79 do Pro, não R$ 49 do Plus).
  let lastPaidAmountForProRata: number | undefined;
  if (currentRequest && currentRequest.amount_final === 0) {
    const lastPaid = await getLastPaidUpgradeRequest(userId, supabase);
    if (lastPaid && lastPaid.amount_final > 0)
      lastPaidAmountForProRata = lastPaid.amount_final;
  }

  const calculation = await calculateUpgradePrice(
    currentRequest,
    planKey,
    billingPeriod,
    payload.billing_type,
    segment,
    planKeyCurrent,
    lastPaidAmountForProRata,
  );

  if (calculation.type === 'current_plan') {
    return {
      success: false,
      error:
        'Este já é seu plano atual. Não é possível assinar novamente o mesmo plano e período.',
    };
  }

  const billingFullName = payload.full_name?.trim() ?? profile.full_name ?? '';
  const snapshot_address = formatSnapshotAddress(payload);

  // ── Upgrade Gratuito (saldo cobre o plano inteiro) ────────────────────────
  // Não gera cobrança no Asaas. Primeiro sincroniza com Asaas (DELETE PENDING + PUT), depois grava no banco com notes de auditoria.
  // Em migrações sucessivas o currentRequest pode ter asaas_subscription_id nulo (ex.: plano Plus veio de upgrade gratuito); resolve via lastPaid ou API por customer.
  if (calculation.is_free_upgrade && calculation.amount_final === 0) {
    const now = new Date().toISOString();
    const planDescription = `Plano ${planInfo.name}`;
    const nextDueStr = calculation.new_expiry_date?.split('T')[0];
    let asaasSubId: string | null =
      currentRequest?.asaas_subscription_id?.trim() ?? null;
    if (!asaasSubId) {
      const lastPaid = await getLastPaidUpgradeRequest(userId, supabase);
      asaasSubId = lastPaid?.asaas_subscription_id?.trim() ?? null;
    }
    if (!asaasSubId) {
      const { data: billingRow } = await supabase
        .from('tb_billing_profiles')
        .select('asaas_customer_id')
        .eq('id', userId)
        .maybeSingle();
      const customerId = billingRow?.asaas_customer_id?.trim();
      if (customerId) {
        const res = await getActiveSubscriptionIdForCustomer(customerId);
        if (res.success && res.subscriptionId)
          asaasSubId = res.subscriptionId;
      }
    }
    const value = getPeriodPrice(planInfo, billingPeriod).totalPrice;

    let notesAsaasSync = '';
    let deletedPaymentIds: string[] = [];
    let putSuccess = false;

    // 1) Executar DELETE e PUT no Asaas ANTES do insert, para registrar os IDs reais nas notes.
    if (asaasSubId && nextDueStr && /^\d{4}-\d{2}-\d{2}$/.test(nextDueStr)) {
      const deleteResult = await deletePendingPaymentsForSubscription(asaasSubId);
      deletedPaymentIds = deleteResult.deletedIds;

      const putResult = await updateAsaasSubscriptionPlanAndDueDate(asaasSubId, {
        value,
        description: planDescription,
        nextDueDate: nextDueStr,
        updatePendingPayments: false,
      });
      putSuccess = putResult.success;
      if (!putResult.success) {
        console.error(
          '[Asaas] Upgrade gratuito: falha ao atualizar assinatura (value/description/nextDueDate):',
          putResult.error,
        );
      }

      const pendingRemoved =
        deletedPaymentIds.length > 0
          ? deletedPaymentIds.join(', ')
          : 'Nenhuma';
      const statusLine = putSuccess
        ? 'Sincronizado com sucesso.'
        : `Falha no PUT: ${putResult.error ?? 'erro desconhecido'}`;
      notesAsaasSync = `\nSincronização Asaas realizada:\n- Assinatura ${asaasSubId} atualizada para R$ ${value.toFixed(2)} (Vencimento: ${nextDueStr}).\n- Cobranças PENDING removidas: ${pendingRemoved}.\n- Status: ${statusLine}.`;
    } else {
      notesAsaasSync =
        '\nSincronização Asaas: não aplicável (sem assinatura anterior com nextDueDate válida).';
    }

    const notes =
      `Upgrade gratuito (Crédito): ${planDescription}.\n` +
      `Saldo residual R$ ${calculation.residual_credit.toFixed(2)}; nova data de vencimento: ${calculation.new_expiry_date ?? 'N/A'}.\n` +
      notesAsaasSync.trimStart();

    const { data: freeRow, error: freeErr } = await supabase
      .from('tb_upgrade_requests')
      .insert({
        profile_id: userId,
        plan_key_current: planKeyCurrent,
        plan_key_requested: planKey,
        billing_type: payload.billing_type,
        billing_period: billingPeriod,
        snapshot_name: billingFullName || (profile.full_name ?? ''),
        snapshot_cpf_cnpj: payload.cpf_cnpj,
        snapshot_email: email ?? '',
        snapshot_whatsapp: payload.whatsapp,
        snapshot_address,
        asaas_customer_id: null,
        asaas_subscription_id: asaasSubId,
        asaas_payment_id: null,
        payment_url: null,
        amount_original: calculation.amount_original,
        amount_discount: calculation.amount_discount,
        amount_final: 0,
        installments: 1,
        status: 'approved',
        processed_at: now,
        notes,
      })
      .select('id')
      .single();

    if (freeErr)
      return {
        success: false,
        error: 'Erro ao registrar upgrade gratuito. Tente novamente.',
      };

    await supabase
      .from('tb_profiles')
      .update({ plan_key: planKey, updated_at: now })
      .eq('id', userId);

    await revalidateUserCache(userId).catch((e) =>
      console.warn('[Upgrade gratuito] revalidateUserCache:', e),
    );
    return {
      success: true,
      billing_type: payload.billing_type,
      request_id: freeRow?.id,
    };
  }

  // ── Upgrade pago ──────────────────────────────────────────────────────────
  const {
    amount_original: amountOriginal,
    amount_discount: amountDiscount,
    amount_final: amountFinal,
  } = calculation;

  /** Crédito cobre N meses: cobrar apenas a diferença agora; assinatura começa em new_expiry_date. */
  const hasCreditNextDueDate =
    Boolean(calculation.new_expiry_date) &&
    amountFinal > 0 &&
    !calculation.is_free_upgrade;
  // Notas de crédito pro-rata devem ser registradas **apenas** quando há, de fato,
  // reaproveitamento de um contrato anterior (residual_credit > 0). Descontos
  // promocionais, como PIX, não devem gerar essa anotação.
  const residualCreditValue = calculation.residual_credit ?? 0;
  const hasResidualCredit = residualCreditValue > 0;
  const notesCredit =
    hasResidualCredit && amountDiscount > 0
      ? `Aproveitamento de crédito pro-rata: R$ ${residualCreditValue.toFixed(2)} (dias não utilizados do plano anterior). Desconto total aplicado: R$ ${amountDiscount.toFixed(2)}. Valor final cobrado: R$ ${amountFinal.toFixed(2)}.${hasCreditNextDueDate && calculation.new_expiry_date ? ` Próximo vencimento do plano: ${calculation.new_expiry_date.split('T')[0]}. Nova data de vencimento: ${calculation.new_expiry_date}.` : ''}`
      : null;

  const isCreditCard = payload.billing_type === 'CREDIT_CARD';
  // Cartão só é obrigatório quando há valor a pagar agora.
  const requiresCardData = isCreditCard && calculation.amount_final > 0;
  if (requiresCardData) {
    const c = payload.credit_card;
    if (
      !c?.credit_card_holder_name?.trim() ||
      !c?.credit_card_number?.replace(/\D/g, '') ||
      !c?.credit_card_expiry_month ||
      !c?.credit_card_expiry_year ||
      !c?.credit_card_ccv
    ) {
      return {
        success: false,
        error:
          'Dados do cartão de crédito são obrigatórios para esta forma de pagamento.',
      };
    }
  }

  const maxInstallments =
    isCreditCard && billingPeriod === 'semiannual'
      ? 3
      : isCreditCard && billingPeriod === 'annual'
        ? 6
        : 1;
  const installments = Math.min(
    Math.max(1, payload.installments ?? 1),
    maxInstallments,
  );

  // 1. Upsert billing profile
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

  // 2. Buscar asaas_customer_id salvo e criar/recuperar cliente
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
  if (!customerResult.success || !customerResult.customerId) {
    return {
      success: false,
      error: customerResult.error ?? 'Erro ao criar cliente no gateway',
    };
  }
  const asaasCustomerId = customerResult.customerId;

  // 3. Persistir asaas_customer_id
  await supabase
    .from('tb_billing_profiles')
    .update({
      asaas_customer_id: asaasCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // 4. Montar payload do cartão (se cartão)
  let creditCardDetails: CreateSubscriptionData['creditCardDetails'];
  let creditCardHolderInfo: CreateSubscriptionData['creditCardHolderInfo'];
  if (isCreditCard && payload.credit_card) {
    const c = payload.credit_card;
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

  // 5. Cobrança avulsa da diferença (cartão com crédito cobrindo N meses)
  let oneOffPaymentId: string | null = null;
  let oneOffInvoiceUrl: string | null = null;
  if (
    hasCreditNextDueDate &&
    isCreditCard &&
    creditCardDetails &&
    creditCardHolderInfo
  ) {
    const oneOff = await createAsaasCreditCardPayment(
      asaasCustomerId,
      amountFinal,
      new Date().toISOString().split('T')[0],
      `Plano ${planInfo.name}`,
      creditCardDetails,
      creditCardHolderInfo,
    );
    if (!oneOff.success || !oneOff.paymentId)
      return {
        success: false,
        error: oneOff.error ?? 'Erro ao cobrar diferença no cartão',
      };
    oneOffPaymentId = oneOff.paymentId;
    oneOffInvoiceUrl = oneOff.invoiceUrl ?? null;
  }

  // 6. Criar assinatura recorrente
  const asaasCycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' =
    billingPeriod === 'annual'
      ? 'YEARLY'
      : billingPeriod === 'semiannual'
        ? 'SEMIANNUALLY'
        : 'MONTHLY';
  const planPricePerPeriod = getPeriodPrice(planInfo, billingPeriod).totalPrice;
  const nextDueDateStr =
    hasCreditNextDueDate && calculation.new_expiry_date
      ? calculation.new_expiry_date.split('T')[0]
      : undefined;

  const subResult = await createAsaasSubscription({
    customerId: asaasCustomerId,
    billingType: payload.billing_type,
    cycle: asaasCycle,
    // Assinatura recorrente usa valor cheio do período; cobrança da diferença já foi feita avulsa
    value:
      hasCreditNextDueDate && isCreditCard ? planPricePerPeriod : amountFinal,
    description: `Plano ${planInfo.name}`,
    ...(nextDueDateStr && { nextDueDate: nextDueDateStr }),
    installmentCount: installments > 1 ? installments : undefined,
    ...(creditCardDetails && { creditCardDetails }),
    ...(creditCardHolderInfo && { creditCardHolderInfo }),
  });

  if (!subResult.success || !subResult.subscriptionId) {
    return {
      success: false,
      error: subResult.error ?? 'Erro ao criar assinatura',
    };
  }
  const asaasSubscriptionId = subResult.subscriptionId;

  // 7. Buscar primeiro pagamento para obter payment_url
  const paymentResult =
    await getFirstPaymentFromSubscription(asaasSubscriptionId);
  let asaasPaymentId: string | null = oneOffPaymentId;
  let paymentUrl: string | null = oneOffInvoiceUrl;
  let paymentDueDate: string | undefined;

  if (!asaasPaymentId || !paymentUrl) {
    if (paymentResult.success) {
      asaasPaymentId = asaasPaymentId ?? paymentResult.paymentId ?? null;
      paymentUrl =
        payload.billing_type === 'BOLETO'
          ? (paymentResult.bankSlipUrl ??
            paymentResult.paymentUrl ??
            subResult.bankSlipUrl ??
            subResult.invoiceUrl ??
            null)
          : (paymentUrl ??
            paymentResult.paymentUrl ??
            subResult.invoiceUrl ??
            subResult.bankSlipUrl ??
            null);
      paymentDueDate = paymentResult.dueDate;
    } else {
      paymentUrl =
        paymentUrl ?? subResult.invoiceUrl ?? subResult.bankSlipUrl ?? null;
    }
  } else if (paymentResult.success && paymentResult.dueDate) {
    paymentDueDate = paymentResult.dueDate;
  }

  // 8. Registrar solicitação no banco
  const { data: insertRow, error: insertError } = await supabase
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: planKeyCurrent,
      plan_key_requested: planKey,
      billing_type: payload.billing_type,
      billing_period: billingPeriod,
      snapshot_name: billingFullName || (profile.full_name ?? ''),
      snapshot_cpf_cnpj: payload.cpf_cnpj,
      snapshot_email: email ?? '',
      snapshot_whatsapp: payload.whatsapp,
      snapshot_address,
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: asaasSubscriptionId,
      asaas_payment_id: asaasPaymentId,
      payment_url: paymentUrl,
      amount_original: amountOriginal,
      amount_discount: amountDiscount,
      amount_final: amountFinal,
      installments,
      status: 'pending',
      ...(notesCredit && { notes: notesCredit }),
    })
    .select('id')
    .single();

  if (insertError) {
    const msg =
      insertError.message ??
      (typeof insertError === 'object'
        ? JSON.stringify(insertError)
        : String(insertError));
    return {
      success: false,
      error:
        process.env.NODE_ENV === 'development'
          ? `Erro ao registrar solicitação: ${msg}`
          : 'Erro ao registrar solicitação. Tente novamente.',
    };
  }

  // Garantir nextDueDate correto na assinatura quando há crédito pro-rata
  if (hasCreditNextDueDate && calculation.new_expiry_date) {
    const nds = calculation.new_expiry_date.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(nds)) {
      await updateAsaasSubscriptionNextDueDate(asaasSubscriptionId, nds).catch(
        (e) =>
          console.error(
            '[Asaas] Falha ao atualizar nextDueDate após insert:',
            e,
          ),
      );
    }
  }

  // PIX: buscar QR Code (imagem base64 + payload copia e cola) para exibir na tela
  let pixQrCodeBase64: string | undefined;
  let pixCopyPaste: string | undefined;
  if (payload.billing_type === 'PIX' && asaasPaymentId) {
    const pixQr = await getPixQrCodeFromPayment(asaasPaymentId);
    if (pixQr.success) {
      pixQrCodeBase64 = pixQr.encodedImage;
      pixCopyPaste = pixQr.payload;
    }
  }

  return {
    success: true,
    payment_url: paymentUrl ?? undefined,
    billing_type: payload.billing_type,
    request_id: insertRow?.id,
    ...(paymentDueDate && { payment_due_date: paymentDueDate }),
    ...(pixQrCodeBase64 && { pix_qr_code_base64: pixQrCodeBase64 }),
    ...(pixCopyPaste && { pix_copy_paste: pixCopyPaste }),
    ...(paymentAlreadyReceivedWarning && {
      warning:
        'Pagamento já identificado. O valor será utilizado como crédito para o novo plano.',
    }),
  };
}

// ─── 11. Crédito pro-rata e cálculo de upgrade ───────────────────────────────

/**
 * Crédito pro-rata (ano comercial 30/180/360).
 * credit = (currentAmount / totalDays) * min(remainingDays, totalDays)
 */
export async function calculateProRataCredit(
  currentAmount: number,
  totalDays: 30 | 180 | 360,
  remainingDays: number,
): Promise<number> {
  if (totalDays <= 0 || remainingDays <= 0) return 0;
  return (
    Math.round(
      (currentAmount / totalDays) * Math.min(remainingDays, totalDays) * 100,
    ) / 100
  );
}

export interface CurrentActiveRequestRow {
  id: string;
  amount_final: number;
  processed_at: string | null;
  billing_period: string | null;
  plan_key_requested: string;
  asaas_subscription_id?: string | null;
  notes?: string | null;
}

/**
 * Busca a solicitação aprovada que representa o plano ativo do usuário.
 * Preferência: a que ainda esteja dentro do período vigente.
 * Se nenhuma estiver, retorna a mais recente (para cálculo sem crédito).
 */
export async function getCurrentActiveRequest(
  userId: string,
  currentPlanKey: PlanKey,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CurrentActiveRequestRow | null> {
  if (!currentPlanKey || currentPlanKey === 'FREE') return null;

  const db = supabase ?? (await createSupabaseServerClient());
  const { data: rows } = await db
    .from('tb_upgrade_requests')
    .select(
      'id, amount_final, processed_at, billing_period, plan_key_requested, asaas_subscription_id, notes',
    )
    .eq('profile_id', userId)
    .eq('status', 'approved')
    .eq('plan_key_requested', currentPlanKey)
    .order('processed_at', { ascending: false })
    .limit(10);

  const list = (rows ?? []) as CurrentActiveRequestRow[];
  if (!list.length) return null;

  const now = new Date();
  for (const row of list) {
    if (!row?.processed_at) continue;
    const start = new Date(row.processed_at);
    let end = addMonths(start, billingPeriodToMonths(row.billing_period));
    const fromNotes = parseExpiryFromNotes(row.notes);
    if (fromNotes) end = fromNotes;
    if (end >= now) return row;
  }
  return list[0];
}

/**
 * Último request aprovado com pagamento efetivo (amount_final > 0).
 * Usado quando o plano atual veio de "aproveitamento de crédito" (amount_final === 0)
 * para calcular o residual sobre o valor realmente pago em dinheiro e, se necessário,
 * obter o asaas_subscription_id para sincronização com o Asaas em migrações sucessivas.
 */
export async function getLastPaidUpgradeRequest(
  userId: string,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ amount_final: number; asaas_subscription_id?: string | null } | null> {
  const db = supabase ?? (await createSupabaseServerClient());
  const { data: row } = await db
    .from('tb_upgrade_requests')
    .select('amount_final, asaas_subscription_id')
    .eq('profile_id', userId)
    .eq('status', 'approved')
    .gt('amount_final', 0)
    .order('processed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return row && typeof row.amount_final === 'number' ? row : null;
}

const PENDING_UPGRADE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PendingUpgradeRow {
  id: string;
  created_at: string;
  plan_key_requested: string;
  billing_type: string;
  billing_period: string | null;
  asaas_subscription_id?: string | null;
  asaas_payment_id?: string | null;
}

/**
 * Retorna a solicitação pendente mais recente (últimas 24h).
 * Usada para bloquear nova assinatura enquanto há pagamento em processamento.
 */
export async function getPendingUpgradeRequest(
  userId: string,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<PendingUpgradeRow | null> {
  const db = supabase ?? (await createSupabaseServerClient());
  const since = new Date(Date.now() - PENDING_UPGRADE_MAX_AGE_MS).toISOString();
  const { data } = await db
    .from('tb_upgrade_requests')
    .select(
      'id, created_at, plan_key_requested, billing_type, billing_period, asaas_subscription_id, asaas_payment_id',
    )
    .eq('profile_id', userId)
    .eq('status', 'pending')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PendingUpgradeRow | null;
}

/**
 * Cancela uma solicitação pendente no Asaas e marca como 'cancelled' no banco.
 * Não cancela no Asaas se o pagamento já foi recebido/confirmado (evita estorno/taxas).
 */
async function cancelPendingUpgradeInAsaasAndDb(
  pending: PendingUpgradeRow,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  success: boolean;
  paymentAlreadyReceived?: boolean;
  error?: string;
}> {
  const subId = pending.asaas_subscription_id?.trim();
  let payId = pending.asaas_payment_id?.trim();

  if (!payId && subId) {
    const first = await getFirstPaymentFromSubscription(subId);
    if (first.success && first.paymentId) payId = first.paymentId;
  }

  // Se pagamento já recebido, apenas marca no banco sem cancelar no Asaas
  if (payId) {
    const statusRes = await getAsaasPaymentStatus(payId);
    if (statusRes.success && statusRes.status) {
      const s = statusRes.status;
      if (s === 'RECEIVED' || s === 'CONFIRMED') {
        const { error } = await supabase
          .from('tb_upgrade_requests')
          .update({
            status: 'cancelled',
            notes:
              'Invalidado para nova solicitação (pagamento já identificado no Asaas; valor será utilizado como crédito).',
            updated_at: new Date().toISOString(),
          })
          .eq('id', pending.id);
        return error
          ? { success: false, error: 'Erro ao atualizar solicitação anterior.' }
          : { success: true, paymentAlreadyReceived: true };
      }
    }
  }

  // Cancelar no Asaas
  if (subId) {
    const res = await cancelAsaasSubscriptionById(subId);
    if (!res.success) return { success: false, error: res.error };
  } else if (payId) {
    const res = await deleteAsaasPayment(payId);
    if (!res.success) return { success: false, error: res.error };
  }

  const { error } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes:
        'Invalidado para nova solicitação (usuário alterou plano/ciclo/método de pagamento).',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pending.id);
  return error
    ? { success: false, error: 'Erro ao atualizar solicitação anterior.' }
    : { success: true };
}

/**
 * Calcula o valor de upgrade com pro-rata (ano comercial 30/180/360 dias).
 *
 * Classificação:
 * - upgrade: plano alvo ACIMA na hierarquia (planOrder), independente de valor
 * - current_plan: mesmo plano + mesmo período → bloqueado
 * - downgrade: plano inferior OU mesmo plano com período menor → efetivado no vencimento
 *
 * Upgrade gratuito (crédito ≥ preço novo período):
 * - amount_final = 0, nenhuma cobrança no Asaas
 * - new_expiry_date = startDate + daysExtended (crédito dividido pelo preço diário)
 *
 * @param currentPlanKeyFromProfile plano atual em tb_profiles.plan_key (evita histórico desatualizado)
 * @param lastPaidAmountForProRata quando o plano atual veio de aproveitamento de crédito (amount_final === 0), valor pago na última transação (base do pró-rata)
 */
export async function calculateUpgradePrice(
  currentRequest: CurrentActiveRequestRow | null,
  targetPlanKey: PlanKey,
  targetPeriod: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType = 'PHOTOGRAPHER',
  currentPlanKeyFromProfile?: PlanKey,
  lastPaidAmountForProRata?: number,
): Promise<UpgradePriceCalculation> {
  const planInfo = PLANS_BY_SEGMENT[segment]?.[targetPlanKey];
  const now = new Date();

  if (!planInfo || planInfo.price <= 0) {
    return {
      type: 'upgrade',
      amount_original: 0,
      amount_discount: 0,
      amount_final: 0,
      residual_credit: 0,
      current_plan_expires_at: now.toISOString(),
      new_expiry_date: addDays(
        now,
        billingPeriodToCommercialDays(targetPeriod),
      ).toISOString(),
    };
  }

  const { totalPrice: totalPriceNew } = getPeriodPrice(planInfo, targetPeriod);
  const targetCommercialDays = billingPeriodToCommercialDays(targetPeriod);

  // Sem assinatura prévia → cobrança integral
  if (!currentRequest?.processed_at) {
    const pixDiscount =
      billingType === 'PIX' && targetPeriod !== 'monthly'
        ? Math.round(totalPriceNew * (PIX_DISCOUNT_PERCENT / 100) * 100) / 100
        : 0;
    return {
      type: 'upgrade',
      amount_original: totalPriceNew,
      amount_discount: pixDiscount,
      amount_final: Math.round((totalPriceNew - pixDiscount) * 100) / 100,
      residual_credit: 0,
      pix_discount_amount: pixDiscount,
      current_plan_expires_at: now.toISOString(),
      new_expiry_date: addDays(now, targetCommercialDays).toISOString(),
    };
  }

  // Calcular crédito pro-rata do plano atual
  const startDate = new Date(currentRequest.processed_at);
  const monthsCurrent = billingPeriodToMonths(currentRequest.billing_period);
  let currentPlanExpiresAt = addMonths(startDate, monthsCurrent);
  const expiryFromNotes = parseExpiryFromNotes(currentRequest.notes);
  if (expiryFromNotes && expiryFromNotes > currentPlanExpiresAt)
    currentPlanExpiresAt = expiryFromNotes;

  const totalMsCurrent = currentPlanExpiresAt.getTime() - startDate.getTime();
  const remainingMs = Math.max(
    0,
    currentPlanExpiresAt.getTime() - now.getTime(),
  );
  const totalDaysCommercial = billingPeriodToCommercialDays(
    currentRequest.billing_period,
  );
  const currentPlanKey = (currentPlanKeyFromProfile ??
    currentRequest.plan_key_requested) as PlanKey;
  const currentPeriod = (currentRequest.billing_period ??
    'monthly') as BillingPeriod;
  const planInfoCurrent = PLANS_BY_SEGMENT[segment]?.[currentPlanKey];

  // Base de cálculo do pró-rata: valor efetivamente pago em dinheiro.
  // Se o plano atual veio de aproveitamento de crédito (amount_final === 0), usar
  // lastPaidAmountForProRata (último request com amount_final > 0); senão o amount_final
  // do request atual ou o preço de tabela do plano atual.
  const remainingDaysProRata =
    totalMsCurrent <= 0
      ? 0
      : totalDaysCommercial * (remainingMs / totalMsCurrent);
  const amountForProRata =
    currentRequest.amount_final > 0
      ? currentRequest.amount_final
      : lastPaidAmountForProRata != null && lastPaidAmountForProRata > 0
        ? lastPaidAmountForProRata
        : planInfoCurrent
          ? getPeriodPrice(planInfoCurrent, currentPeriod).totalPrice
          : 0;
  const residualCredit = await calculateProRataCredit(
    amountForProRata,
    totalDaysCommercial,
    remainingDaysProRata,
  );

  const daysSincePurchase = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Mesmo plano + mesmo período → bloqueado
  if (targetPlanKey === currentPlanKey && targetPeriod === currentPeriod) {
    return {
      type: 'current_plan',
      amount_original: totalPriceNew,
      amount_discount: 0,
      amount_final: 0,
      residual_credit: 0,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      new_expiry_date: currentPlanExpiresAt.toISOString(),
    };
  }

  // Downgrade: plano inferior na hierarquia OU mesmo plano com período menor
  const targetIdx = planOrder.indexOf(targetPlanKey);
  const currentIdx = planOrder.indexOf(currentPlanKey);
  const isDowngrade =
    targetIdx < currentIdx ||
    (targetIdx === currentIdx &&
      periodOrder(targetPeriod) < periodOrder(currentPeriod));

  if (isDowngrade) {
    const isWithdrawalWindow = daysSincePurchase <= 7;
    // Dentro dos 7 dias: valor efetivamente pago vira crédito (saldo = amountForProRata)
    // e pode ser abatido do novo plano. Se o crédito for maior ou igual ao valor do
    // novo período, o usuário não paga nada agora e o novo vencimento é estendido
    // proporcionalmente (crédito / preço diário do novo plano).
    // Após 7 dias: apenas agendamento, sem cobrança adicional imediata.
    const creditForDowngrade = isWithdrawalWindow
      ? amountForProRata
      : residualCredit;
    const downgradeEffectiveAt = isWithdrawalWindow ? now : currentPlanExpiresAt;

    if (isWithdrawalWindow) {
      const amountToPayRaw =
        Math.round((totalPriceNew - creditForDowngrade) * 100) / 100;
      const amountToPay = Math.max(0, amountToPayRaw);

      // Preço diário comercial do plano alvo
      const dailyPriceTarget =
        targetCommercialDays > 0 ? totalPriceNew / targetCommercialDays : 0;

      // Quando o crédito cobre pelo menos um período inteiro (ou mais):
      // amountToPay <= 0 → nenhum pagamento agora e vencimento estendido
      // proporcionalmente ao crédito.
      if (amountToPay <= 0 && dailyPriceTarget > 0) {
        const daysCoveredByCredit = Math.max(
          targetCommercialDays,
          Math.round((creditForDowngrade / dailyPriceTarget) * 100) / 100,
        );
        const newExpiry = addDays(now, daysCoveredByCredit);

        return {
          type: 'downgrade',
          is_free_upgrade: true,
          amount_original: totalPriceNew,
          amount_discount: creditForDowngrade,
          amount_final: 0,
          residual_credit: creditForDowngrade,
          current_plan_expires_at: currentPlanExpiresAt.toISOString(),
          downgrade_effective_at: now.toISOString(),
          is_downgrade_withdrawal_window: true,
          days_since_purchase: daysSincePurchase,
          new_expiry_date: newExpiry.toISOString(),
          free_upgrade_days_extended: daysCoveredByCredit,
          free_upgrade_months_covered: Math.floor(daysCoveredByCredit / 30),
        };
      }

      // Crédito parcial: abate do valor do novo período e cobra apenas a diferença.
      const newExpiry = addDays(now, targetCommercialDays);

      return {
        type: 'downgrade',
        amount_original: totalPriceNew,
        amount_discount: creditForDowngrade,
        amount_final: amountToPay,
        residual_credit: creditForDowngrade,
        current_plan_expires_at: currentPlanExpiresAt.toISOString(),
        downgrade_effective_at: now.toISOString(),
        is_downgrade_withdrawal_window: true,
        days_since_purchase: daysSincePurchase,
        new_expiry_date: newExpiry.toISOString(),
        free_upgrade_days_extended: targetCommercialDays,
        free_upgrade_months_covered: Math.floor(targetCommercialDays / 30),
      };
    }

    // Após 7 dias: apenas agendamento do downgrade para o fim do ciclo atual.
    return {
      type: 'downgrade',
      amount_original: totalPriceNew,
      amount_discount: creditForDowngrade,
      amount_final: 0,
      residual_credit: creditForDowngrade,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      downgrade_effective_at: currentPlanExpiresAt.toISOString(),
      is_downgrade_withdrawal_window: false,
      days_since_purchase: daysSincePurchase,
    };
  }

  // Upgrade gratuito: crédito cobre ao menos um período inteiro
  // Duração exata em dias (sem arredondar para meses inteiros)
  if (residualCredit >= totalPriceNew) {
    const dailyPriceNew = totalPriceNew / targetCommercialDays;
    const daysExtended =
      dailyPriceNew > 0
        ? Math.round(residualCredit / dailyPriceNew)
        : targetCommercialDays;
    const newExpiry = addDays(startDate, daysExtended);
    return {
      type: 'upgrade',
      is_free_upgrade: true,
      amount_original: totalPriceNew,
      amount_discount: totalPriceNew,
      amount_final: 0,
      residual_credit: residualCredit,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      new_expiry_date: newExpiry.toISOString(),
      free_upgrade_months_covered: Math.floor(daysExtended / 30),
      free_upgrade_days_extended: daysExtended,
    };
  }

  // Upgrade com crédito parcial → pagar apenas a diferença (+ desconto PIX se aplicável)
  const amountToPayBeforePix = Math.max(
    0,
    Math.round((totalPriceNew - residualCredit) * 100) / 100,
  );
  const pixDiscount =
    billingType === 'PIX' && targetPeriod !== 'monthly'
      ? Math.round(amountToPayBeforePix * (PIX_DISCOUNT_PERCENT / 100) * 100) /
        100
      : 0;

  return {
    type: 'upgrade',
    amount_original: totalPriceNew,
    amount_discount: residualCredit + pixDiscount,
    amount_final: Math.round((amountToPayBeforePix - pixDiscount) * 100) / 100,
    residual_credit: residualCredit,
    pix_discount_amount: pixDiscount,
    current_plan_expires_at: currentPlanExpiresAt.toISOString(),
    new_expiry_date: addDays(now, targetCommercialDays).toISOString(),
  };
}

/**
 * Preview de upgrade/downgrade para exibir no modal antes da confirmação.
 */
export async function getUpgradePreview(
  targetPlanKey: PlanKey,
  targetPeriod: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType = 'PHOTOGRAPHER',
): Promise<UpgradePreviewResult> {
  try {
    const { success, userId, profile } = await getAuthenticatedUser();
    if (!success || !userId)
      return {
        success: false,
        has_active_plan: false,
        error: 'Usuário não autenticado',
      };

    const supabase = await createSupabaseServerClient();
    const pending = await getPendingUpgradeRequest(userId, supabase);
    if (pending)
      return {
        success: true,
        has_active_plan: false,
        has_pending: true,
        calculation: undefined,
      };

    const currentPlanKeyFromProfile = profile?.plan_key
      ? (String(profile.plan_key).toUpperCase() as PlanKey)
      : undefined;

    let current: CurrentActiveRequestRow | null = null;
    if (currentPlanKeyFromProfile && currentPlanKeyFromProfile !== 'FREE') {
      current = await getCurrentActiveRequest(
        userId,
        currentPlanKeyFromProfile,
        supabase,
      );
    }

    // Se o plano atual veio de aproveitamento de crédito (amount_final === 0), base do
    // pró-rata é o valor pago na última transação (ex.: R$ 79), não o preço de tabela do plano atual.
    let lastPaidAmountForProRata: number | undefined;
    if (current?.amount_final === 0) {
      const lastPaid = await getLastPaidUpgradeRequest(userId, supabase);
      if (lastPaid && lastPaid.amount_final > 0)
        lastPaidAmountForProRata = lastPaid.amount_final;
    }

    const calculation = await calculateUpgradePrice(
      current,
      targetPlanKey,
      targetPeriod,
      billingType,
      segment,
      currentPlanKeyFromProfile,
      lastPaidAmountForProRata,
    );
    const hasPlan =
      !!current ||
      (!!currentPlanKeyFromProfile && currentPlanKeyFromProfile !== 'FREE');
    return {
      success: true,
      has_active_plan: hasPlan,
      is_current_plan: calculation.type === 'current_plan',
      calculation,
    };
  } catch (e) {
    console.error('[getUpgradePreview]', e);
    return {
      success: false,
      has_active_plan: false,
      error: e instanceof Error ? e.message : 'Erro ao calcular preview',
    };
  }
}

/**
 * Status de uma solicitação de upgrade (para polling na tela PIX).
 * Verifica que o request pertence ao usuário autenticado.
 */
export async function getUpgradeRequestStatus(
  requestId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const { success, userId } = await getAuthenticatedUser();
    if (!success || !userId)
      return { success: false, error: 'Não autenticado' };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('tb_upgrade_requests')
      .select('status')
      .eq('id', requestId)
      .eq('profile_id', userId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Solicitação não encontrada' };
    return { success: true, status: data.status as string };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erro ao verificar status',
    };
  }
}

// ─── 12. Cancelamento de assinatura/pagamento no Asaas ───────────────────────

async function cancelAsaasSubscriptionById(
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> {
  const { ok, data } = await asaasRequest<{ errors?: unknown[] }>(
    `/subscriptions/${subscriptionId}`,
    { method: 'DELETE' },
  );
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

async function deleteAsaasPayment(
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

// ─── 13. Buscar e reativar assinatura ────────────────────────────────────────

async function getAsaasSubscription(subscriptionId: string): Promise<{
  success: boolean;
  nextDueDate?: string;
  status?: string;
  endDate?: string | null;
  error?: string;
}> {
  const { ok, data } = await asaasRequest<{
    nextDueDate?: string;
    status?: string;
    endDate?: string | null;
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
  };
}

/**
 * Retorna um resumo do método de pagamento atual da assinatura ativa do usuário.
 * - Usa o último upgrade aprovado com asaas_subscription_id.
 * - Para cartão de crédito, busca últimos 4 dígitos e bandeira via /payments/{id}/billingInfo.
 */
export async function getCurrentPaymentMethodSummary(): Promise<{
  success: boolean;
  summary?: PaymentMethodSummary;
  error?: string;
}> {
  try {
    const { success, userId } = await getAuthenticatedUser();
    if (!success || !userId)
      return { success: false, error: 'Usuário não autenticado' };

    const supabase = await createSupabaseServerClient();
    const { data: row } = await supabase
      .from('tb_upgrade_requests')
      .select(
        'billing_type, asaas_subscription_id, asaas_payment_id, status, processed_at',
      )
      .eq('profile_id', userId)
      .eq('status', 'approved')
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row)
      return {
        success: true,
        summary: { billing_type: null },
      };

    const billingType = row.billing_type as BillingType;
    const subscriptionId =
      (row.asaas_subscription_id as string | null) ?? null;
    let paymentId = (row.asaas_payment_id as string | null) ?? null;

    // Para PIX/BOLETO, basta expor o tipo.
    if (billingType !== 'CREDIT_CARD')
      return {
        success: true,
        summary: { billing_type: billingType },
      };

    // Garantir um paymentId (pode não estar salvo na linha).
    if (!paymentId && subscriptionId) {
      const first = await getFirstPaymentFromSubscription(subscriptionId);
      if (first.success && first.paymentId) paymentId = first.paymentId;
    }

    if (!paymentId)
      return {
        success: true,
        summary: { billing_type: billingType },
      };

    const billingInfo = await getPaymentBillingInfo(paymentId);
    if (!billingInfo.success) {
      return {
        success: true,
        summary: { billing_type: billingType },
      };
    }

    return {
      success: true,
      summary: {
        billing_type: billingType,
        ...(billingInfo.cardLast4 && { card_last4: billingInfo.cardLast4 }),
        ...(billingInfo.cardBrand && { card_brand: billingInfo.cardBrand }),
      },
    };
  } catch (e) {
    console.error('[getCurrentPaymentMethodSummary] Error:', e);
    return {
      success: false,
      error: 'Erro ao buscar método de pagamento atual',
    };
  }
}

export async function getAsaasSubscriptionStatus(
  subscriptionId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  const result = await getAsaasSubscription(subscriptionId);
  return result.success
    ? { success: true, status: result.status }
    : { success: false, error: result.error };
}

/**
 * Reativa uma assinatura que estava com cancelamento agendado.
 * PUT /subscriptions/{id} com status ACTIVE e endDate=null.
 * Atualiza tb_profiles.is_cancelling = false e tb_upgrade_requests.status = 'approved'.
 */
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

    const supabase = await createSupabaseServerClient();
    const { data: request } = await supabase
      .from('tb_upgrade_requests')
      .select('id, profile_id')
      .eq('asaas_subscription_id', subscriptionId)
      .in('status', ['pending_cancellation', 'pending_downgrade'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (request) {
      const now = new Date().toISOString();
      await supabase
        .from('tb_upgrade_requests')
        .update({
          status: 'approved',
          notes: `Reativação em ${now}. Cancelamento desfeito.`,
          updated_at: now,
        })
        .eq('id', request.id);
      await supabase
        .from('tb_profiles')
        .update({ is_cancelling: false, updated_at: now })
        .eq('id', request.profile_id);
    }
    return { success: true };
  } catch (e) {
    console.error('[Asaas] reactivateSubscription:', e);
    return { success: false, error: 'Erro de conexão ao reativar assinatura' };
  }
}

// ─── 14. Atualizar forma de pagamento ────────────────────────────────────────

export interface UpdateSubscriptionBillingCreditCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}
export interface UpdateSubscriptionBillingHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  mobilePhone: string;
}

export async function updateSubscriptionBillingMethod(
  subscriptionId: string,
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD',
  creditCard?: UpdateSubscriptionBillingCreditCard | null,
  creditCardHolderInfo?: UpdateSubscriptionBillingHolderInfo | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      billingType,
      updatePendingPayments: true,
    };

    if (billingType === 'BOLETO' || billingType === 'PIX') {
      body.creditCard = null;
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

// ─── 15. Galerias excedentes (downgrade) ─────────────────────────────────────

async function getNeedsAdjustment(
  profileId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  needs_adjustment: boolean;
  excess_galleries: Array<{ id: string; title: string }>;
}> {
  const freeLimit = MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE;
  const { data: galleries } = await supabase
    .from('tb_galerias')
    .select('id, title')
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .order('created_at', { ascending: true }); // mais antigas primeiro = candidatas ao excesso

  if (!galleries || galleries.length <= freeLimit)
    return { needs_adjustment: false, excess_galleries: [] };
  return {
    needs_adjustment: true,
    excess_galleries: galleries.slice(freeLimit) as Array<{
      id: string;
      title: string;
    }>,
  };
}

/**
 * Após ativação de plano pago, reativa galerias ocultas por downgrade (auto_archived=true),
 * respeitando MAX_GALLERIES_HARD_CAP_BY_PLAN do novo plano.
 */
export async function reactivateAutoArchivedGalleries(
  profileId: string,
  newPlanKey: PlanKey,
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ reactivated: number; error?: string }> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());
  const maxGalleries = MAX_GALLERIES_HARD_CAP_BY_PLAN[newPlanKey] ?? 3;

  const { count: publicCount, error: countError } = await supabase
    .from('tb_galerias')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .eq('is_public', true)
    .or('auto_archived.is.null,auto_archived.eq.false');

  if (countError) return { reactivated: 0, error: countError.message };

  const slotsAvailable = Math.max(0, maxGalleries - (publicCount ?? 0));
  if (slotsAvailable === 0) return { reactivated: 0 };

  const { data: autoArchived } = await supabase
    .from('tb_galerias')
    .select('id')
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .eq('auto_archived', true)
    .order('created_at', { ascending: true })
    .limit(slotsAvailable);

  if (!autoArchived?.length) return { reactivated: 0 };

  const ids = autoArchived.map((g) => g.id);
  const { error: updateError } = await supabase
    .from('tb_galerias')
    .update({
      is_public: true,
      auto_archived: false,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);

  return updateError
    ? { reactivated: 0, error: updateError.message }
    : { reactivated: ids.length };
}

// ─── 16. performDowngradeToFree ──────────────────────────────────────────────

/**
 * Aplica o downgrade de um usuário para FREE.
 * Atualiza tb_profiles, tb_upgrade_requests e registra em tb_plan_history.
 * Oculta galerias excedentes com soft downgrade (is_public=false + auto_archived=true).
 * Exportado para uso no webhook sem precisar de contexto de autenticação.
 */
export async function performDowngradeToFree(
  profileId: string,
  upgradeRequestId: string | null,
  reason: string,
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  success: boolean;
  needs_adjustment: boolean;
  excess_galleries: Array<{ id: string; title: string }>;
  error?: string;
}> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());

  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('plan_key, is_exempt, metadata')
    .eq('id', profileId)
    .single();
  if (profile?.is_exempt === true)
    return { success: true, needs_adjustment: false, excess_galleries: [] };

  const oldPlan = (profile?.plan_key as string) ?? 'FREE';
  if (oldPlan === 'FREE')
    return { success: true, needs_adjustment: false, excess_galleries: [] };

  const newMetadata = {
    ...(profile?.metadata ?? {}),
    last_downgrade_alert_viewed: false,
  };

  const { error: planError } = await supabase
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      metadata: newMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);
  if (planError) {
    console.error('[Downgrade] Erro ao atualizar plan_key:', planError);
    return {
      success: false,
      needs_adjustment: false,
      excess_galleries: [],
      error: 'Erro ao atualizar plano para FREE.',
    };
  }

  await supabase
    .from('tb_plan_history')
    .insert({
      profile_id: profileId,
      old_plan: oldPlan,
      new_plan: 'FREE',
      reason,
    });

  if (upgradeRequestId) {
    await supabase
      .from('tb_upgrade_requests')
      .update({
        status: 'cancelled',
        notes: reason,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', upgradeRequestId);
  }

  const adjustment = await getNeedsAdjustment(profileId, supabase);

  // Ocultar galerias excedentes: is_public=false + auto_archived=true (recuperável no próximo upgrade)
  if (adjustment.needs_adjustment && adjustment.excess_galleries.length > 0) {
    const excessIds = adjustment.excess_galleries.map((g) => g.id);
    const { error: hideError } = await supabase
      .from('tb_galerias')
      .update({
        is_public: false,
        auto_archived: true,
        updated_at: new Date().toISOString(),
      })
      .in('id', excessIds);
    if (hideError)
      console.warn(
        '[Downgrade] Não foi possível ocultar galerias excedentes:',
        hideError,
      );
  }

  return { success: true, ...adjustment };
}

// ─── 17. handleSubscriptionCancellation ─────────────────────────────────────

type CancelReason = string;

function buildCancellationNotes(
  baseText: string,
  reason?: CancelReason | null,
  comment?: string,
): string {
  if (!reason) return baseText;
  return JSON.stringify({
    type: 'cancellation',
    reason,
    ...(comment ? { comment: comment.slice(0, 400) } : {}),
    detail: baseText,
  });
}

/**
 * Cancela a assinatura do usuário autenticado.
 *
 * Direito de arrependimento (< 7 dias):
 * - Cancelamento imediato. Cancela no Asaas (DELETE) e rebaixa para FREE na hora.
 * - Não chama API de estorno para evitar taxas.
 *
 * Após 7 dias:
 * - Vigência mantida até o fim do contrato. PUT endDate no Asaas para não cobrar depois.
 * - Status pending_downgrade; downgrade ocorre no vencimento (webhook ou cron).
 */
export async function handleSubscriptionCancellation(
  opts:
    | { reason?: CancelReason | null; comment?: string }
    | Awaited<ReturnType<typeof createSupabaseServerClient>> = {},
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CancellationResult> {
  // Retrocompatibilidade: se opts for um cliente Supabase (chamada antiga sem opts)
  let reason: CancelReason | null = null;
  let comment = '';
  let resolvedSupabase = supabaseClient;
  if (opts && typeof (opts as { from?: unknown }).from === 'function') {
    resolvedSupabase = opts as Awaited<
      ReturnType<typeof createSupabaseServerClient>
    >;
  } else {
    const o = opts as { reason?: CancelReason | null; comment?: string };
    reason = o.reason ?? null;
    comment = o.comment ?? '';
  }

  const supabase = resolvedSupabase ?? (await createSupabaseServerClient());
  const { success: authOk, userId } = await getAuthenticatedUser();
  if (!authOk || !userId)
    return { success: false, error: 'Usuário não autenticado.' };

  const { data: request } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, status, asaas_payment_id, asaas_subscription_id, created_at, processed_at, billing_period, plan_key_requested, notes, amount_final',
    )
    .eq('profile_id', userId)
    .in('status', [
      'pending',
      'approved',
      'pending_cancellation',
      'pending_downgrade',
    ])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request)
    return { success: false, error: 'Nenhuma assinatura ativa encontrada.' };

  const purchaseDate = request.processed_at
    ? new Date(request.processed_at as string)
    : new Date(request.created_at);
  const now = new Date();
  const daysSincePurchase = Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const expiryFromNotes = parseExpiryFromNotes(request.notes);
  const accessEndsAt =
    expiryFromNotes && !Number.isNaN(expiryFromNotes.getTime())
      ? expiryFromNotes
      : addMonths(
          purchaseDate,
          billingPeriodToMonths(request.billing_period as string | null),
        );

  // Já em cancelamento agendado → retornar access_ends_at sem writes adicionais
  if (
    request.status === 'pending_downgrade' ||
    request.status === 'pending_cancellation'
  ) {
    return {
      success: true,
      type: 'scheduled_cancellation',
      access_ends_at: accessEndsAt.toISOString(),
    };
  }

  const accessEndsAtIso = accessEndsAt.toISOString();
  const endDateStr = accessEndsAt.toISOString().split('T')[0];

  // ── Direito de arrependimento (≤ 7 dias) + pagamento confirmado (status=approved) ─
  // Neste caso, o valor pago vira crédito (metadata.credit_balance) e o downgrade é imediato.
  if (daysSincePurchase <= 7 && request.status === 'approved') {
    if (request.asaas_subscription_id) {
      const cancelResult = await cancelAsaasSubscriptionById(
        request.asaas_subscription_id as string,
      );
      if (!cancelResult.success) {
        return {
          success: false,
          error:
            cancelResult.error ??
            'Não foi possível cancelar a assinatura no gateway. Tente novamente ou entre em contato com o suporte.',
        };
      }
    } else {
      console.warn(
        '[Cancellation] tb_upgrade_requests sem asaas_subscription_id; cancelamento não registrado no Asaas.',
      );
    }

    const amountPaid =
      typeof (request as any).amount_final === 'number' &&
      (request as any).amount_final > 0
        ? (request as any).amount_final
        : 0;

    if (amountPaid > 0) {
      const { data: profileRow } = await supabase
        .from('tb_profiles')
        .select('metadata')
        .eq('id', userId)
        .maybeSingle();

      const currentMetadata =
        (profileRow?.metadata as Record<string, unknown>) || {};
      const currentBalanceRaw = (currentMetadata.credit_balance ??
        0) as number | string;
      const currentBalance =
        typeof currentBalanceRaw === 'number'
          ? currentBalanceRaw
          : Number(currentBalanceRaw) || 0;
      const newBalance =
        Math.round((currentBalance + amountPaid) * 100) / 100;

      await supabase
        .from('tb_profiles')
        .update({
          metadata: { ...currentMetadata, credit_balance: newBalance },
          updated_at: now.toISOString(),
        })
        .eq('id', userId);
    }

    const downgradeResult = await performDowngradeToFree(
      userId,
      request.id,
      buildCancellationNotes(
        `Cancelamento com direito de arrependimento (${daysSincePurchase}d após compra)`,
        reason,
        comment,
      ),
      supabase,
    );
    return {
      success: downgradeResult.success,
      type: 'refund_immediate',
      needs_adjustment: downgradeResult.needs_adjustment,
      excess_galleries: downgradeResult.excess_galleries ?? [],
      error: downgradeResult.error,
    };
  }

  // ── ≥ 7 dias: vigência até o fim do contrato ─────────────────────────────
  if (request.asaas_subscription_id) {
    const setEndResult = await setAsaasSubscriptionEndDate(
      request.asaas_subscription_id as string,
      endDateStr,
    );
    if (!setEndResult.success) {
      return {
        success: false,
        error:
          setEndResult.error ??
          'Não foi possível registrar o cancelamento no gateway. Tente novamente ou entre em contato com o suporte.',
      };
    }
  } else {
    console.warn(
      '[Cancellation] tb_upgrade_requests sem asaas_subscription_id; cancelamento agendado apenas localmente.',
    );
  }

  await supabase
    .from('tb_profiles')
    .update({ is_cancelling: true, updated_at: now.toISOString() })
    .eq('id', userId);
  await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_downgrade',
      notes: buildCancellationNotes(
        `Cancelamento solicitado em ${now.toISOString()}. Acesso até ${accessEndsAtIso}.`,
        reason,
        comment,
      ),
      updated_at: now.toISOString(),
    })
    .eq('id', request.id);
  await supabase
    .from('tb_plan_history')
    .insert({
      profile_id: userId,
      old_plan: request.plan_key_requested as string,
      new_plan: request.plan_key_requested as string,
      reason: `Cancelamento agendado. Acesso até ${accessEndsAtIso}`,
    });

  return {
    success: true,
    type: 'scheduled_cancellation',
    access_ends_at: accessEndsAtIso,
  };
}

// ─── 18. checkAndApplyExpiredSubscriptions ────────────────────────────────────

/**
 * Verifica assinaturas em pending_cancellation/pending_downgrade cujo período expirou
 * e aplica o downgrade para FREE.
 * Chamar no login (server component) ou via cron/webhook de vencimento.
 */
export async function checkAndApplyExpiredSubscriptions(
  userId?: string,
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<ExpiredSubscriptionCheck> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());

  let profileId = userId;
  if (!profileId) {
    const { success, userId: authUserId } = await getAuthenticatedUser();
    if (!success || !authUserId)
      return { applied: false, needs_adjustment: false, excess_galleries: [] };
    profileId = authUserId;
  }

  const { data: profileRow } = await supabase
    .from('tb_profiles')
    .select('is_exempt')
    .eq('id', profileId)
    .single();
  if (profileRow?.is_exempt === true)
    return { applied: false, needs_adjustment: false, excess_galleries: [] };

  const { data: pendingCancel } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, created_at, processed_at, billing_period, plan_key_requested, status',
    )
    .eq('profile_id', profileId)
    .in('status', ['pending_cancellation', 'pending_downgrade'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingCancel)
    return { applied: false, needs_adjustment: false, excess_galleries: [] };

  const startDate = pendingCancel.processed_at
    ? new Date(pendingCancel.processed_at as string)
    : new Date(pendingCancel.created_at);
  const accessEndsAt = addMonths(
    startDate,
    billingPeriodToMonths(pendingCancel.billing_period as string | null),
  );

  if (new Date() < accessEndsAt)
    return { applied: false, needs_adjustment: false, excess_galleries: [] };

  const result = await performDowngradeToFree(
    profileId,
    pendingCancel.id,
    `Downgrade automático após término do período pago (expirou em ${accessEndsAt.toISOString()})`,
    supabase,
  );
  return {
    applied: result.success,
    needs_adjustment: result.needs_adjustment,
    excess_galleries: result.excess_galleries,
  };
}
