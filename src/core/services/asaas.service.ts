// src/core/services/asaas.service.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import {
  PLANS_BY_SEGMENT,
  getPeriodPrice,
  MAX_GALLERIES_HARD_CAP_BY_PLAN,
  type PlanKey,
  type SegmentType,
} from '@/core/config/plans';
import type {
  BillingPeriod,
  BillingProfile,
  BillingType,
  CancellationResult,
  ExpiredSubscriptionCheck,
  UpgradeRequestPayload,
  UpgradeRequestResult,
} from '@/core/types/billing';

const ASAAS_API_URL =
  process.env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

/** Chave lida em runtime para evitar undefined quando .env.local usa outro nome. Use ASAAS_API_KEY ou ASAAS_KEY. */
function getAsaasApiKey(): string | null {
  const raw = process.env.ASAAS_API_KEY;
  console.log('[DEBUG]', {
    type: typeof raw,
    value: raw === undefined ? 'undefined' : JSON.stringify(raw.slice(0, 20)),
    length: raw?.length,
    allEnvKeys: Object.keys(process.env).filter((k) => k.includes('ASAAS')),
  });
  const key = raw?.trim() || null;
  return key;
}

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
  cycle: 'MONTHLY' | 'YEARLY';
  value: number;
  description: string;
  /** Número de parcelas (apenas CREDIT_CARD, períodos não-mensais; 1 = sem parcelamento). */
  installmentCount?: number;
  /** Obrigatório quando billingType === 'CREDIT_CARD' para captura imediata. */
  creditCardDetails?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  /** Dados do titular para anti-fraude (obrigatório com creditCardDetails). */
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

// ─── 1. Criar ou atualizar cliente ──────────────────────────────────────────

export async function createOrUpdateAsaasCustomer(data: CreateCustomerData) {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'Chave Asaas não configurada (ASAAS_API_KEY no .env.local).',
      };
    }
    const cpfCnpjDigits = data.cpfCnpj.replace(/\D/g, '');
    const searchResponse = await fetch(
      `${ASAAS_API_URL}/customers?cpfCnpj=${cpfCnpjDigits}`,
      {
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    const searchData = await searchResponse.json();

    if (searchData.data && searchData.data.length > 0) {
      return {
        success: true,
        customerId: searchData.data[0].id,
        isNew: false,
      };
    }

    const createResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        cpfCnpj: cpfCnpjDigits,
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

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error('[Asaas] Erro ao criar cliente:', error);
      return {
        success: false,
        error:
          error.errors?.[0]?.description || 'Erro ao criar cliente no Asaas',
      };
    }

    const customer = await createResponse.json();

    return {
      success: true,
      customerId: customer.id,
      isNew: true,
    };
  } catch (error) {
    console.error('[Asaas] Erro na requisição:', error);
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
    };
  }
}

// ─── 2. Criar assinatura recorrente ─────────────────────────────────────────

export async function createAsaasSubscription(data: CreateSubscriptionData) {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'Chave Asaas não configurada (ASAAS_API_KEY no .env.local).',
      };
    }
    const nextDueDate = new Date().toISOString().split('T')[0];
    const body: Record<string, unknown> = {
      customer: data.customerId,
      billingType: data.billingType,
      cycle: data.cycle,
      value: data.value,
      description: data.description,
      nextDueDate,
    };

    if (data.installmentCount && data.installmentCount > 1) {
      body.installmentCount = data.installmentCount;
    }

    if (data.billingType === 'CREDIT_CARD' && data.creditCardDetails) {
      const expMonth = data.creditCardDetails.expiryMonth
        .replace(/\D/g, '')
        .padStart(2, '0')
        .slice(-2);
      const expYear = data.creditCardDetails.expiryYear.replace(/\D/g, '');
      body.creditCard = {
        holderName: data.creditCardDetails.holderName,
        number: data.creditCardDetails.number.replace(/\D/g, ''),
        expiryMonth: expMonth,
        expiryYear:
          expYear.length <= 2
            ? `20${expYear.padStart(2, '0').slice(-2)}`
            : expYear.slice(-4),
        ccv: data.creditCardDetails.ccv.replace(/\D/g, ''),
      };
      if (data.creditCardHolderInfo) {
        const c = data.creditCardHolderInfo;
        const phoneDigits = c.phone.replace(/\D/g, '');
        const mobileDigits = c.mobilePhone.replace(/\D/g, '');
        body.creditCardHolderInfo = {
          name: c.name,
          email: c.email,
          cpfCnpj: c.cpfCnpj.replace(/\D/g, ''),
          postalCode: c.postalCode.replace(/\D/g, ''),
          addressNumber: c.addressNumber,
          addressComplement: c.addressComplement ?? null,
          phone: phoneDigits || null,
          mobilePhone: mobileDigits || null,
        };
      }
    }

    const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Asaas] Erro ao criar assinatura:', error);
      return {
        success: false,
        error: error.errors?.[0]?.description || 'Erro ao criar assinatura',
      };
    }

    const subscription = await response.json();

    return {
      success: true,
      subscriptionId: subscription.id,
      invoiceUrl: subscription.invoiceUrl,
      bankSlipUrl: subscription.bankSlipUrl,
    };
  } catch (error) {
    console.error('[Asaas] Erro na requisição:', error);
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
    };
  }
}

// ─── 3. Obter link de pagamento (PIX ou Boleto) ────────────────────────────

export async function getAsaasPaymentLink(subscriptionId: string) {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave Asaas não configurada.' };
    }
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        headers: {
          access_token: apiKey,
        },
      },
    );

    if (!response.ok) {
      return { success: false, error: 'Erro ao buscar dados da assinatura' };
    }

    const subscription = await response.json();

    return {
      success: true,
      invoiceUrl: subscription.invoiceUrl,
      bankSlipUrl: subscription.bankSlipUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erro ao buscar link de pagamento',
    };
  }
}

// ─── 4. Buscar pagamentos da assinatura (primeira cobrança) ─────────────────

async function getFirstPaymentFromSubscription(
  subscriptionId: string,
): Promise<{
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  error?: string;
}> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave Asaas não configurada.' };
    }
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}/payments`,
      {
        headers: {
          access_token: apiKey,
        },
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error: 'Erro ao buscar pagamentos da assinatura',
      };
    }

    const data = await response.json();
    const payments = data.data ?? [];

    if (!payments.length) {
      return {
        success: false,
        error: 'Nenhum pagamento gerado para a assinatura',
      };
    }

    const first = payments[0];
    const paymentUrl =
      first.invoiceUrl ?? first.bankSlipUrl ?? first.pixQrCodeUrl ?? null;

    return {
      success: true,
      paymentId: first.id,
      paymentUrl: paymentUrl ?? undefined,
    };
  } catch (error) {
    console.error('[Asaas] Erro ao buscar pagamentos:', error);
    return {
      success: false,
      error: 'Erro ao buscar primeira cobrança',
    };
  }
}

/** GET /v3/payments/{id}/pixQrCode — retorna encodedImage (base64) e payload (copia e cola). */
async function getPixQrCode(paymentId: string): Promise<{
  success: boolean;
  encodedImage?: string;
  payload?: string;
  error?: string;
}> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave Asaas não configurada.' };
    }
    const response = await fetch(
      `${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`,
      {
        headers: {
          access_token: apiKey,
        },
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.errors?.[0]?.description ?? 'Erro ao obter QR Code PIX',
      };
    }

    const data = await response.json();
    return {
      success: true,
      encodedImage: data.encodedImage,
      payload: data.payload,
    };
  } catch (error) {
    console.error('[Asaas] Erro ao buscar PIX QR Code:', error);
    return {
      success: false,
      error: 'Erro ao obter QR Code PIX',
    };
  }
}

// ─── 5. Upsert Billing Profile ─────────────────────────────────────────────

/**
 * Salva ou atualiza os dados fiscais do usuário em tb_billing_profiles.
 * Também persiste o asaas_customer_id quando disponível.
 */
export async function upsertBillingProfile(
  profileId: string,
  data: Omit<
    BillingProfile,
    'id' | 'cpf_cnpj_type' | 'created_at' | 'updated_at'
  >,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();

  const row = {
    id: profileId,
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
  };

  const { error } = await supabase.from('tb_billing_profiles').upsert(row, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });

  if (error) {
    console.error('[DB] Erro ao salvar billing profile:', error);
    return { success: false, error: 'Erro ao salvar dados fiscais' };
  }

  return { success: true };
}

// ─── 6. Request Upgrade (orquestra todo o fluxo) ──────────────────────────

function formatSnapshotAddress(data: {
  address: string;
  address_number: string;
  complement?: string;
  province: string;
  city: string;
  state: string;
  postal_code: string;
}): string {
  return `${data.address}, ${data.address_number}${
    data.complement ? ` – ${data.complement}` : ''
  }, ${data.province}, ${data.city}/${data.state} – ${data.postal_code}`;
}

export async function requestUpgrade(
  payload: UpgradeRequestPayload,
): Promise<UpgradeRequestResult> {
  const apiKey = getAsaasApiKey();
  if (!apiKey) {
    console.error(
      '[Asaas] ASAAS_API_KEY ou ASAAS_KEY não configurado no .env.local',
    );
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

  if (!authOk || !profile || !userId) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  const segment = (payload.segment ?? 'PHOTOGRAPHER') as SegmentType;
  const planKey = payload.plan_key_requested as PlanKey;
  const planInfo = PLANS_BY_SEGMENT[segment]?.[planKey];

  if (!planInfo || planInfo.price <= 0) {
    return { success: false, error: 'Plano inválido ou gratuito' };
  }

  const billingPeriod: BillingPeriod = payload.billing_period ?? 'monthly';
  const { effectiveMonthly, months } = getPeriodPrice(planInfo, billingPeriod);

  const amountOriginal = Math.round(effectiveMonthly * months * 100) / 100;

  // 10% PIX discount for non-monthly periods
  const pixDiscount =
    payload.billing_type === 'PIX' && billingPeriod !== 'monthly'
      ? Math.round(amountOriginal * 0.1 * 100) / 100
      : 0;

  const amountDiscount = pixDiscount;
  const amountFinal = Math.round((amountOriginal - amountDiscount) * 100) / 100;

  // Installments: PIX/BOLETO or monthly → always 1
  // CREDIT_CARD semiannual → max 3; annual → max 6
  const maxInstallments =
    payload.billing_type === 'CREDIT_CARD' && billingPeriod === 'semiannual'
      ? 3
      : payload.billing_type === 'CREDIT_CARD' && billingPeriod === 'annual'
        ? 6
        : 1;
  const installments = Math.min(
    Math.max(1, payload.installments ?? 1),
    maxInstallments,
  );

  const planKeyCurrent = (profile.plan_key as PlanKey) ?? 'FREE';
  const snapshot_address = formatSnapshotAddress({
    address: payload.address,
    address_number: payload.address_number,
    complement: payload.complement,
    province: payload.province,
    city: payload.city,
    state: payload.state,
    postal_code: payload.postal_code,
  });

  // 1. Upsert billing profile (sem asaas_customer_id ainda)
  const cpfCnpjFormatted = payload.cpf_cnpj;
  const upsertBilling = await upsertBillingProfile(userId, {
    cpf_cnpj: cpfCnpjFormatted,
    postal_code: payload.postal_code,
    address: payload.address,
    address_number: payload.address_number,
    complement: payload.complement,
    province: payload.province,
    city: payload.city,
    state: payload.state,
  });

  if (!upsertBilling.success) {
    return { success: false, error: upsertBilling.error };
  }

  // 2. Criar ou recuperar cliente Asaas
  const customerResult = await createOrUpdateAsaasCustomer({
    name: profile.full_name ?? 'Cliente',
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
  });

  if (!customerResult.success || !customerResult.customerId) {
    return {
      success: false,
      error: customerResult.error ?? 'Erro ao criar cliente no gateway',
    };
  }

  const asaasCustomerId = customerResult.customerId;

  // 3. Atualizar asaas_customer_id em tb_billing_profiles
  await supabase
    .from('tb_billing_profiles')
    .update({
      asaas_customer_id: asaasCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Para CREDIT_CARD exige dados do cartão no payload
  const isCreditCard = payload.billing_type === 'CREDIT_CARD';
  if (isCreditCard) {
    const card = payload.credit_card;
    if (
      !card?.credit_card_holder_name?.trim() ||
      !card?.credit_card_number?.replace(/\D/g, '') ||
      !card?.credit_card_expiry_month ||
      !card?.credit_card_expiry_year ||
      !card?.credit_card_ccv
    ) {
      return {
        success: false,
        error:
          'Dados do cartão de crédito são obrigatórios para esta forma de pagamento.',
      };
    }
  }

  // 4. Criar assinatura recorrente
  const asaasCycle = billingPeriod === 'annual' ? 'YEARLY' : 'MONTHLY';
  const subPayload: CreateSubscriptionData = {
    customerId: asaasCustomerId,
    billingType: payload.billing_type,
    cycle: asaasCycle,
    value: amountFinal,
    description: `Plano ${planInfo.name} – ${planKey}`,
    installmentCount: installments > 1 ? installments : undefined,
  };

  if (isCreditCard && payload.credit_card) {
    const c = payload.credit_card;
    subPayload.creditCardDetails = {
      holderName: c.credit_card_holder_name.trim(),
      number: c.credit_card_number.replace(/\D/g, ''),
      expiryMonth: c.credit_card_expiry_month
        .replace(/\D/g, '')
        .padStart(2, '0')
        .slice(-2),
      expiryYear: c.credit_card_expiry_year.replace(/\D/g, ''),
      ccv: c.credit_card_ccv.replace(/\D/g, ''),
    };
    subPayload.creditCardHolderInfo = {
      name: profile.full_name ?? 'Cliente',
      email: email ?? '',
      cpfCnpj: payload.cpf_cnpj.replace(/\D/g, ''),
      postalCode: payload.postal_code.replace(/\D/g, ''),
      addressNumber: payload.address_number,
      addressComplement: payload.complement ?? undefined,
      phone: payload.whatsapp.replace(/\D/g, ''),
      mobilePhone: payload.whatsapp.replace(/\D/g, ''),
    };
  }

  const subResult = await createAsaasSubscription(subPayload);

  if (!subResult.success || !subResult.subscriptionId) {
    return {
      success: false,
      error: subResult.error ?? 'Erro ao criar assinatura',
    };
  }

  const asaasSubscriptionId = subResult.subscriptionId;

  // 5. Buscar primeiro pagamento e payment_url (e QR PIX quando for PIX)
  const paymentResult =
    await getFirstPaymentFromSubscription(asaasSubscriptionId);

  let asaasPaymentId: string | null = null;
  let paymentUrl: string | null = null;
  let pixQrCodeBase64: string | undefined;

  if (paymentResult.success) {
    asaasPaymentId = paymentResult.paymentId ?? null;
    paymentUrl =
      paymentResult.paymentUrl ??
      subResult.invoiceUrl ??
      subResult.bankSlipUrl ??
      null;

    if (payload.billing_type === 'PIX' && asaasPaymentId) {
      const pixResult = await getPixQrCode(asaasPaymentId);
      if (pixResult.success && pixResult.payload) {
        paymentUrl = pixResult.payload;
        pixQrCodeBase64 = pixResult.encodedImage;
      }
    }
  }

  // 6. INSERT tb_upgrade_requests (payment_url = payload PIX quando for PIX, para recuperar após reload)
  const { data: insertRow, error: insertError } = await supabase
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: planKeyCurrent,
      plan_key_requested: planKey,
      billing_type: payload.billing_type,
      billing_period: billingPeriod,
      snapshot_name: profile.full_name ?? '',
      snapshot_cpf_cnpj: cpfCnpjFormatted,
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
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[DB] Erro ao criar upgrade request:', insertError);
    const dbMessage =
      insertError.message ??
      (typeof insertError === 'object'
        ? JSON.stringify(insertError)
        : String(insertError));
    return {
      success: false,
      error:
        process.env.NODE_ENV === 'development'
          ? `Erro ao registrar solicitação: ${dbMessage}`
          : 'Erro ao registrar solicitação. Tente novamente.',
    };
  }

  return {
    success: true,
    payment_url: paymentUrl ?? undefined,
    pix_qr_code_base64: pixQrCodeBase64,
    billing_type: payload.billing_type,
    request_id: insertRow?.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── 7. Cancelamento e Downgrade ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Adiciona `n` meses a uma data (sem dependências externas). */
function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function billingPeriodToMonths(period: string | null | undefined): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

// ─── Chamar estorno de pagamento no Asaas ────────────────────────────────────

async function refundAsaasPayment(
  paymentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey)
      return { success: false, error: 'Chave Asaas não configurada.' };

    const response = await fetch(
      `${ASAAS_API_URL}/payments/${paymentId}/refund`,
      {
        method: 'POST',
        headers: { access_token: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.errors?.[0]?.description ?? 'Erro ao estornar pagamento',
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Erro de conexão ao estornar pagamento' };
  }
}

// ─── Cancelar assinatura no Asaas (DELETE) ───────────────────────────────────

async function cancelAsaasSubscriptionById(
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey)
      return { success: false, error: 'Chave Asaas não configurada.' };

    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'DELETE',
        headers: { access_token: apiKey },
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.errors?.[0]?.description ?? 'Erro ao cancelar assinatura',
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Erro de conexão ao cancelar assinatura' };
  }
}

// ─── Verificar galerias excedentes para o plano FREE ─────────────────────────

async function getNeedsAdjustment(
  profileId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{
  needs_adjustment: boolean;
  excess_galleries: Array<{ id: string; title: string }>;
}> {
  const freeLimit = MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE; // 3

  const { data: galleries } = await supabase
    .from('tb_galerias')
    .select('id, title')
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .order('created_at', { ascending: true }); // mais antigas primeiro = candidatas ao excesso

  if (!galleries || galleries.length <= freeLimit) {
    return { needs_adjustment: false, excess_galleries: [] };
  }

  return {
    needs_adjustment: true,
    excess_galleries: galleries.slice(freeLimit) as Array<{
      id: string;
      title: string;
    }>,
  };
}

// ─── Reativar galerias auto-arquivadas após novo upgrade ─────────────────────

/**
 * Após ativação de plano pago, reativa galerias que estavam ocultas por
 * downgrade (auto_archived: true), respeitando o limite de galerias do novo plano.
 * Respeita MAX_GALLERIES_HARD_CAP_BY_PLAN e não excede storageGB/photoCredits
 * (limite aplicado via número máximo de galerias públicas).
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

  if (countError) {
    console.warn('[Reactivate] Erro ao contar galerias públicas:', countError);
    return { reactivated: 0, error: countError.message };
  }

  const currentPublic = publicCount ?? 0;
  const slotsAvailable = Math.max(0, maxGalleries - currentPublic);
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

  if (updateError) {
    console.warn('[Reactivate] Erro ao reativar galerias:', updateError);
    return { reactivated: 0, error: updateError.message };
  }

  return { reactivated: ids.length };
}

// ─── Downgrade imediato para FREE (partilhado com webhook) ───────────────────

/**
 * Aplica o downgrade de um usuário para FREE no Supabase.
 * Atualiza tb_profiles, tb_upgrade_requests e registra em tb_plan_history.
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
    .select('plan_key')
    .eq('id', profileId)
    .single();

  const oldPlan = (profile?.plan_key as string) ?? 'FREE';

  // Já está no FREE — nada a fazer
  if (oldPlan === 'FREE') {
    return { success: true, needs_adjustment: false, excess_galleries: [] };
  }

  const { error: planError } = await supabase
    .from('tb_profiles')
    .update({ plan_key: 'FREE', updated_at: new Date().toISOString() })
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

  // Registrar no histórico
  await supabase.from('tb_plan_history').insert({
    profile_id: profileId,
    old_plan: oldPlan,
    new_plan: 'FREE',
    reason,
  });

  // Atualizar status do pedido de upgrade
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

  // Esconder automaticamente as galerias excedentes (soft downgrade: is_public=false + auto_archived=true).
  // Requer coluna tb_galerias.auto_archived (boolean, default false) para recuperação no próximo upgrade.
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
    if (hideError) {
      console.warn(
        '[Downgrade] Não foi possível ocultar galerias excedentes:',
        hideError,
      );
    }
  }

  return { success: true, ...adjustment };
}

// ─── Server Action: Cancelar assinatura ──────────────────────────────────────

/**
 * Cancela a assinatura do usuário autenticado.
 *
 * ≤ 7 dias: estorno (refund) + downgrade imediato para FREE.
 * > 7 dias: cancela cobranças futuras no Asaas e agenda o downgrade
 *           para o fim do período pago (status → pending_cancellation).
 * @param supabaseClient Opcional: cliente Supabase (útil em testes de integração).
 */
export async function handleSubscriptionCancellation(
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CancellationResult> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());
  const { success: authOk, userId } = await getAuthenticatedUser();

  if (!authOk || !userId) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  // Buscar o pedido de upgrade ativo mais recente
  const { data: request } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, status, asaas_payment_id, asaas_subscription_id, created_at, processed_at, billing_period, plan_key_requested',
    )
    .eq('profile_id', userId)
    .in('status', ['pending', 'approved', 'pending_cancellation'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request) {
    return { success: false, error: 'Nenhuma assinatura ativa encontrada.' };
  }

  // Já está agendado para cancelamento — retornar data de expiração
  if (request.status === 'pending_cancellation') {
    const months = billingPeriodToMonths(
      request.billing_period as string | null,
    );
    const start = request.processed_at
      ? new Date(request.processed_at)
      : new Date(request.created_at);
    return {
      success: true,
      type: 'scheduled_cancellation',
      access_ends_at: addMonths(start, months).toISOString(),
    };
  }

  // Data de referência para calcular os 7 dias (pagamento confirmado ou criação do pedido)
  const purchaseDate = request.processed_at
    ? new Date(request.processed_at as string)
    : new Date(request.created_at);
  const now = new Date();
  const daysSincePurchase = Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // ── Direito de arrependimento (≤ 7 dias) ────────────────────────────────
  if (daysSincePurchase <= 7) {
    // 1. Estornar o pagamento
    if (request.asaas_payment_id) {
      const refundResult = await refundAsaasPayment(
        request.asaas_payment_id as string,
      );
      if (!refundResult.success) {
        console.warn('[Cancellation] Estorno falhou:', refundResult.error);
        // Não bloquear o fluxo — o time de suporte pode estornar manualmente
      }
    }

    // 2. Cancelar a assinatura no Asaas (evitar cobranças futuras)
    if (request.asaas_subscription_id) {
      await cancelAsaasSubscriptionById(
        request.asaas_subscription_id as string,
      );
    }

    // 3. Downgrade imediato + verifica adequação
    const downgradeResult = await performDowngradeToFree(
      userId,
      request.id,
      `Cancelamento com direito de arrependimento (${daysSincePurchase}d após compra)`,
      supabase,
    );

    return {
      success: downgradeResult.success,
      type: 'refund_immediate',
      needs_adjustment: downgradeResult.needs_adjustment,
      excess_galleries: downgradeResult.excess_galleries,
      error: downgradeResult.error,
    };
  }

  // ── Cancelamento padrão (> 7 dias): agendar para fim do período ─────────
  if (request.asaas_subscription_id) {
    const cancelResult = await cancelAsaasSubscriptionById(
      request.asaas_subscription_id as string,
    );
    if (!cancelResult.success) {
      console.warn(
        '[Cancellation] Erro ao cancelar Asaas:',
        cancelResult.error,
      );
    }
  }

  const months = billingPeriodToMonths(request.billing_period as string | null);
  const accessEndsAt = addMonths(purchaseDate, months);

  await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_cancellation',
      notes: `Cancelamento solicitado em ${now.toISOString()}. Acesso garantido até ${accessEndsAt.toISOString()}.`,
      updated_at: now.toISOString(),
    })
    .eq('id', request.id);

  // Registra no histórico (plano não muda ainda; apenas auditoria)
  await supabase.from('tb_plan_history').insert({
    profile_id: userId,
    old_plan: request.plan_key_requested as string,
    new_plan: request.plan_key_requested as string,
    reason: `Cancelamento agendado. Acesso até ${accessEndsAt.toISOString()}`,
  });

  return {
    success: true,
    type: 'scheduled_cancellation',
    access_ends_at: accessEndsAt.toISOString(),
  };
}

// ─── Server Action: verificar e aplicar downgrades expirados ─────────────────

/**
 * Verifica se o usuário possui assinaturas em 'pending_cancellation' cujo
 * período pago já expirou e, em caso afirmativo, aplica o downgrade para FREE.
 *
 * Chamar no login (server component) ou via cron/webhook de vencimento.
 * @param supabaseClient Opcional: cliente Supabase (útil em testes de integração).
 */
export async function checkAndApplyExpiredSubscriptions(
  userId?: string,
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<ExpiredSubscriptionCheck> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());

  let profileId = userId;
  if (!profileId) {
    const { success, userId: authUserId } = await getAuthenticatedUser();
    if (!success || !authUserId) {
      return { applied: false, needs_adjustment: false, excess_galleries: [] };
    }
    profileId = authUserId;
  }

  const { data: request } = await supabase
    .from('tb_upgrade_requests')
    .select('id, created_at, processed_at, billing_period, plan_key_requested')
    .eq('profile_id', profileId)
    .eq('status', 'pending_cancellation')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request) {
    return { applied: false, needs_adjustment: false, excess_galleries: [] };
  }

  const startDate = request.processed_at
    ? new Date(request.processed_at as string)
    : new Date(request.created_at);
  const months = billingPeriodToMonths(request.billing_period as string | null);
  const accessEndsAt = addMonths(startDate, months);

  if (new Date() < accessEndsAt) {
    // Acesso ainda vigente — nada a fazer
    return { applied: false, needs_adjustment: false, excess_galleries: [] };
  }

  // Período expirado: downgrade para FREE
  const result = await performDowngradeToFree(
    profileId,
    request.id,
    `Downgrade automático após término do período pago (expirou em ${accessEndsAt.toISOString()})`,
    supabase,
  );

  return {
    applied: result.success,
    needs_adjustment: result.needs_adjustment,
    excess_galleries: result.excess_galleries,
  };
}
