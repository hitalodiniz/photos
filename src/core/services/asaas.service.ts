// src/core/services/asaas.service.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import {
  PLANS_BY_SEGMENT,
  type PlanKey,
  type SegmentType,
} from '@/core/config/plans';
import type {
  BillingProfile,
  BillingType,
  UpgradeRequestPayload,
  UpgradeRequestResult,
} from '@/core/types/billing';

const ASAAS_API_URL =
  process.env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

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
}

// ─── 1. Criar ou atualizar cliente ──────────────────────────────────────────

export async function createOrUpdateAsaasCustomer(data: CreateCustomerData) {
  try {
    const cpfCnpjDigits = data.cpfCnpj.replace(/\D/g, '');
    const searchResponse = await fetch(
      `${ASAAS_API_URL}/customers?cpfCnpj=${cpfCnpjDigits}`,
      {
        headers: {
          access_token: ASAAS_API_KEY,
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
        access_token: ASAAS_API_KEY,
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
    const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        access_token: ASAAS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: data.customerId,
        billingType: data.billingType,
        cycle: data.cycle,
        value: data.value,
        description: data.description,
        nextDueDate: new Date().toISOString().split('T')[0],
      }),
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
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        headers: {
          access_token: ASAAS_API_KEY,
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

async function getFirstPaymentFromSubscription(subscriptionId: string): Promise<{
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}/payments`,
      {
        headers: {
          access_token: ASAAS_API_KEY,
        },
      },
    );

    if (!response.ok) {
      return { success: false, error: 'Erro ao buscar pagamentos da assinatura' };
    }

    const data = await response.json();
    const payments = data.data ?? [];

    if (!payments.length) {
      return { success: false, error: 'Nenhum pagamento gerado para a assinatura' };
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
    ...(data.asaas_customer_id != null && { asaas_customer_id: data.asaas_customer_id }),
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
  const supabase = await createSupabaseServerClient();
  const { success: authOk, profile, userId, email } = await getAuthenticatedUser();

  if (!authOk || !profile || !userId) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  const segment = (payload.segment ?? 'PHOTOGRAPHER') as SegmentType;
  const planKey = payload.plan_key_requested as PlanKey;
  const planInfo = PLANS_BY_SEGMENT[segment]?.[planKey];

  if (!planInfo || planInfo.price <= 0) {
    return { success: false, error: 'Plano inválido ou gratuito' };
  }

  const value = planInfo.price;
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

  // 4. Criar assinatura recorrente
  const subResult = await createAsaasSubscription({
    customerId: asaasCustomerId,
    billingType: payload.billing_type,
    cycle: 'MONTHLY',
    value,
    description: `Plano ${planInfo.name} – ${planKey}`,
  });

  if (!subResult.success || !subResult.subscriptionId) {
    return {
      success: false,
      error: subResult.error ?? 'Erro ao criar assinatura',
    };
  }

  const asaasSubscriptionId = subResult.subscriptionId;

  // 5. Buscar primeiro pagamento e payment_url
  const paymentResult = await getFirstPaymentFromSubscription(asaasSubscriptionId);

  let asaasPaymentId: string | null = null;
  let paymentUrl: string | null = null;

  if (paymentResult.success) {
    asaasPaymentId = paymentResult.paymentId ?? null;
    paymentUrl = paymentResult.paymentUrl ?? subResult.invoiceUrl ?? subResult.bankSlipUrl ?? null;
  }

  // 6. INSERT tb_upgrade_requests
  const { data: insertRow, error: insertError } = await supabase
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: planKeyCurrent,
      plan_key_requested: planKey,
      billing_type: payload.billing_type,
      snapshot_name: profile.full_name ?? '',
      snapshot_cpf_cnpj: cpfCnpjFormatted,
      snapshot_email: email ?? '',
      snapshot_whatsapp: payload.whatsapp,
      snapshot_address,
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: asaasSubscriptionId,
      asaas_payment_id: asaasPaymentId,
      payment_url: paymentUrl,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[DB] Erro ao criar upgrade request:', insertError);
    return {
      success: false,
      error: 'Erro ao registrar solicitação. Tente novamente.',
    };
  }

  return {
    success: true,
    payment_url: paymentUrl ?? undefined,
    billing_type: payload.billing_type,
    request_id: insertRow?.id,
  };
}
