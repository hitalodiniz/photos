// src/core/services/asaas.service.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
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
      invoiceUrl: typeof url === 'string' && url.startsWith('http') ? url : undefined,
    };
  } catch (error) {
    console.error('[Asaas] Erro ao buscar pagamento:', error);
    return {
      success: false,
      error: 'Erro ao buscar URL do comprovante',
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

  const planKeyCurrent = (profile.plan_key as PlanKey) ?? 'FREE';
  if (profile.is_exempt === true && planKey === planKeyCurrent) {
    return { success: true, billing_type: 'PIX' };
  }

  const pendingRequest = await getPendingUpgradeRequest(userId, supabase);
  if (pendingRequest) {
    return {
      success: false,
      error:
        'Você já possui uma solicitação de upgrade em processamento. Aguarde a confirmação do pagamento ou o cancelamento automático (até 24h) para tentar novamente.',
    };
  }

  const billingPeriod: BillingPeriod = payload.billing_period ?? 'monthly';
  const currentRequest = await getCurrentActiveRequest(userId, supabase);
  const calculation = await calculateUpgradePrice(
    currentRequest,
    planKey,
    billingPeriod,
    payload.billing_type,
    segment,
  );

  // Mesmo plano + mesmo período → bloquear
  if (calculation.type === 'current_plan') {
    return {
      success: false,
      error:
        'Este já é seu plano atual. Não é possível assinar novamente o mesmo plano e período.',
    };
  }

  // Downgrade vedado: não gerar cobrança nem agendamento; retornar erro com data de vencimento
  if (calculation.type === 'downgrade') {
    const vencto = calculation.current_plan_expires_at
      ? new Date(calculation.current_plan_expires_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '';
    return {
      success: false,
      error: `Mudança para planos inferiores permitida apenas após o vencimento do plano atual em ${vencto}.`,
    };
  }

  const amountOriginal = calculation.amount_original;
  const amountDiscount = calculation.amount_discount;
  const amountFinal = calculation.amount_final;

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
    };
  }

  // 4. Criar assinatura recorrente (CREDIT_CARD e BOLETO)
  const asaasCycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' =
    billingPeriod === 'annual'
      ? 'YEARLY'
      : billingPeriod === 'semiannual'
        ? 'SEMIANNUALLY'
        : 'MONTHLY';
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

  const subResult = await createAsaasSubscription(subPayload);

  if (!subResult.success || !subResult.subscriptionId) {
    return {
      success: false,
      error: subResult.error ?? 'Erro ao criar assinatura',
    };
  }

  const asaasSubscriptionId = subResult.subscriptionId;

  // 5. Buscar primeiro pagamento e payment_url (e QR PIX quando for PIX — BOLETO usa invoiceUrl)
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

/** Ordem de "tamanho" do período para comparar ciclo (mensal < semestral < anual). */
function periodOrder(p: BillingPeriod): number {
  if (p === 'annual') return 12;
  if (p === 'semiannual') return 6;
  return 1;
}

// ─── Plano ativo e cálculo de upgrade/downgrade (pro-rata) ───────────────────

export interface CurrentActiveRequestRow {
  id: string;
  amount_final: number;
  processed_at: string | null;
  billing_period: string | null;
  plan_key_requested: string;
  asaas_subscription_id?: string | null;
}

/**
 * Busca a solicitação de upgrade aprovada mais recente do usuário (plano ativo pago).
 */
export async function getCurrentActiveRequest(
  userId: string,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<CurrentActiveRequestRow | null> {
  const db = supabase ?? (await createSupabaseServerClient());
  const { data } = await db
    .from('tb_upgrade_requests')
    .select(
      'id, amount_final, processed_at, billing_period, plan_key_requested, asaas_subscription_id',
    )
    .eq('profile_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as CurrentActiveRequestRow | null;
}

/** Idade máxima para considerar uma solicitação "pending" antes de permitir nova tentativa (24h). */
const PENDING_UPGRADE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PendingUpgradeRow {
  id: string;
  created_at: string;
  plan_key_requested: string;
  billing_type: string;
}

/**
 * Retorna a solicitação de upgrade com status 'pending' mais recente do usuário,
 * apenas se foi criada nos últimos PENDING_UPGRADE_MAX_AGE_MS (24h).
 * Usado para bloquear nova assinatura enquanto há pagamento em processamento.
 */
export async function getPendingUpgradeRequest(
  userId: string,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<PendingUpgradeRow | null> {
  const db = supabase ?? (await createSupabaseServerClient());
  const since = new Date(Date.now() - PENDING_UPGRADE_MAX_AGE_MS).toISOString();
  const { data } = await db
    .from('tb_upgrade_requests')
    .select('id, created_at, plan_key_requested, billing_type')
    .eq('profile_id', userId)
    .eq('status', 'pending')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PendingUpgradeRow | null;
}

/**
 * Calcula o valor de upgrade com pro-rata: crédito dos dias restantes do plano atual
 * é descontado do preço do novo plano. Para PIX em períodos não-mensais, aplica 10%
 * apenas sobre a diferença a pagar.
 * Se for downgrade (plano ou período menor), retorna type 'downgrade' e amount_final = 0.
 */
export async function calculateUpgradePrice(
  currentRequest: CurrentActiveRequestRow | null,
  targetPlanKey: PlanKey,
  targetPeriod: BillingPeriod,
  billingType: BillingType,
  segment: SegmentType = 'PHOTOGRAPHER',
): Promise<UpgradePriceCalculation> {
  const planInfo = PLANS_BY_SEGMENT[segment]?.[targetPlanKey];
  if (!planInfo || planInfo.price <= 0) {
    const now = new Date();
    return {
      type: 'upgrade',
      amount_original: 0,
      amount_discount: 0,
      amount_final: 0,
      residual_credit: 0,
      current_plan_expires_at: now.toISOString(),
    };
  }
  const fullPriceResult = getPeriodPrice(planInfo, targetPeriod);
  const totalPriceNew = fullPriceResult.totalPrice;
  const monthsNew = fullPriceResult.months;

  const now = new Date();
  let currentPlanExpiresAt: Date;

  if (!currentRequest || !currentRequest.processed_at) {
    currentPlanExpiresAt = now;
    return {
      type: 'upgrade',
      amount_original: totalPriceNew,
      amount_discount:
        billingType === 'PIX' && targetPeriod !== 'monthly'
          ? Math.round(totalPriceNew * (PIX_DISCOUNT_PERCENT / 100) * 100) / 100
          : 0,
      amount_final:
        billingType === 'PIX' && targetPeriod !== 'monthly'
          ? Math.round(totalPriceNew * (1 - PIX_DISCOUNT_PERCENT / 100) * 100) /
            100
          : totalPriceNew,
      residual_credit: 0,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
    };
  }

  const startDate = new Date(currentRequest.processed_at);
  const monthsCurrent = billingPeriodToMonths(currentRequest.billing_period);
  currentPlanExpiresAt = addMonths(startDate, monthsCurrent);

  const totalMsCurrent = currentPlanExpiresAt.getTime() - startDate.getTime();
  const remainingMs = Math.max(
    0,
    currentPlanExpiresAt.getTime() - now.getTime(),
  );
  const remainingDays = remainingMs / (24 * 60 * 60 * 1000);
  const totalDaysCurrent = totalMsCurrent / (24 * 60 * 60 * 1000);
  const residualCredit =
    totalDaysCurrent <= 0
      ? 0
      : Math.round(
          currentRequest.amount_final *
            (remainingDays / totalDaysCurrent) *
            100,
        ) / 100;

  const currentPlanKey = currentRequest.plan_key_requested as PlanKey;
  const currentPeriod = (currentRequest.billing_period ??
    'monthly') as BillingPeriod;

  // Mesmo plano + mesmo período → bloquear (já é o plano atual)
  if (targetPlanKey === currentPlanKey && targetPeriod === currentPeriod) {
    return {
      type: 'current_plan',
      amount_original: totalPriceNew,
      amount_discount: 0,
      amount_final: 0,
      residual_credit: 0,
      current_plan_expires_at: currentPlanExpiresAt.toISOString(),
    };
  }

  const isPlanDowngrade =
    planOrder.indexOf(targetPlanKey) < planOrder.indexOf(currentPlanKey);
  const isPeriodDowngrade =
    planOrder.indexOf(targetPlanKey) === planOrder.indexOf(currentPlanKey) &&
    periodOrder(targetPeriod) < periodOrder(currentPeriod);
  const isDowngrade = isPlanDowngrade || isPeriodDowngrade;

  if (isDowngrade) {
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

  return {
    type: 'upgrade',
    amount_original: totalPriceNew,
    amount_discount: residualCredit + pixDiscount,
    amount_final: amountFinal,
    residual_credit: residualCredit,
    pix_discount_amount: pixDiscount,
    current_plan_expires_at: currentPlanExpiresAt.toISOString(),
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
    const { success, userId } = await getAuthenticatedUser();
    if (!success || !userId) {
      return {
        success: false,
        has_active_plan: false,
        error: 'Usuário não autenticado',
      };
    }
    const supabase = await createSupabaseServerClient();
    const pending = await getPendingUpgradeRequest(userId, supabase);
    if (pending) {
      return {
        success: true,
        has_active_plan: false,
        has_pending: true,
        calculation: undefined,
      };
    }
    const current = await getCurrentActiveRequest(userId, supabase);
    const calculation = await calculateUpgradePrice(
      current,
      targetPlanKey,
      targetPeriod,
      billingType,
      segment,
    );
    return {
      success: true,
      has_active_plan: !!current,
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
    .in('status', [
      'pending',
      'approved',
      'pending_cancellation',
    ])
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
    .select('id, created_at, processed_at, billing_period, plan_key_requested')
    .eq('profile_id', profileId)
    .eq('status', 'pending_cancellation')
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
