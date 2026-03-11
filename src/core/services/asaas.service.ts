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
  UpgradePriceCalculation,
  UpgradePreviewResult,
  UpgradeRequestPayload,
  UpgradeRequestResult,
} from '@/core/types/billing';
import { CancelReason } from 'vitest';

const ASAAS_API_URL =
  process.env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

/** Chave lida em runtime para evitar undefined quando .env.local usa outro nome. Use ASAAS_API_KEY ou ASAAS_KEY. */
function getAsaasApiKey(): string | null {
  const raw = process.env.ASAAS_API_KEY;
  // console.log('[DEBUG]', {
  //   type: typeof raw,
  //   value: raw === undefined ? 'undefined' : JSON.stringify(raw.slice(0, 20)),
  //   length: raw?.length,
  //   allEnvKeys: Object.keys(process.env).filter((k) => k.includes('ASAAS')),
  // });
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
  cycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY';
  value: number;
  description: string;
  /** Data do próximo vencimento (YYYY-MM-DD). Quando omitido, usa hoje. Usado quando crédito cobre N meses e a assinatura só deve cobrar a partir dessa data. */
  nextDueDate?: string;
  /** Limite de cobranças (ex.: 1 = única cobrança; usado com PIX semestral/anual para contornar restrição do Asaas). */
  maxPayments?: number;
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

// ─── 1. Criar ou recuperar cliente Asaas ─────────────────────────────────────
/**
 * Se existingAsaasCustomerId for passado (já vinculado ao perfil), reutiliza esse cliente.
 * Caso contrário, busca por CPF no Asaas e só reutiliza se o e-mail do cliente bater com o do usuário logado;
 * se não bater (ex.: mesmo CPF em outra conta), cria um novo cliente para não gravar pagamento na conta errada.
 */
export async function createOrUpdateAsaasCustomer(
  data: CreateCustomerData,
  existingAsaasCustomerId?: string | null,
) {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'Chave Asaas não configurada (ASAAS_API_KEY no .env.local).',
      };
    }

    if (existingAsaasCustomerId?.trim()) {
      return {
        success: true,
        customerId: existingAsaasCustomerId.trim(),
        isNew: false,
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
    const currentEmail = (data.email ?? '').trim().toLowerCase();

    if (searchData.data && searchData.data.length > 0) {
      const byEmail = searchData.data.find(
        (c: { email?: string }) =>
          (c.email ?? '').trim().toLowerCase() === currentEmail,
      );
      if (byEmail) {
        return {
          success: true,
          customerId: byEmail.id,
          isNew: false,
        };
      }
      // Mesmo CPF mas outro e-mail (outra conta): criar novo cliente para este perfil
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

    if (data.installmentCount && data.installmentCount > 1) {
      body.installmentCount = data.installmentCount;
    }
    if (data.maxPayments != null && data.maxPayments >= 1) {
      body.maxPayments = data.maxPayments;
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

/**
 * Atualiza a data do próximo vencimento de uma assinatura no Asaas (PUT /v3/subscriptions/{id}).
 * Usado em upgrade gratuito para que a próxima cobrança seja gerada na data calculada pelo crédito.
 */
async function updateAsaasSubscriptionNextDueDate(
  subscriptionId: string,
  nextDueDate: string,
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
    return { success: false, error: 'nextDueDate deve ser YYYY-MM-DD' };
  }
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave Asaas não configurada.' };
    }
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'PUT',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nextDueDate }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg =
        err.errors?.[0]?.description ?? 'Erro ao atualizar assinatura';
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (error) {
    console.error(
      '[Asaas] Erro ao atualizar nextDueDate da assinatura:',
      error,
    );
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
    };
  }
}

/**
 * Define a data de fim da assinatura no Asaas (PUT endDate).
 * Após essa data o Asaas não gera novas cobranças. Usado para cancelamento
 * com vigência até o fim do contrato (≥ 7 dias).
 */
async function setAsaasSubscriptionEndDate(
  subscriptionId: string,
  endDateYYYYMMDD: string,
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDateYYYYMMDD)) {
    return { success: false, error: 'endDate deve ser YYYY-MM-DD' };
  }
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave Asaas não configurada.' };
    }
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'PUT',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endDate: endDateYYYYMMDD }),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          err.errors?.[0]?.description ?? 'Erro ao definir fim da assinatura',
      };
    }
    return { success: true };
  } catch (error) {
    console.error('[Asaas] Erro ao definir endDate:', error);
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
    };
  }
}

async function getFirstPaymentFromSubscription(
  subscriptionId: string,
): Promise<{
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  /** Data de vencimento da cobrança (YYYY-MM-DD), vinda do Asaas. */
  dueDate?: string;
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
  } catch (error) {
    console.error('[Asaas] Erro ao buscar pagamentos:', error);
    return {
      success: false,
      error: 'Erro ao buscar primeira cobrança',
    };
  }
}

/**
 * Cria cobrança avulsa PIX (POST /v3/payments).
 * Usado quando a conta Asaas não permite PIX em assinaturas; gera uma única cobrança.
 */
async function createAsaasPixPayment(
  customerId: string,
  value: number,
  dueDate: string,
  description: string,
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave Asaas não configurada.' };
    }
    const response = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value,
        dueDate,
        description,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.errors?.[0]?.description ?? 'Erro ao criar cobrança PIX',
      };
    }

    const data = await response.json();
    return {
      success: true,
      paymentId: data.id,
    };
  } catch (error) {
    console.error('[Asaas] Erro ao criar cobrança PIX:', error);
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
    };
  }
}

/**
 * Cria cobrança avulsa com cartão (POST /v3/payments).
 * Usado quando o crédito cobre N mensalidades e o cliente paga só a diferença agora; a assinatura recorre a partir de new_expiry_date.
 */
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
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey || !creditCardDetails || !creditCardHolderInfo) {
      return {
        success: false,
        error: 'Chave Asaas não configurada ou dados do cartão incompletos.',
      };
    }
    const expMonth = creditCardDetails.expiryMonth
      .replace(/\D/g, '')
      .padStart(2, '0')
      .slice(-2);
    const expYear = creditCardDetails.expiryYear.replace(/\D/g, '');
    const body: Record<string, unknown> = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      dueDate,
      description,
      creditCard: {
        holderName: creditCardDetails.holderName,
        number: creditCardDetails.number.replace(/\D/g, ''),
        expiryMonth: expMonth,
        expiryYear:
          expYear.length <= 2
            ? `20${expYear.padStart(2, '0').slice(-2)}`
            : expYear.slice(-4),
        ccv: creditCardDetails.ccv.replace(/\D/g, ''),
      },
      creditCardHolderInfo: {
        name: creditCardHolderInfo.name,
        email: creditCardHolderInfo.email,
        cpfCnpj: creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode: creditCardHolderInfo.postalCode.replace(/\D/g, ''),
        addressNumber: creditCardHolderInfo.addressNumber,
        addressComplement: creditCardHolderInfo.addressComplement ?? null,
        phone: creditCardHolderInfo.phone.replace(/\D/g, '') || null,
        mobilePhone:
          creditCardHolderInfo.mobilePhone.replace(/\D/g, '') || null,
      },
    };
    const response = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          err.errors?.[0]?.description ?? 'Erro ao criar cobrança no cartão',
      };
    }

    const data = await response.json();
    const invoiceUrl = data.invoiceUrl ?? data.bankSlipUrl ?? null;
    return {
      success: true,
      paymentId: data.id,
      invoiceUrl: invoiceUrl ?? undefined,
    };
  } catch (error) {
    console.error('[Asaas] Erro ao criar cobrança cartão:', error);
    return {
      success: false,
      error: 'Erro de conexão com o gateway de pagamento',
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

/** GET /v3/payments/{id} — retorna invoiceUrl para abrir comprovante/fatura no Asaas. */
async function getAsaasPaymentInvoiceUrl(
  paymentId: string,
): Promise<{ success: boolean; invoiceUrl?: string; error?: string }> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave Asaas não configurada.' };
    }
    const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      headers: { access_token: apiKey },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.errors?.[0]?.description ?? 'Erro ao buscar pagamento',
      };
    }

    const data = await response.json();
    const url = data.invoiceUrl ?? data.invoiceLink ?? null;
    return {
      success: true,
      invoiceUrl:
        typeof url === 'string' && url.startsWith('http') ? url : undefined,
    };
  } catch (error) {
    console.error('[Asaas] Erro ao buscar pagamento:', error);
    return {
      success: false,
      error: 'Erro ao buscar URL do comprovante',
    };
  }
}

/** GET /v3/payments/{id} — retorna o status da cobrança no Asaas (PENDING, RECEIVED, CONFIRMED, etc.). */
async function getAsaasPaymentStatus(
  paymentId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave Asaas não configurada.' };
    }
    const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      headers: { access_token: apiKey },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          err.errors?.[0]?.description ?? 'Erro ao buscar status do pagamento',
      };
    }

    const data = await response.json();
    const status =
      typeof data.status === 'string' ? data.status.toUpperCase() : undefined;
    return { success: true, status };
  } catch (error) {
    console.error('[Asaas] Erro ao buscar status do pagamento:', error);
    return { success: false, error: 'Erro de conexão' };
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

  const planKeyCurrent = ((profile.plan_key &&
    String(profile.plan_key).toUpperCase()) ??
    'FREE') as PlanKey;
  if (profile.is_exempt === true && planKey === planKeyCurrent) {
    return { success: true, billing_type: 'PIX' };
  }

  const billingPeriod: BillingPeriod = payload.billing_period ?? 'monthly';
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
    if (!cancelResult.success) {
      return {
        success: false,
        error:
          cancelResult.error ??
          'Não foi possível invalidar a cobrança anterior. Tente novamente em instantes.',
      };
    }
    paymentAlreadyReceivedWarning =
      cancelResult.paymentAlreadyReceived === true;
  }

  const currentRequest = await getCurrentActiveRequest(userId, supabase);
  const calculation = await calculateUpgradePrice(
    currentRequest,
    planKey,
    billingPeriod,
    payload.billing_type,
    segment,
    planKeyCurrent,
  );

  console.info('[requestUpgrade] cálculo', {
    type: calculation.type,
    amount_final: calculation.amount_final,
    is_free_upgrade: calculation.is_free_upgrade,
    residual_credit: calculation.residual_credit,
  });

  // Mesmo plano + mesmo período → bloquear
  if (calculation.type === 'current_plan') {
    return {
      success: false,
      error:
        'Este já é seu plano atual. Não é possível assinar novamente o mesmo plano e período.',
    };
  }

  // Downgrade vedado: não gerar cobrança nem agendamento; retornar erro com data de vencimento.
  // Nunca inserir registro em tb_upgrade_requests nem criar cobrança no Asaas para downgrade.
  if (calculation.type === 'downgrade') {
    const dueStr = calculation.downgrade_effective_at
      ? new Date(calculation.downgrade_effective_at).toLocaleDateString(
          'pt-BR',
          {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          },
        )
      : '—';
    return {
      success: false,
      error: `Downgrade vedado. Aguarde o vencimento do plano atual (${dueStr}) para alterar para um plano inferior.`,
    };
  }

  // ─── Upgrade Gratuito: saldo residual cobre o plano inteiro ───────────────
  // Não gerar cobrança no Asaas. Inserir diretamente como 'approved' e atualizar plan_key.
  // Nenhum registro de cobrança R$ 0,00 no Asaas; apenas insert em tb_upgrade_requests + update plan_key + nextDueDate.
  if (calculation.is_free_upgrade && calculation.amount_final === 0) {
    console.info(
      '[requestUpgrade] fluxo upgrade gratuito (amount_final=0), sem cobrança Asaas',
    );
    const snapshot_address_free = formatSnapshotAddress({
      address: payload.address,
      address_number: payload.address_number,
      complement: payload.complement,
      province: payload.province,
      city: payload.city,
      state: payload.state,
      postal_code: payload.postal_code,
    });
    const billingFullNameFree =
      payload.full_name?.trim() ?? profile.full_name ?? '';
    const now = new Date().toISOString();
    const { data: freeRow, error: freeErr } = await supabase
      .from('tb_upgrade_requests')
      .insert({
        profile_id: userId,
        plan_key_current: planKeyCurrent,
        plan_key_requested: planKey,
        billing_type: payload.billing_type,
        billing_period: billingPeriod,
        snapshot_name: billingFullNameFree || (profile.full_name ?? ''),
        snapshot_cpf_cnpj: payload.cpf_cnpj,
        snapshot_email: email ?? '',
        snapshot_whatsapp: payload.whatsapp,
        snapshot_address: snapshot_address_free,
        asaas_customer_id: null,
        asaas_subscription_id: null,
        asaas_payment_id: null,
        payment_url: null,
        amount_original: calculation.amount_original,
        amount_discount: calculation.amount_discount,
        amount_final: 0,
        installments: 1,
        status: 'approved',
        processed_at: now,
        notes: `Upgrade gratuito (aproveitamento de crédito): saldo residual de R$ ${calculation.residual_credit.toFixed(2)} cobriu o valor do novo plano. Nova data de vencimento: ${calculation.new_expiry_date ?? 'N/A'}.`,
      })
      .select('id')
      .single();
    if (freeErr) {
      return {
        success: false,
        error: 'Erro ao registrar upgrade gratuito. Tente novamente.',
      };
    }
    // Atualizar plan_key no perfil
    await supabase
      .from('tb_profiles')
      .update({ plan_key: planKey, updated_at: now })
      .eq('id', userId);

    // Atualizar no Asaas a data da próxima cobrança para o vencimento calculado pelo crédito
    const asaasSubId = currentRequest?.asaas_subscription_id?.trim();
    const newExpiryIso = calculation.new_expiry_date;
    if (asaasSubId && newExpiryIso) {
      const nextDueStr = newExpiryIso.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(nextDueStr)) {
        const updateResult = await updateAsaasSubscriptionNextDueDate(
          asaasSubId,
          nextDueStr,
        );
        if (!updateResult.success) {
          console.error(
            '[Asaas] Upgrade gratuito: falha ao atualizar nextDueDate da assinatura:',
            updateResult.error,
          );
        }
      }
    }

    await revalidateUserCache(userId).catch((err) => {
      console.warn('[Upgrade gratuito] revalidateUserCache:', err);
    });

    return {
      success: true,
      billing_type: payload.billing_type,
      request_id: freeRow?.id,
    };
  }

  const amountOriginal = calculation.amount_original;
  const amountDiscount = calculation.amount_discount;
  const amountFinal = calculation.amount_final;

  /** Crédito cobre N mensalidades: cobrar só a diferença agora e assinatura com próximo vencimento em new_expiry_date. */
  const hasCreditNextDueDate =
    Boolean(calculation.new_expiry_date) &&
    calculation.amount_final > 0 &&
    !calculation.is_free_upgrade;

  const notesCredit =
    amountDiscount > 0
      ? `Aproveitamento de crédito pro-rata: R$ ${(calculation.residual_credit ?? 0).toFixed(2)} (dias não utilizados do plano anterior). Desconto total aplicado: R$ ${amountDiscount.toFixed(2)}. Valor final cobrado: R$ ${amountFinal.toFixed(2)}.${hasCreditNextDueDate && calculation.new_expiry_date ? ` Próximo vencimento do plano: ${calculation.new_expiry_date.split('T')[0]}. Nova data de vencimento: ${calculation.new_expiry_date}.` : ''}`
      : null;

  const { months } = getPeriodPrice(planInfo, billingPeriod);

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
  const billingFullName = payload.full_name?.trim() ?? profile.full_name ?? '';
  const upsertBilling = await upsertBillingProfile(userId, {
    full_name: billingFullName || undefined,
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

  const { data: billingRow } = await supabase
    .from('tb_billing_profiles')
    .select('asaas_customer_id')
    .eq('id', userId)
    .single();

  // 2. Criar ou recuperar cliente Asaas (usa o já vinculado ao perfil para não associar pagamento a outra conta)
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

  // ─── PIX: cobrança avulsa (não usar Subscription — muitas contas Asaas rejeitam PIX em assinaturas)
  if (payload.billing_type === 'PIX') {
    // Regenerar QR PIX para a mesma solicitação pendente (ex.: PIX expirado) — não duplica registro
    if (isSamePendingPix && pendingRequest) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      const dueDateStr = dueDate.toISOString().split('T')[0];
      const pixPayResult = await createAsaasPixPayment(
        asaasCustomerId,
        amountFinal,
        dueDateStr,
        `Plano ${planInfo.name}`,
      );
      if (!pixPayResult.success || !pixPayResult.paymentId) {
        return {
          success: false,
          error: pixPayResult.error ?? 'Erro ao gerar novo PIX',
        };
      }
      const newPaymentId = pixPayResult.paymentId;
      const pixResult = await getPixQrCode(newPaymentId);
      const paymentUrlPix = pixResult.payload ?? null;
      const pixQrCodeBase64Pix = pixResult.encodedImage;
      const invoiceResult = await getAsaasPaymentInvoiceUrl(newPaymentId);
      const invoiceUrlPix =
        invoiceResult.success && invoiceResult.invoiceUrl
          ? invoiceResult.invoiceUrl
          : null;
      const { error: updateErr } = await supabase
        .from('tb_upgrade_requests')
        .update({
          asaas_payment_id: newPaymentId,
          payment_url: invoiceUrlPix,
          ...(notesCredit && { notes: notesCredit }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingRequest.id)
        .eq('profile_id', userId);
      if (updateErr) {
        console.error('[Asaas] Erro ao atualizar PIX regenerado:', updateErr);
        return {
          success: false,
          error: 'Erro ao atualizar solicitação. Tente novamente.',
        };
      }
      return {
        success: true,
        payment_url: paymentUrlPix ?? undefined,
        pix_qr_code_base64: pixQrCodeBase64Pix,
        billing_type: 'PIX',
        request_id: pendingRequest.id,
      };
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    const pixPayResult = await createAsaasPixPayment(
      asaasCustomerId,
      amountFinal,
      dueDateStr,
      `Plano ${planInfo.name} – ${planKey}`,
    );
    if (!pixPayResult.success || !pixPayResult.paymentId) {
      return {
        success: false,
        error: pixPayResult.error ?? 'Erro ao criar cobrança PIX',
      };
    }
    const asaasPaymentIdPix = pixPayResult.paymentId;
    const pixResult = await getPixQrCode(asaasPaymentIdPix);
    const paymentUrlPix = pixResult.payload ?? null;
    const pixQrCodeBase64Pix = pixResult.encodedImage;

    // URL da fatura no Asaas (comprovante / abrir pagamento); não gravar o payload PIX em payment_url
    const invoiceResult = await getAsaasPaymentInvoiceUrl(asaasPaymentIdPix);
    const invoiceUrlPix =
      invoiceResult.success && invoiceResult.invoiceUrl
        ? invoiceResult.invoiceUrl
        : null;

    const { data: insertRowPix, error: insertErrorPix } = await supabase
      .from('tb_upgrade_requests')
      .insert({
        profile_id: userId,
        plan_key_current: planKeyCurrent,
        plan_key_requested: planKey,
        billing_type: 'PIX',
        billing_period: billingPeriod,
        snapshot_name: billingFullName || (profile.full_name ?? ''),
        snapshot_cpf_cnpj: cpfCnpjFormatted,
        snapshot_email: email ?? '',
        snapshot_whatsapp: payload.whatsapp,
        snapshot_address,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: null,
        asaas_payment_id: asaasPaymentIdPix,
        payment_url: invoiceUrlPix,
        amount_original: amountOriginal,
        amount_discount: amountDiscount,
        amount_final: amountFinal,
        installments: 1,
        status: 'pending',
        ...(notesCredit && { notes: notesCredit }),
      })
      .select('id')
      .single();

    if (insertErrorPix) {
      console.error(
        '[DB] Erro ao criar upgrade request (PIX):',
        insertErrorPix,
      );
      return {
        success: false,
        error:
          process.env.NODE_ENV === 'development'
            ? `Erro ao registrar solicitação: ${insertErrorPix.message}`
            : 'Erro ao registrar solicitação. Tente novamente.',
      };
    }

    return {
      success: true,
      payment_url: paymentUrlPix ?? undefined,
      pix_qr_code_base64: pixQrCodeBase64Pix,
      billing_type: 'PIX',
      request_id: insertRowPix?.id,
      ...(paymentAlreadyReceivedWarning && {
        warning:
          'Pagamento já identificado. O valor será utilizado como crédito para o novo plano.',
      }),
    };
  }

  // 4. Criar assinatura recorrente (CREDIT_CARD e BOLETO)
  const asaasCycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' =
    billingPeriod === 'annual'
      ? 'YEARLY'
      : billingPeriod === 'semiannual'
        ? 'SEMIANNUALLY'
        : 'MONTHLY';
  const planPricePerPeriod = getPeriodPrice(planInfo, billingPeriod).totalPrice;
  const subscriptionValue =
    hasCreditNextDueDate && isCreditCard ? planPricePerPeriod : amountFinal;
  const nextDueDateStr =
    hasCreditNextDueDate && calculation.new_expiry_date
      ? calculation.new_expiry_date.split('T')[0]
      : undefined;
  const subPayload: CreateSubscriptionData = {
    customerId: asaasCustomerId,
    billingType: payload.billing_type,
    cycle: asaasCycle,
    value: subscriptionValue,
    description: `Plano ${planInfo.name} – ${planKey}`,
    ...(nextDueDateStr && { nextDueDate: nextDueDateStr }),
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

  // Quando crédito cobre N mensalidades: cobrar a diferença agora no cartão e criar assinatura com primeiro vencimento em new_expiry_date
  let oneOffPaymentId: string | null = null;
  let oneOffInvoiceUrl: string | null = null;
  if (
    hasCreditNextDueDate &&
    isCreditCard &&
    subPayload.creditCardDetails &&
    subPayload.creditCardHolderInfo
  ) {
    const dueToday = new Date().toISOString().split('T')[0];
    const oneOffResult = await createAsaasCreditCardPayment(
      asaasCustomerId,
      amountFinal,
      dueToday,
      `Plano ${planInfo.name} – ${planKey} (diferença com crédito)`,
      subPayload.creditCardDetails,
      subPayload.creditCardHolderInfo,
    );
    if (!oneOffResult.success || !oneOffResult.paymentId) {
      return {
        success: false,
        error: oneOffResult.error ?? 'Erro ao cobrar diferença no cartão',
      };
    }
    oneOffPaymentId = oneOffResult.paymentId;
    oneOffInvoiceUrl = oneOffResult.invoiceUrl ?? null;
  }

  const subResult = await createAsaasSubscription(subPayload);

  if (!subResult.success || !subResult.subscriptionId) {
    return {
      success: false,
      error: subResult.error ?? 'Erro ao criar assinatura',
    };
  }

  const asaasSubscriptionId = subResult.subscriptionId;

  // 5. Buscar primeiro pagamento e payment_url (e QR PIX quando for PIX — BOLETO usa invoiceUrl)
  // Quando houve cobrança avulsa da diferença (crédito cobre N meses), usar esse pagamento como referência
  const paymentResult =
    await getFirstPaymentFromSubscription(asaasSubscriptionId);

  let asaasPaymentId: string | null = oneOffPaymentId;
  let paymentUrl: string | null = oneOffInvoiceUrl;
  let pixQrCodeBase64: string | undefined;
  /** Data de vencimento da cobrança (Asaas), para exibir na tela de boleto gerado. */
  let paymentDueDate: string | undefined;

  if (!asaasPaymentId || !paymentUrl) {
    if (paymentResult.success) {
      asaasPaymentId = asaasPaymentId ?? paymentResult.paymentId ?? null;
      // BOLETO: priorizar PDF direto (bankSlipUrl); PIX mantém invoice/QR; demais usam paymentUrl genérico
      if (payload.billing_type === 'BOLETO') {
        paymentUrl =
          paymentResult.bankSlipUrl ??
          paymentResult.paymentUrl ??
          subResult.bankSlipUrl ??
          subResult.invoiceUrl ??
          null;
      } else {
        paymentUrl =
          paymentUrl ??
          paymentResult.paymentUrl ??
          subResult.invoiceUrl ??
          subResult.bankSlipUrl ??
          null;
      }
      paymentDueDate = paymentResult.dueDate;
    } else {
      paymentUrl =
        paymentUrl ?? subResult.invoiceUrl ?? subResult.bankSlipUrl ?? null;
    }
  } else if (paymentResult.success && paymentResult.dueDate) {
    paymentDueDate = paymentResult.dueDate;
  }

  // 6. INSERT tb_upgrade_requests
  const { data: insertRow, error: insertError } = await supabase
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: planKeyCurrent,
      plan_key_requested: planKey,
      billing_type: payload.billing_type,
      billing_period: billingPeriod,
      snapshot_name: billingFullName || (profile.full_name ?? ''),
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
      ...(notesCredit && { notes: notesCredit }),
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

  // Garantir que o vencimento das observações esteja sempre no Asaas (nextDueDate)
  if (
    hasCreditNextDueDate &&
    calculation.new_expiry_date &&
    asaasSubscriptionId
  ) {
    const nextDueStr = calculation.new_expiry_date.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(nextDueStr)) {
      const updateResult = await updateAsaasSubscriptionNextDueDate(
        asaasSubscriptionId,
        nextDueStr,
      );
      if (!updateResult.success) {
        console.error(
          '[Asaas] Falha ao atualizar nextDueDate após insert (crédito pro-rata):',
          updateResult.error,
        );
      }
    }
  }

  return {
    success: true,
    payment_url: paymentUrl ?? undefined,
    pix_qr_code_base64: pixQrCodeBase64,
    billing_type: payload.billing_type,
    request_id: insertRow?.id,
    ...(paymentDueDate && { payment_due_date: paymentDueDate }),
    ...(paymentAlreadyReceivedWarning && {
      warning:
        'Pagamento já identificado. O valor será utilizado como crédito para o novo plano.',
    }),
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

/** Adiciona `n` dias a uma data (sem dependências externas). */
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

/** Ordem de "tamanho" do período para comparar ciclo (mensal < semestral < anual). */
function periodOrder(p: BillingPeriod): number {
  if (p === 'annual') return 12;
  if (p === 'semiannual') return 6;
  return 1;
}

/**
 * Extrai a data de vencimento das notes (ex.: upgrade gratuito "Nova data de vencimento: 2026-06-16T...").
 * Usado para considerar o vencimento real quando o plano veio de crédito.
 */
function parseExpiryFromNotes(notes: string | null | undefined): Date | null {
  if (!notes?.trim()) return null;
  const match = notes.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1].trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ano comercial: dias do período para pro-rata (30, 180, 360).
 * Usado de forma consistente em calculateUpgradePrice, calculateProRataCredit e getPeriodPrice. */
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

/**
 * Calcula o crédito pro-rata a abater (ano comercial: 30, 180 ou 360 dias).
 * credit = (currentAmount / totalDays) * remainingDays
 */
export async function calculateProRataCredit(
  currentAmount: number,
  totalDays: 30 | 180 | 360,
  remainingDays: number,
): Promise<number> {
  if (totalDays <= 0 || remainingDays <= 0) return 0;
  const credit =
    (currentAmount / totalDays) * Math.min(remainingDays, totalDays);
  return Math.round(credit * 100) / 100;
}

// ─── Plano ativo e cálculo de upgrade/downgrade (pro-rata) ───────────────────

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
 * Busca a solicitação de upgrade aprovada do usuário que representa o plano ativo.
 * Preferência: solicitação cujo período (processed_at + billing_period) ainda contém "agora".
 * Se nenhuma estiver em período vigente, retorna a mais recente (para cálculo sem crédito).
 */
export async function getCurrentActiveRequest(
  userId: string,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CurrentActiveRequestRow | null> {
  const db = supabase ?? (await createSupabaseServerClient());
  const { data: rows } = await db
    .from('tb_upgrade_requests')
    .select(
      'id, amount_final, processed_at, billing_period, plan_key_requested, asaas_subscription_id, notes',
    )
    .eq('profile_id', userId)
    .eq('status', 'approved')
    .order('processed_at', { ascending: false })
    .limit(10);
  const list = (rows ?? []) as CurrentActiveRequestRow[];
  if (list.length === 0) return null;
  const now = new Date();
  for (const row of list) {
    if (!row?.processed_at) continue;
    const start = new Date(row.processed_at);
    const months = billingPeriodToMonths(row.billing_period);
    let end = addMonths(start, months);
    const fromNotes = parseExpiryFromNotes(row.notes);
    if (fromNotes) end = fromNotes;
    if (end >= now) return row;
  }
  return list[0];
}

/** Idade máxima para considerar uma solicitação "pending" antes de permitir nova tentativa (24h). */
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
 * Retorna a solicitação de upgrade com status 'pending' mais recente do usuário,
 * apenas se foi criada nos últimos PENDING_UPGRADE_MAX_AGE_MS (24h).
 * Usado para bloquear nova assinatura enquanto há pagamento em processamento.
 * Inclui billing_period para permitir regenerar PIX da mesma solicitação (mesmo plano+período).
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
 * Invalida a cobrança/assinatura anterior no Asaas e marca o request como 'cancelled' no banco.
 * Só chama cancel/delete no Asaas se o status da cobrança for estritamente PENDING.
 * Se RECEIVED ou CONFIRMED, não cancela no Asaas (evita estorno/taxas); apenas atualiza o banco e retorna paymentAlreadyReceived.
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

  if (payId) {
    const statusRes = await getAsaasPaymentStatus(payId);
    if (statusRes.success && statusRes.status) {
      const status = statusRes.status.toUpperCase();
      if (status === 'RECEIVED' || status === 'CONFIRMED') {
        const { error } = await supabase
          .from('tb_upgrade_requests')
          .update({
            status: 'cancelled',
            notes: `Invalidado para nova solicitação (pagamento já identificado no Asaas; valor será utilizado como crédito).`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pending.id);

        if (error) {
          console.error('[cancelPendingUpgradeInAsaasAndDb] Update DB:', error);
          return {
            success: false,
            error: 'Erro ao atualizar solicitação anterior.',
          };
        }
        return { success: true, paymentAlreadyReceived: true };
      }
    }
  }

  if (subId) {
    const res = await cancelAsaasSubscriptionById(subId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
  } else if (payId) {
    const res = await deleteAsaasPayment(payId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
  }

  const { error } = await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes: `Invalidado para nova solicitação (usuário alterou plano/ciclo/método de pagamento).`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pending.id);

  if (error) {
    console.error('[cancelPendingUpgradeInAsaasAndDb] Update DB:', error);
    return { success: false, error: 'Erro ao atualizar solicitação anterior.' };
  }
  return { success: true };
}

/**
 * Calcula o valor de upgrade com pro-rata (ano comercial 30/180/360 dias).
 *
 * Regras de classificação:
 * - Upgrade: targetPlanKey está ACIMA na hierarquia (planOrder), independente do valor do ciclo.
 * - Mesmo período + mesmo plano → current_plan (bloqueado).
 * - Mesmo plano, período menor OU plano inferior → downgrade (efetivado no vencimento).
 *
 * Crédito superior ao preço do novo plano (upgrade gratuito):
 * - amount_final = 0 — nenhuma cobrança é gerada no Asaas.
 * - new_expiry_date = agora + (residualCredit / dailyPriceNewPlan) dias.
 * - free_upgrade_months_covered = quantos ciclos (do novo plano) o saldo cobre.
 *
 * @param currentPlanKeyFromProfile plano atual em tb_profiles.plan_key (evita histórico desatualizado).
 */
export async function calculateUpgradePrice(
  currentRequest: CurrentActiveRequestRow | null,
  targetPlanKey: PlanKey,
  targetPeriod: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType = 'PHOTOGRAPHER',
  currentPlanKeyFromProfile?: PlanKey,
): Promise<UpgradePriceCalculation> {
  const planInfo = PLANS_BY_SEGMENT[segment]?.[targetPlanKey];
  if (!planInfo || planInfo.price <= 0) {
    console.info('[calculateUpgradePrice] plano inválido ou gratuito', {
      targetPlanKey,
      targetPeriod,
      segment: segment ?? 'PHOTOGRAPHER',
    });
    const now = new Date();
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

  const fullPriceResult = getPeriodPrice(planInfo, targetPeriod);
  const totalPriceNew = fullPriceResult.totalPrice;
  const targetCommercialDays = billingPeriodToCommercialDays(targetPeriod);
  console.info('[calculateUpgradePrice] entrada', {
    targetPlanKey,
    targetPeriod,
    targetCommercialDays,
    totalPriceNew,
    hasCurrentRequest: !!currentRequest,
    currentProcessedAt: currentRequest?.processed_at ?? null,
  });

  const now = new Date();
  let currentPlanExpiresAt: Date;

  // Sem assinatura prévia → cobrança integral, nova expiração = agora + ciclo
  if (!currentRequest || !currentRequest.processed_at) {
    currentPlanExpiresAt = now;
    const newExpiry = addDays(now, targetCommercialDays);
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
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      new_expiry_date: newExpiry.toISOString(),
    };
  }

  // Calcular crédito pro-rata do plano atual
  const startDate = new Date(currentRequest.processed_at);
  const monthsCurrent = billingPeriodToMonths(currentRequest.billing_period);
  currentPlanExpiresAt = addMonths(startDate, monthsCurrent);
  const expiryFromNotes = parseExpiryFromNotes(currentRequest.notes);
  if (expiryFromNotes && expiryFromNotes > currentPlanExpiresAt) {
    currentPlanExpiresAt = expiryFromNotes;
  }

  const totalMsCurrent = currentPlanExpiresAt.getTime() - startDate.getTime();
  const remainingMs = Math.max(
    0,
    currentPlanExpiresAt.getTime() - now.getTime(),
  );
  const totalDaysCommercial = billingPeriodToCommercialDays(
    currentRequest.billing_period,
  );
  const currentPlanKey = (currentPlanKeyFromProfile ??
    currentRequest?.plan_key_requested) as PlanKey;
  const currentPeriod = (currentRequest?.billing_period ??
    'monthly') as BillingPeriod;
  const planInfoCurrent = PLANS_BY_SEGMENT[segment]?.[currentPlanKey];

  let remainingDaysProRata: number;
  let residualCredit: number;

  if (expiryFromNotes && currentRequest.amount_final === 0 && planInfoCurrent) {
    const totalDaysActual = Math.max(
      1,
      Math.round(totalMsCurrent / (24 * 60 * 60 * 1000)),
    );
    const remainingDaysActual = Math.max(
      0,
      Math.round(remainingMs / (24 * 60 * 60 * 1000)),
    );
    const dailyRate = planInfoCurrent.price / 30;
    residualCredit =
      Math.round(
        dailyRate * Math.min(remainingDaysActual, totalDaysActual) * 100,
      ) / 100;
    remainingDaysProRata = remainingDaysActual;
    console.info(
      '[calculateUpgradePrice] crédito de upgrade gratuito anterior',
      {
        totalDaysActual,
        remainingDaysActual,
        residualCredit,
      },
    );
  } else {
    remainingDaysProRata =
      totalMsCurrent <= 0
        ? 0
        : totalDaysCommercial * (remainingMs / totalMsCurrent);
    const amountForProRata =
      currentRequest.amount_final > 0
        ? currentRequest.amount_final
        : planInfoCurrent
          ? getPeriodPrice(planInfoCurrent, currentPeriod).totalPrice
          : 0;
    residualCredit = await calculateProRataCredit(
      amountForProRata,
      totalDaysCommercial,
      remainingDaysProRata,
    );
    console.info('[calculateUpgradePrice] pro-rata (ano comercial)', {
      totalDaysCommercial,
      remainingDaysProRata,
      amountForProRata,
      residualCredit,
    });
  }

  // Mesmo plano + mesmo período → plano atual (bloqueado)
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
  const isPlanUpgrade =
    planOrder.indexOf(targetPlanKey) > planOrder.indexOf(currentPlanKey);
  const isPlanDowngrade =
    planOrder.indexOf(targetPlanKey) < planOrder.indexOf(currentPlanKey);
  const isPeriodDowngrade =
    !isPlanUpgrade &&
    !isPlanDowngrade &&
    periodOrder(targetPeriod) < periodOrder(currentPeriod);
  const isDowngrade = isPlanDowngrade || isPeriodDowngrade;

  if (isDowngrade) {
    console.info('[calculateUpgradePrice] resultado: downgrade', {
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      residual_credit: residualCredit,
    });
    return {
      type: 'downgrade',
      amount_original: totalPriceNew,
      amount_discount: residualCredit,
      amount_final: 0,
      residual_credit: residualCredit,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      downgrade_effective_at: currentPlanExpiresAt.toISOString(),
    };
  }

  // ─── Upgrade ───────────────────────────────────────────────────────────────
  const dailyPriceNew = totalPriceNew / targetCommercialDays;

  // Crédito cobre pelo menos um período: upgrade gratuito. Duração exata em dias (ex.: 257/79 ≈ 3,26 meses = ~98 dias).
  // Não arredondar para N meses inteiros nem cobrar "diferença"; o crédito compra exatamente o tempo que vale.
  if (residualCredit >= totalPriceNew) {
    const daysExtended =
      dailyPriceNew > 0
        ? Math.round(residualCredit / dailyPriceNew)
        : targetCommercialDays;
    const newExpiry = addDays(startDate, daysExtended);
    const monthsCovered = Math.floor(daysExtended / 30);
    console.info('[calculateUpgradePrice] resultado: upgrade gratuito', {
      residualCredit,
      totalPriceNew,
      daysExtended,
      new_expiry_date: newExpiry.toISOString(),
      amount_final: 0,
    });
    return {
      type: 'upgrade',
      is_free_upgrade: true,
      amount_original: totalPriceNew,
      amount_discount: totalPriceNew,
      amount_final: 0,
      residual_credit: residualCredit,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
      new_expiry_date: newExpiry.toISOString(),
      free_upgrade_months_covered: monthsCovered,
      free_upgrade_days_extended: daysExtended,
    };
  }

  // Crédito parcial → pagar apenas a diferença (+ desconto PIX se aplicável)
  const newExpiry = addDays(now, targetCommercialDays);
  const amountToPayBeforePix = Math.max(
    0,
    Math.round((totalPriceNew - residualCredit) * 100) / 100,
  );
  const pixDiscount =
    billingType === 'PIX' && targetPeriod !== 'monthly'
      ? Math.round(amountToPayBeforePix * (PIX_DISCOUNT_PERCENT / 100) * 100) /
        100
      : 0;
  const amountFinal =
    Math.round((amountToPayBeforePix - pixDiscount) * 100) / 100;

  console.info('[calculateUpgradePrice] resultado: upgrade pago', {
    totalPriceNew,
    residualCredit,
    amountToPayBeforePix,
    pixDiscount,
    amount_final: amountFinal,
    new_expiry_date: newExpiry.toISOString(),
  });

  return {
    type: 'upgrade',
    amount_original: totalPriceNew,
    amount_discount: residualCredit + pixDiscount,
    amount_final: amountFinal,
    residual_credit: residualCredit,
    pix_discount_amount: pixDiscount,
    current_plan_expires_at: currentPlanExpiresAt.toISOString(),
    new_expiry_date: newExpiry.toISOString(),
  };
}

/**
 * Retorna o preview de upgrade/downgrade para exibir no modal (valor da diferença ou data de efetivação).
 */
export async function getUpgradePreview(
  targetPlanKey: PlanKey,
  targetPeriod: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType = 'PHOTOGRAPHER',
): Promise<UpgradePreviewResult> {
  try {
    const { success, userId, profile } = await getAuthenticatedUser();
    if (!success || !userId) {
      return {
        success: false,
        has_active_plan: false,
        error: 'Usuário não autenticado',
      };
    }
    const supabase = await createSupabaseServerClient();
    const [pending, current] = await Promise.all([
      getPendingUpgradeRequest(userId, supabase),
      getCurrentActiveRequest(userId, supabase),
    ]);
    if (pending) {
      return {
        success: true,
        has_active_plan: false,
        has_pending: true,
        calculation: undefined,
      };
    }
    const rawPlanKey = profile?.plan_key;
    const currentPlanKeyFromProfile = rawPlanKey
      ? (String(rawPlanKey).toUpperCase() as PlanKey)
      : undefined;
    const calculation = await calculateUpgradePrice(
      current,
      targetPlanKey,
      targetPeriod,
      billingType,
      segment,
      currentPlanKeyFromProfile,
    );
    const hasPlan =
      !!current ||
      (!!currentPlanKeyFromProfile && currentPlanKeyFromProfile !== 'FREE');
    return {
      success: true,
      has_active_plan: hasPlan,
      is_current_plan: calculation.type === 'current_plan',
      calculation: calculation,
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
 * Verifica o status de uma solicitação de upgrade (para polling na tela PIX).
 * Só retorna status se o request pertencer ao usuário autenticado.
 */
export async function getUpgradeRequestStatus(
  requestId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const { success, userId } = await getAuthenticatedUser();
    if (!success || !userId) {
      return { success: false, error: 'Não autenticado' };
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('tb_upgrade_requests')
      .select('status')
      .eq('id', requestId)
      .eq('profile_id', userId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data) {
      return { success: false, error: 'Solicitação não encontrada' };
    }
    return { success: true, status: data.status as string };
  } catch (e) {
    console.error('[getUpgradeRequestStatus]', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erro ao verificar status',
    };
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

/** DELETE /v3/payments/{id} — cancela cobrança pendente (PIX/Boleto) no Asaas. Não estorna; apenas invalida. */
async function deleteAsaasPayment(
  paymentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey)
      return { success: false, error: 'Chave Asaas não configurada.' };

    const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: { access_token: apiKey },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.errors?.[0]?.description ?? 'Erro ao cancelar cobrança',
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Erro de conexão ao cancelar cobrança' };
  }
}

// ─── Buscar assinatura (GET) ─────────────────────────────────────────────────

async function getAsaasSubscription(subscriptionId: string): Promise<{
  success: boolean;
  nextDueDate?: string;
  status?: string;
  endDate?: string | null;
  error?: string;
}> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey)
      return { success: false, error: 'Chave Asaas não configurada.' };

    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      { headers: { access_token: apiKey } },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.errors?.[0]?.description ?? 'Erro ao buscar assinatura',
      };
    }

    const data = await response.json();
    return {
      success: true,
      nextDueDate: data.nextDueDate,
      status: data.status,
      endDate: data.endDate ?? null,
    };
  } catch {
    return {
      success: false,
      error: 'Erro de conexão ao buscar assinatura',
    };
  }
}

/**
 * Retorna o status atual da assinatura no Asaas (ACTIVE, INACTIVE, EXPIRED, etc.)
 * para exibição no dashboard. Use quando tiver activeSubscriptionId.
 */
export async function getAsaasSubscriptionStatus(
  subscriptionId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  const result = await getAsaasSubscription(subscriptionId);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, status: result.status ?? undefined };
}

// ─── Reativar assinatura (remover cancelamento agendado) ─────────────────────

/**
 * Reativa uma assinatura que estava com cancelamento agendado.
 * Usa PUT /v3/subscriptions/{id} com status ACTIVE e endDate removido;
 * nextDueDate é obrigatório ao retomar (obtido via GET da assinatura).
 * Atualiza o banco: is_cancelling = false, status do request volta a 'approved'.
 */
export async function reactivateSubscription(
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey)
      return { success: false, error: 'Chave Asaas não configurada.' };

    const current = await getAsaasSubscription(subscriptionId);
    if (!current.success) return current;

    const nextDueDate = current.nextDueDate;
    if (!nextDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
      return {
        success: false,
        error:
          'Não foi possível obter a data do próximo vencimento da assinatura.',
      };
    }

    const body: Record<string, unknown> = {
      status: 'ACTIVE',
      nextDueDate,
      endDate: null,
    };

    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'PUT',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.errors?.[0]?.description ?? 'Erro ao reativar assinatura',
      };
    }

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
      await supabase
        .from('tb_upgrade_requests')
        .update({
          status: 'approved',
          notes: `Reativação em ${new Date().toISOString()}. Cancelamento desfeito.`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);
      await supabase
        .from('tb_profiles')
        .update({ is_cancelling: false, updated_at: new Date().toISOString() })
        .eq('id', request.profile_id);
    }

    return { success: true };
  } catch (e) {
    console.error('[Asaas] reactivateSubscription:', e);
    return {
      success: false,
      error: 'Erro de conexão ao reativar assinatura',
    };
  }
}

// ─── Atualizar forma de pagamento da assinatura ──────────────────────────────

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

/**
 * Atualiza a forma de cobrança da assinatura no Asaas.
 * BOLETO/PIX: PUT com billingType e creditCard null (remove cartão salvo).
 * CREDIT_CARD: PUT com billingType e dados do cartão + creditCardHolderInfo.
 */
export async function updateSubscriptionBillingMethod(
  subscriptionId: string,
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD',
  creditCard?: UpdateSubscriptionBillingCreditCard | null,
  creditCardHolderInfo?: UpdateSubscriptionBillingHolderInfo | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey)
      return { success: false, error: 'Chave Asaas não configurada.' };

    const body: Record<string, unknown> = {
      billingType,
      updatePendingPayments: true,
    };

    if (billingType === 'BOLETO' || billingType === 'PIX') {
      body.creditCard = null;
    } else if (
      billingType === 'CREDIT_CARD' &&
      creditCard &&
      creditCardHolderInfo
    ) {
      const expMonth = creditCard.expiryMonth
        .replace(/\D/g, '')
        .padStart(2, '0')
        .slice(-2);
      const expYear = creditCard.expiryYear.replace(/\D/g, '');
      body.creditCard = {
        holderName: creditCard.holderName,
        number: creditCard.number.replace(/\D/g, ''),
        expiryMonth: expMonth,
        expiryYear:
          expYear.length <= 2
            ? `20${expYear.padStart(2, '0').slice(-2)}`
            : expYear.slice(-4),
        ccv: creditCard.ccv.replace(/\D/g, ''),
      };
      body.creditCardHolderInfo = {
        name: creditCardHolderInfo.name,
        email: creditCardHolderInfo.email,
        cpfCnpj: creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode: creditCardHolderInfo.postalCode.replace(/\D/g, ''),
        addressNumber: creditCardHolderInfo.addressNumber,
        addressComplement: creditCardHolderInfo.addressComplement ?? null,
        phone: creditCardHolderInfo.phone.replace(/\D/g, '') || null,
        mobilePhone:
          creditCardHolderInfo.mobilePhone.replace(/\D/g, '') || null,
      };
    } else if (billingType === 'CREDIT_CARD') {
      return {
        success: false,
        error:
          'Dados do cartão e do titular são obrigatórios para cartão de crédito.',
      };
    }

    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'PUT',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          err.errors?.[0]?.description ??
          'Erro ao atualizar forma de pagamento',
      };
    }

    return { success: true };
  } catch (e) {
    console.error('[Asaas] updateSubscriptionBillingMethod:', e);
    return {
      success: false,
      error: 'Erro de conexão ao atualizar forma de pagamento',
    };
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
    .select('plan_key, is_exempt')
    .eq('id', profileId)
    .single();

  if (profile?.is_exempt === true) {
    return { success: true, needs_adjustment: false, excess_galleries: [] };
  }

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

interface CancellationOptions {
  reason?: CancelReason | null;
  comment?: string;
}

// ─── Helper para montar notes de cancelamento ─────────────────────────────────
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
 * - Cancelamento imediato e gratuito. Estorna o pagamento, cancela a assinatura
 *   no Asaas e aplica downgrade para FREE na hora. Não há vigência até data.
 *
 * Após 7 dias:
 * - A vigência segue até o fim do contrato atual. Informa o Asaas (endDate) para
 *   não gerar cobrança após essa data. Status pending_downgrade; downgrade para
 *   FREE ocorre no vencimento (webhook ou cron).
 */
export async function handleSubscriptionCancellation(
  opts:
    | CancellationOptions
    | Awaited<ReturnType<typeof createSupabaseServerClient>> = {},
  supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CancellationResult> {
  // Suporte retrocompat: se opts for um cliente Supabase (chamada antiga), tratar como supabaseClient
  let reason: CancelReason | null = null;
  let comment = '';
  let resolvedSupabaseClient = supabaseClient;
  if (opts && typeof (opts as { from?: unknown }).from === 'function') {
    // opts é um cliente Supabase (chamada antiga sem opts)
    resolvedSupabaseClient = opts as Awaited<
      ReturnType<typeof createSupabaseServerClient>
    >;
  } else {
    const o = opts as CancellationOptions;
    reason = o.reason ?? null;
    comment = o.comment ?? '';
  }

  const supabase =
    resolvedSupabaseClient ?? (await createSupabaseServerClient());
  const { success: authOk, userId } = await getAuthenticatedUser();

  if (!authOk || !userId) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  const { data: request } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, status, asaas_payment_id, asaas_subscription_id, created_at, processed_at, billing_period, plan_key_requested, notes',
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

  if (!request) {
    return { success: false, error: 'Nenhuma assinatura ativa encontrada.' };
  }

  const purchaseDate = request.processed_at
    ? new Date(request.processed_at as string)
    : new Date(request.created_at);
  const now = new Date();
  const daysSincePurchase = Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const months = billingPeriodToMonths(request.billing_period as string | null);
  const expiryFromNotes = parseExpiryFromNotes(request.notes);
  const accessEndsAt =
    expiryFromNotes && !Number.isNaN(expiryFromNotes.getTime())
      ? expiryFromNotes
      : addMonths(purchaseDate, months);

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

  // ── Direito de arrependimento (< 7 dias): cancelamento imediato sem estorno via API ──
  // Não chamamos refund/estorno para evitar taxas; a assinatura é cancelada no Asaas e o downgrade aplicado.
  if (daysSincePurchase < 7) {
    if (request.asaas_subscription_id) {
      const cancelResult = await cancelAsaasSubscriptionById(
        request.asaas_subscription_id as string,
      );
      if (!cancelResult.success) {
        console.error(
          '[Cancellation] Erro ao cancelar assinatura no Asaas:',
          cancelResult.error,
        );
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

  // ── ≥ 7 dias: vigência até o fim do contrato; informar Asaas para não cobrar depois ──
  if (request.asaas_subscription_id) {
    const setEndResult = await setAsaasSubscriptionEndDate(
      request.asaas_subscription_id as string,
      endDateStr,
    );
    if (!setEndResult.success) {
      console.error(
        '[Cancellation] Definir endDate no Asaas:',
        setEndResult.error,
      );
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

  await supabase.from('tb_plan_history').insert({
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

  const { data: profileRow } = await supabase
    .from('tb_profiles')
    .select('is_exempt')
    .eq('id', profileId)
    .single();
  if (profileRow?.is_exempt === true) {
    return { applied: false, needs_adjustment: false, excess_galleries: [] };
  }

  const now = new Date();

  // 1) pending_cancellation expirado → downgrade para FREE
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

  if (pendingCancel) {
    const startDate = pendingCancel.processed_at
      ? new Date(pendingCancel.processed_at as string)
      : new Date(pendingCancel.created_at);
    const months = billingPeriodToMonths(
      pendingCancel.billing_period as string | null,
    );
    const accessEndsAt = addMonths(startDate, months);

    if (now >= accessEndsAt) {
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
  }

  return { applied: false, needs_adjustment: false, excess_galleries: [] };
}
