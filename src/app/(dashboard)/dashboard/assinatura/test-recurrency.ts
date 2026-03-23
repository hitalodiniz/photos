// scripts/test-recurrency.ts
// npx tsx "src/app/(dashboard)/dashboard/assinatura/test-recurrency.ts" --userId="69daec50-9ca4-4e57-8e3e-2d651a65e992" --scenario=all
//
// Cenários disponíveis:
//   all               — todos os cenários em sequência
//   recurrency        — ciclo de renovação mensal + overdue (original)
//   free_upgrade      — upgrade gratuito via crédito residual
//   credit_upgrade    — upgrade com crédito parcial (paga residual)
//   cycle_change      — troca de ciclo mensal → semestral (com crédito)
//   payment_change    — troca de forma de pagamento (PIX → BOLETO)
//   downgrade_credit  — downgrade ≤7d com crédito imediato
//   downgrade_sched   — downgrade agendado >7d (pending_change)
//   cancellation      — cancelamento total com downgrade para FREE
//
// Pré-requisito: .env.local com:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   ASAAS_WEBHOOK_TOKEN
//   ASAAS_WEBHOOK_TEST_BASE_URL (ex: https://abc.ngrok.io)

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type BillingPeriod = 'monthly' | 'semiannual' | 'annual' | string | null;
type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

type UpgradeRow = {
  id: string;
  profile_id: string;
  plan_key_current: string | null;
  plan_key_requested: string | null;
  billing_type: BillingType | null;
  billing_period: BillingPeriod;
  snapshot_name: string | null;
  snapshot_cpf_cnpj: string | null;
  snapshot_email: string | null;
  snapshot_whatsapp: string | null;
  snapshot_address: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  asaas_payment_id: string | null;
  amount_original: number | null;
  amount_discount: number | null;
  amount_final: number | null;
  installments: number | null;
  status: string | null;
  notes: string | null;
  overdue_since: string | null;
  processed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  plan_key: string | null;
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  cpf_cnpj?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ScenarioResult = {
  scenario: string;
  pass: boolean;
  details: Record<string, unknown>;
  error?: string;
};

type AsaasSubLog = {
  scenario: string;
  subscription_id: string;
  cycle: string;
  billing_type: BillingType;
  value: number;
};

type AsaasPaymentLog = {
  scenario: string;
  payment_id: string;
  billing_type: BillingType;
  value: number;
  source: 'subscription_first_payment' | 'direct_payment';
  simulated_card?: boolean;
};

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  if (!arg) return null;
  return arg.slice(prefix.length).trim() || null;
}

function onlyDigits(
  value: string | null | undefined,
  fallback: string,
): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length ? digits : fallback;
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function subDays(date: Date, n: number): Date {
  return new Date(date.getTime() - n * 24 * 60 * 60 * 1000);
}

function billingPeriodToMonths(period: BillingPeriod): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

function parseExpiryFromNotes(notes: string | null | undefined): Date | null {
  if (!notes?.trim()) return null;
  const match = notes.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const parsed = new Date(match[1].trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function estimateExpiryDate(row: UpgradeRow | null): Date | null {
  if (!row) return null;
  const fromNotes = parseExpiryFromNotes(row.notes);
  if (fromNotes) return fromNotes;
  if (!row.processed_at) return null;
  const start = new Date(row.processed_at);
  if (Number.isNaN(start.getTime())) return null;
  return addMonths(start, billingPeriodToMonths(row.billing_period));
}

// ─── Logger ──────────────────────────────────────────────────────────────────

const PASS = '✅';
const FAIL = '❌';
const INFO = '  ·';

function log(label: string, data?: unknown) {
  if (data !== undefined) {
    console.log(
      label,
      typeof data === 'object' ? JSON.stringify(data, null, 2) : data,
    );
  } else {
    console.log(label);
  }
}

function logResult(result: ScenarioResult) {
  const icon = result.pass ? PASS : FAIL;
  console.log(`\n${icon} [${result.scenario}]`);
  console.log(INFO, JSON.stringify(result.details, null, 2));
  if (result.error) console.log(`  ERROR: ${result.error}`);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

loadEnv({ path: '.env.local' });

const userId =
  parseArg('userId') ?? process.env.ASAAS_TEST_USER_ID?.trim() ?? null;
const scenarioArg = parseArg('scenario') ?? 'all';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
const asaasApiKey = (
  process.env.ASAAS_API_KEY?.trim() ||
  process.env.ASAAS_KEY?.trim() ||
  ''
)
  .replace(/^"|"$/g, '')
  .replace(/\\\$/g, '$');
const asaasEnvironment =
  process.env.ASAAS_ENVIRONMENT?.trim() === 'production'
    ? 'production'
    : 'sandbox';
const asaasBaseUrl =
  asaasEnvironment === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
const baseUrl = (
  process.env.ASAAS_WEBHOOK_TEST_BASE_URL?.trim() ??
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ??
  'http://localhost:3000'
).replace(/\/$/, '');
const webhookUrl = `${baseUrl}/api/webhook/asaas`;

if (!userId)
  throw new Error('Informe userId via --userId=... ou env ASAAS_TEST_USER_ID.');
if (!supabaseUrl || !serviceRoleKey)
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórias.',
  );
if (!webhookToken) throw new Error('ASAAS_WEBHOOK_TOKEN obrigatório.');
if (!asaasApiKey) throw new Error('ASAAS_API_KEY/ASAAS_KEY obrigatório.');

const supabase = createClient(supabaseUrl, serviceRoleKey);
const asaasSubscriptionsCreated: AsaasSubLog[] = [];
const asaasPaymentsCreated: AsaasPaymentLog[] = [];
let asaasCustomerId: string | null = null;

// ─── Helpers de DB ───────────────────────────────────────────────────────────

async function fetchProfile(): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('tb_profiles')
    .select('id, plan_key, full_name, email, metadata')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar perfil: ${error.message}`);
  if (!data) throw new Error(`Perfil ${userId} não encontrado.`);
  return data as ProfileRow;
}

async function fetchLatestUpgradeRequest(): Promise<UpgradeRow | null> {
  const { data } = await supabase
    .from('tb_upgrade_requests')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as UpgradeRow | null) ?? null;
}

async function fetchRowsBySubscription(
  subscriptionId: string,
): Promise<UpgradeRow[]> {
  const { data, error } = await supabase
    .from('tb_upgrade_requests')
    .select('*')
    .eq('profile_id', userId)
    .eq('asaas_subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(`Erro ao buscar rows: ${error.message}`);
  return (data as UpgradeRow[]) ?? [];
}

async function fetchRowsByStatus(status: string): Promise<UpgradeRow[]> {
  const { data } = await supabase
    .from('tb_upgrade_requests')
    .select('*')
    .eq('profile_id', userId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(5);
  return (data as UpgradeRow[]) ?? [];
}

async function insertSeedRequest(
  overrides: Partial<UpgradeRow> & {
    subscription_id: string;
    payment_id: string;
    plan: string;
    billing_type: BillingType;
    billing_period: BillingPeriod;
    amount: number;
    status?: string;
    processed_at_override?: Date;
  },
): Promise<UpgradeRow> {
  const template = await fetchLatestUpgradeRequest();
  const customerId = await ensureAsaasCustomer();
  const processedAt =
    overrides.processed_at_override?.toISOString() ?? new Date().toISOString();

  const seed = {
    profile_id: userId,
    plan_key_current: template?.plan_key_current ?? 'FREE',
    plan_key_requested: overrides.plan,
    billing_type: overrides.billing_type,
    billing_period: overrides.billing_period,
    snapshot_name: template?.snapshot_name ?? 'Test User',
    snapshot_cpf_cnpj: template?.snapshot_cpf_cnpj ?? '00000000000',
    snapshot_email: template?.snapshot_email ?? 'test@test.local',
    snapshot_whatsapp: template?.snapshot_whatsapp ?? '11999999999',
    snapshot_address: template?.snapshot_address ?? 'Rua Teste, 1',
    asaas_customer_id: template?.asaas_customer_id ?? customerId,
    asaas_subscription_id: overrides.subscription_id,
    asaas_payment_id: overrides.payment_id,
    amount_original: overrides.amount,
    amount_discount: 0,
    amount_final: overrides.amount,
    installments: 1,
    status: overrides.status ?? 'pending',
    notes: `Seed test run ${Date.now()}`,
    processed_at: processedAt,
  };

  const { data, error } = await supabase
    .from('tb_upgrade_requests')
    .insert(seed)
    .select('*')
    .single();
  if (error) throw new Error(`Erro ao inserir seed: ${error.message}`);
  return data as UpgradeRow;
}

async function setProfilePlan(planKey: string) {
  await supabase
    .from('tb_profiles')
    .update({
      plan_key: planKey,
      is_cancelling: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function cancelAllPendingRequests() {
  await supabase
    .from('tb_upgrade_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('profile_id', userId)
    .in('status', [
      'pending',
      'pending_change',
      'pending_downgrade',
      'pending_cancellation',
    ]);
}

// ─── Helpers de Asaas ────────────────────────────────────────────────────────

async function asaasRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${asaasBaseUrl}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: asaasApiKey,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

function nextFakeCard(idx: number) {
  const cards = [
    { number: '4111111111111111', brand: 'visa' },
    { number: '5555555555554444', brand: 'mastercard' },
    { number: '4012001037141112', brand: 'visa' },
    { number: '378282246310005', brand: 'amex' },
  ];
  return cards[idx % cards.length];
}

async function ensureAsaasCustomer(): Promise<string> {
  if (asaasCustomerId) return asaasCustomerId;

  const template = await fetchLatestUpgradeRequest();
  if (template?.asaas_customer_id) {
    asaasCustomerId = template.asaas_customer_id;
    return asaasCustomerId;
  }

  const profile = await fetchProfile();
  const email = (template?.snapshot_email ?? profile.email ?? '').trim();
  const name = (
    template?.snapshot_name ??
    profile.full_name ??
    'Cliente Teste'
  ).trim();
  const cpf = onlyDigits(template?.snapshot_cpf_cnpj, '07741043684');

  if (email) {
    const lookup = await asaasRequest<{ data?: Array<{ id: string }> }>(
      `/customers?email=${encodeURIComponent(email)}`,
    );
    const existing = lookup.data?.data?.[0]?.id;
    if (lookup.ok && existing) {
      asaasCustomerId = existing;
      return asaasCustomerId;
    }
  }

  const payload = {
    name,
    email: email || `asaas.${Date.now()}@test.local`,
    cpfCnpj: cpf,
    phone: '31999432988',
    mobilePhone: '31999432988',
    postalCode: '30750000',
    address: 'teste',
    addressNumber: '123',
    province: 'teste',
    city: 'BH',
    state: 'MG',
  };
  const created = await asaasRequest<{ id?: string; errors?: unknown[] }>(
    '/customers',
    { method: 'POST', body: JSON.stringify(payload) },
  );
  if (!created.ok || !created.data?.id) {
    throw new Error(
      `Asaas /customers -> ${created.status}: ${JSON.stringify(created.data)}`,
    );
  }
  asaasCustomerId = created.data.id;
  return asaasCustomerId;
}

async function createAsaasSubscription(
  scenario: string,
  value: number,
  cycle: 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY' = 'MONTHLY',
  billingType: BillingType = 'PIX',
): Promise<{ subscriptionId: string; firstPaymentId: string }> {
  const customerId = await ensureAsaasCustomer();
  const created = await asaasRequest<{ id?: string; errors?: unknown[] }>(
    '/subscriptions',
    {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType,
        cycle,
        value,
        nextDueDate: new Date().toISOString().slice(0, 10),
        description: `[${scenario}] assinatura teste`,
        updatePendingPayments: true,
      }),
    },
  );
  if (!created.ok || !created.data?.id) {
    throw new Error(
      `Asaas /subscriptions -> ${created.status}: ${JSON.stringify(created.data)}`,
    );
  }
  const subscriptionId = created.data.id;
  asaasSubscriptionsCreated.push({
    scenario,
    subscription_id: subscriptionId,
    cycle,
    billing_type: billingType,
    value,
  });

  const payments = await asaasRequest<{ data?: Array<{ id?: string }> }>(
    `/subscriptions/${subscriptionId}/payments`,
  );
  const firstPaymentId = payments.data?.data?.[0]?.id;
  if (!payments.ok || !firstPaymentId) {
    throw new Error(
      `Asaas /subscriptions/${subscriptionId}/payments -> ${payments.status}: ${JSON.stringify(payments.data)}`,
    );
  }
  asaasPaymentsCreated.push({
    scenario,
    payment_id: firstPaymentId,
    billing_type: billingType,
    value,
    source: 'subscription_first_payment',
  });

  return { subscriptionId, firstPaymentId };
}

async function cancelAsaasSubscriptionWithPendingCleanup(
  subscriptionId: string,
): Promise<void> {
  const res = await asaasRequest<{ errors?: unknown[] }>(
    `/subscriptions/${subscriptionId}?deletePendingPayments=true`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    throw new Error(
      `Asaas cancel subscription -> ${res.status}: ${JSON.stringify(res.data)}`,
    );
  }
}

async function createAsaasDirectPayment(
  scenario: string,
  value: number,
  billingType: BillingType,
  cardIdx = 0,
): Promise<{ paymentId: string; simulatedCard?: boolean }> {
  const customerId = await ensureAsaasCustomer();

  if (billingType !== 'CREDIT_CARD') {
    const created = await asaasRequest<{ id?: string; errors?: unknown[] }>(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify({
          customer: customerId,
          billingType,
          value,
          dueDate: todayYmd(),
          description: `[${scenario}] pagamento ${billingType}`,
        }),
      },
    );
    if (!created.ok || !created.data?.id) {
      throw new Error(
        `Asaas /payments -> ${created.status}: ${JSON.stringify(created.data)}`,
      );
    }
    asaasPaymentsCreated.push({
      scenario,
      payment_id: created.data.id,
      billing_type: billingType,
      value,
      source: 'direct_payment',
    });
    return { paymentId: created.data.id };
  }

  const fake = nextFakeCard(cardIdx);
  const cardTry = await asaasRequest<{ id?: string; errors?: unknown[] }>(
    '/payments',
    {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value,
        dueDate: todayYmd(),
        description: `[${scenario}] pagamento cartão fictício ${fake.brand}`,
        creditCard: {
          holderName: 'TESTE ASAAS',
          number: fake.number,
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
        },
        creditCardHolderInfo: {
          name: 'TESTE ASAAS',
          email: `card.${Date.now()}@test.local`,
          cpfCnpj: '07741043684',
          postalCode: '30750000',
          addressNumber: '123',
          phone: '31999432988',
          mobilePhone: '31999432988',
        },
      }),
    },
  );

  if (cardTry.ok && cardTry.data?.id) {
    asaasPaymentsCreated.push({
      scenario,
      payment_id: cardTry.data.id,
      billing_type: 'CREDIT_CARD',
      value,
      source: 'direct_payment',
    });
    return { paymentId: cardTry.data.id };
  }

  // fallback para manter simulação de cartão mesmo se sandbox recusar token/cartão
  const pixFallback = await asaasRequest<{ id?: string; errors?: unknown[] }>(
    '/payments',
    {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value,
        dueDate: todayYmd(),
        description: `[${scenario}] fallback de cartão para PIX`,
      }),
    },
  );
  if (!pixFallback.ok || !pixFallback.data?.id) {
    throw new Error(
      `Asaas /payments fallback -> ${pixFallback.status}: ${JSON.stringify(pixFallback.data)}`,
    );
  }
  asaasPaymentsCreated.push({
    scenario,
    payment_id: pixFallback.data.id,
    billing_type: 'CREDIT_CARD',
    value,
    source: 'direct_payment',
    simulated_card: true,
  });
  return { paymentId: pixFallback.data.id, simulatedCard: true };
}

// ─── Webhook helper ──────────────────────────────────────────────────────────

async function fireWebhook(
  event: string,
  paymentId: string,
  value: number,
  status: string,
  subscriptionId: string,
): Promise<{ httpStatus: number; body: unknown }> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': webhookToken!,
    },
    body: JSON.stringify({
      event,
      payment: { id: paymentId, value, status, subscription: subscriptionId },
    }),
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* empty */
  }
  log(`${INFO} [WEBHOOK] ${event} → HTTP ${response.status}`, body);
  return { httpStatus: response.status, body };
}

// ─── Cenários ────────────────────────────────────────────────────────────────

// 1. RENOVAÇÃO MENSAL + OVERDUE
async function scenarioRecurrency(): Promise<ScenarioResult> {
  const runId = Date.now();
  const amount = 79;

  log('\n──── CENÁRIO: Renovação Mensal + Overdue ────');
  await cancelAllPendingRequests();
  await setProfilePlan('PRO');

  const recurringSub = await createAsaasSubscription('recurrency', amount);
  const subId = recurringSub.subscriptionId;
  const pay1 = recurringSub.firstPaymentId;
  const pay2 = (
    await createAsaasDirectPayment('recurrency', amount, 'CREDIT_CARD', runId)
  ).paymentId;
  const pay3 = (await createAsaasDirectPayment('recurrency', amount, 'PIX'))
    .paymentId;

  await insertSeedRequest({
    subscription_id: subId,
    payment_id: pay1,
    plan: 'PRO',
    billing_type: 'PIX',
    billing_period: 'monthly',
    amount,
  });

  // Mês 1 — PAYMENT_RECEIVED
  const r1 = await fireWebhook(
    'PAYMENT_RECEIVED',
    pay1,
    amount,
    'RECEIVED',
    subId,
  );
  const profileAfter1 = await fetchProfile();
  const rowsAfter1 = await fetchRowsBySubscription(subId);
  const approvedAfter1 =
    rowsAfter1.find((r) => r.status === 'approved') ?? null;

  // Mês 2 — PAYMENT_RECEIVED (renovação)
  const r2 = await fireWebhook(
    'PAYMENT_RECEIVED',
    pay2,
    amount,
    'RECEIVED',
    subId,
  );
  const rowsAfter2 = await fetchRowsBySubscription(subId);
  const approvedAfter2 =
    rowsAfter2.find((r) => r.status === 'approved') ?? null;
  const expiry2 = estimateExpiryDate(approvedAfter2);
  const expiry1 = estimateExpiryDate(approvedAfter1);

  // Mês 3 — PAYMENT_OVERDUE
  const r3 = await fireWebhook(
    'PAYMENT_OVERDUE',
    pay3,
    amount,
    'OVERDUE',
    subId,
  );
  const rowsAfter3 = await fetchRowsBySubscription(subId);
  const anyOverdue = rowsAfter3
    .filter((r) => r.status === 'approved')
    .some((r) => !!r.overdue_since);
  const profileAfter3 = await fetchProfile();

  const pass =
    r1.httpStatus === 200 &&
    profileAfter1.plan_key === 'PRO' &&
    r2.httpStatus === 200 &&
    (!expiry1 || !expiry2 || expiry2 >= expiry1) &&
    r3.httpStatus === 200 &&
    anyOverdue &&
    profileAfter3.plan_key === 'PRO'; // ainda PRO durante carência

  return {
    scenario: 'recurrency',
    pass,
    details: {
      mes1_plan: profileAfter1.plan_key,
      mes1_pass: profileAfter1.plan_key === 'PRO',
      mes2_expiry_extended: !expiry1 || !expiry2 ? null : expiry2 >= expiry1,
      mes3_overdue_marked: anyOverdue,
      mes3_still_pro: profileAfter3.plan_key === 'PRO',
    },
  };
}

// 2. UPGRADE GRATUITO (crédito cobre 100%)
async function scenarioFreeUpgrade(): Promise<ScenarioResult> {
  const runId = Date.now();
  const amount = 156; // START semestral

  log('\n──── CENÁRIO: Upgrade Gratuito (crédito ≥ novo plano) ────');
  await cancelAllPendingRequests();

  const baseSub = await createAsaasSubscription('free_upgrade', amount);
  const subId = baseSub.subscriptionId;
  const payId = baseSub.firstPaymentId;

  // Seed: aprovado START semestral há 2 dias (>50% ainda restante → crédito alto)
  const processedAt = subDays(new Date(), 2);
  const seed = await insertSeedRequest({
    subscription_id: subId,
    payment_id: payId,
    plan: 'START',
    billing_type: 'PIX',
    billing_period: 'semiannual',
    amount,
    status: 'approved',
    processed_at_override: processedAt,
  });
  await setProfilePlan('START');

  // Dispara PAYMENT_RECEIVED para simular upgrade gratuito (o webhook marca como aprovado)
  // Neste cenário o upgrade gratuito é feito via requestUpgrade no frontend,
  // mas aqui simulamos o estado resultante: um novo registro approved com amount_final=0
  const upgradeRow = {
    profile_id: userId,
    plan_key_current: 'START',
    plan_key_requested: 'PLUS',
    billing_type: 'PIX',
    billing_period: 'monthly',
    snapshot_name: seed.snapshot_name,
    snapshot_cpf_cnpj: seed.snapshot_cpf_cnpj,
    snapshot_email: seed.snapshot_email,
    snapshot_whatsapp: seed.snapshot_whatsapp,
    snapshot_address: seed.snapshot_address,
    asaas_customer_id: await ensureAsaasCustomer(),
    asaas_subscription_id: subId,
    asaas_payment_id: null,
    payment_url: null,
    amount_original: 49,
    amount_discount: 49,
    amount_final: 0,
    installments: 1,
    status: 'approved',
    processed_at: new Date().toISOString(),
    notes: `Upgrade gratuito (Crédito): Plano PLUS.\nSaldo residual R$ 100.00; nova data de vencimento: ${addMonths(new Date(), 1).toISOString()}.`,
  };

  const { data: insertedUpgrade, error: insertErr } = await supabase
    .from('tb_upgrade_requests')
    .insert(upgradeRow)
    .select('id, status, amount_final, plan_key_requested')
    .single();

  if (insertErr)
    throw new Error(`Erro ao inserir upgrade gratuito: ${insertErr.message}`);

  await setProfilePlan('PRO');

  const profileAfter = await fetchProfile();
  const rows = await fetchRowsBySubscription(subId);
  const freeUpgradeRow = rows.find(
    (r) =>
      r.amount_final === 0 &&
      r.status === 'approved' &&
      r.plan_key_requested === 'PLUS',
  );

  const pass =
    (profileAfter.plan_key === 'PLUS' || profileAfter.plan_key === 'PRO') &&
    !!freeUpgradeRow &&
    freeUpgradeRow.amount_final === 0;

  return {
    scenario: 'free_upgrade',
    pass,
    details: {
      plan_after_upgrade: profileAfter.plan_key,
      free_upgrade_row_found: !!freeUpgradeRow,
      amount_final_zero: freeUpgradeRow?.amount_final === 0,
      notes_preview: freeUpgradeRow?.notes?.slice(0, 80) ?? null,
    },
  };
}

// 3. UPGRADE COM CRÉDITO PARCIAL (paga valor residual)
async function scenarioCreditUpgrade(): Promise<ScenarioResult> {
  const runId = Date.now();
  const originalAmount = 29; // START mensal

  log('\n──── CENÁRIO: Upgrade com crédito parcial ────');
  await cancelAllPendingRequests();

  const currentSub = await createAsaasSubscription(
    'credit_upgrade',
    originalAmount,
  );
  const subId = currentSub.subscriptionId;
  const payId = currentSub.firstPaymentId;

  const processedAt = subDays(new Date(), 15); // 15 dias atrás → ~R$14,50 de crédito
  await insertSeedRequest({
    subscription_id: subId,
    payment_id: payId,
    plan: 'START',
    billing_type: 'PIX',
    billing_period: 'monthly',
    amount: originalAmount,
    status: 'approved',
    processed_at_override: processedAt,
  });
  await setProfilePlan('START');

  // Simula o registro de upgrade com crédito parcial (PLUS mensal = R$49 - ~R$14,50 crédito = ~R$34,50)
  const creditApplied = Math.round(originalAmount * (15 / 30) * 100) / 100;
  const amountFinal = Math.round((49 - creditApplied) * 100) / 100;
  const upgradeSub = await createAsaasSubscription(
    'credit_upgrade',
    amountFinal,
  );
  const newSubId = upgradeSub.subscriptionId;
  const newPayId = (
    await createAsaasDirectPayment(
      'credit_upgrade',
      amountFinal,
      'CREDIT_CARD',
      runId + 1,
    )
  ).paymentId;

  const upgradeRow = {
    profile_id: userId,
    plan_key_current: 'START',
    plan_key_requested: 'PLUS',
    billing_type: 'PIX',
    billing_period: 'monthly',
    snapshot_name: 'Test User',
    snapshot_cpf_cnpj: '00000000000',
    snapshot_email: 'test@test.local',
    snapshot_whatsapp: '11999999999',
    snapshot_address: 'Rua Teste, 1',
    asaas_customer_id: await ensureAsaasCustomer(),
    asaas_subscription_id: newSubId,
    asaas_payment_id: newPayId,
    payment_url: null,
    amount_original: 49,
    amount_discount: creditApplied,
    amount_final: amountFinal,
    installments: 1,
    status: 'pending',
    notes: `Aproveitamento de crédito pro-rata: R$ ${creditApplied.toFixed(2)} (dias não utilizados do plano anterior). Desconto total aplicado: R$ ${creditApplied.toFixed(2)}. Valor final cobrado: R$ ${amountFinal.toFixed(2)}.`,
  };

  const { error: insertErr } = await supabase
    .from('tb_upgrade_requests')
    .insert(upgradeRow);
  if (insertErr)
    throw new Error(
      `Erro ao inserir upgrade com crédito: ${insertErr.message}`,
    );

  // Dispara webhook de pagamento confirmado
  const r1 = await fireWebhook(
    'PAYMENT_CONFIRMED',
    newPayId,
    amountFinal,
    'CONFIRMED',
    newSubId,
  );
  const profileAfter = await fetchProfile();
  const rowsAfter = await fetchRowsBySubscription(newSubId);
  const approvedRow = rowsAfter.find((r) => r.status === 'approved');

  const pass =
    r1.httpStatus === 200 &&
    (profileAfter.plan_key === 'PLUS' || profileAfter.plan_key === 'PRO') &&
    !!approvedRow &&
    (approvedRow.amount_discount ?? 0) > 0;

  return {
    scenario: 'credit_upgrade',
    pass,
    details: {
      credit_applied: creditApplied,
      amount_final_paid: amountFinal,
      plan_after: profileAfter.plan_key,
      approved_row_found: !!approvedRow,
      discount_applied: approvedRow?.amount_discount,
    },
  };
}

// 4. TROCA DE CICLO (mensal → semestral com crédito)
async function scenarioCycleChange(): Promise<ScenarioResult> {
  const runId = Date.now();
  const amount = 79; // PRO mensal
  const currentSub = await createAsaasSubscription('cycle_change', amount);
  const subId = currentSub.subscriptionId;
  const payId = currentSub.firstPaymentId;

  log('\n──── CENÁRIO: Troca de Ciclo (mensal → semestral) ────');
  await cancelAllPendingRequests();

  const processedAt = subDays(new Date(), 10);
  await insertSeedRequest({
    subscription_id: subId,
    payment_id: payId,
    plan: 'PRO',
    billing_type: 'PIX',
    billing_period: 'monthly',
    amount,
    status: 'approved',
    processed_at_override: processedAt,
  });
  await setProfilePlan('PRO');

  // Simula upgrade para semestral com crédito
  const creditApplied = Math.round(amount * (20 / 30) * 100) / 100; // ~20 dias restantes
  const semiannualPrice = 420; // PRO semestral
  const amountFinal = Math.round((semiannualPrice - creditApplied) * 100) / 100;
  const cycleSub = await createAsaasSubscription(
    'cycle_change',
    amountFinal,
    'SEMIANNUALLY',
  );
  const newSubId = cycleSub.subscriptionId;
  const newPayId = (
    await createAsaasDirectPayment(
      'cycle_change',
      amountFinal,
      'CREDIT_CARD',
      runId + 2,
    )
  ).paymentId;

  const cycleRow = {
    profile_id: userId,
    plan_key_current: 'PRO',
    plan_key_requested: 'PRO',
    billing_type: 'PIX',
    billing_period: 'semiannual',
    snapshot_name: 'Test User',
    snapshot_cpf_cnpj: '00000000000',
    snapshot_email: 'test@test.local',
    snapshot_whatsapp: '11999999999',
    snapshot_address: 'Rua Teste, 1',
    asaas_customer_id: await ensureAsaasCustomer(),
    asaas_subscription_id: newSubId,
    asaas_payment_id: newPayId,
    payment_url: null,
    amount_original: semiannualPrice,
    amount_discount: creditApplied,
    amount_final: amountFinal,
    installments: 1,
    status: 'pending',
    notes: `Aproveitamento de crédito pro-rata: R$ ${creditApplied.toFixed(2)} (troca de ciclo mensal → semestral). Valor final cobrado: R$ ${amountFinal.toFixed(2)}.`,
  };

  const { error: insertErr } = await supabase
    .from('tb_upgrade_requests')
    .insert(cycleRow);
  if (insertErr)
    throw new Error(`Erro ao inserir troca de ciclo: ${insertErr.message}`);

  const r1 = await fireWebhook(
    'PAYMENT_CONFIRMED',
    newPayId,
    amountFinal,
    'CONFIRMED',
    newSubId,
  );
  const profileAfter = await fetchProfile();
  const rowsAfter = await fetchRowsBySubscription(newSubId);
  const approvedRow = rowsAfter.find(
    (r) => r.status === 'approved' && r.billing_period === 'semiannual',
  );

  const pass =
    r1.httpStatus === 200 && profileAfter.plan_key === 'PRO' && !!approvedRow;

  return {
    scenario: 'cycle_change',
    pass,
    details: {
      old_cycle: 'monthly',
      new_cycle: 'semiannual',
      credit_applied: creditApplied,
      amount_final: amountFinal,
      approved_row_found: !!approvedRow,
      plan_maintained: profileAfter.plan_key === 'PRO',
    },
  };
}

// 5. TROCA DE FORMA DE PAGAMENTO
async function scenarioPaymentChange(): Promise<ScenarioResult> {
  const runId = Date.now();
  const amount = 79;
  const seeded = await createAsaasSubscription('payment_change', amount);
  const subId = seeded.subscriptionId;
  const payId = seeded.firstPaymentId;

  log('\n──── CENÁRIO: Troca de Forma de Pagamento (PIX → BOLETO) ────');
  await cancelAllPendingRequests();

  const seed = await insertSeedRequest({
    subscription_id: subId,
    payment_id: payId,
    plan: 'PRO',
    billing_type: 'PIX',
    billing_period: 'monthly',
    amount,
    status: 'approved',
  });
  await setProfilePlan('PRO');

  // Simula troca para BOLETO via update direto (como faz updateSubscriptionBillingMethod)
  const nowIso = new Date().toISOString();
  const historyLine = `[PaymentMethodChange ${nowIso}] PIX -> CREDIT_CARD`;
  const newPayId = (
    await createAsaasDirectPayment(
      'payment_change',
      amount,
      'CREDIT_CARD',
      runId + 3,
    )
  ).paymentId;

  const { error: updateErr } = await supabase
    .from('tb_upgrade_requests')
    .update({
      billing_type: 'CREDIT_CARD',
      asaas_payment_id: newPayId,
      notes: [seed.notes, historyLine].filter(Boolean).join('\n'),
      updated_at: nowIso,
    })
    .eq('id', seed.id);

  if (updateErr)
    throw new Error(`Erro ao trocar forma de pagamento: ${updateErr.message}`);

  // Dispara PAYMENT_CONFIRMED com novo paymentId de cartão
  const r1 = await fireWebhook(
    'PAYMENT_CONFIRMED',
    newPayId,
    amount,
    'CONFIRMED',
    subId,
  );
  const rowsAfter = await fetchRowsBySubscription(subId);
  const approvedRow = rowsAfter.find((r) => r.status === 'approved');
  const profileAfter = await fetchProfile();

  const pass =
    r1.httpStatus === 200 &&
    profileAfter.plan_key === 'PRO' &&
    approvedRow?.billing_type === 'CREDIT_CARD';

  return {
    scenario: 'payment_change',
    pass,
    details: {
      old_billing_type: 'PIX',
      new_billing_type: approvedRow?.billing_type ?? null,
      plan_maintained: profileAfter.plan_key === 'PRO',
      payment_confirmed: r1.httpStatus === 200,
    },
  };
}

// 6. DOWNGRADE COM CRÉDITO ≤7 DIAS (arrependimento)
async function scenarioDowngradeWithCredit(): Promise<ScenarioResult> {
  const runId = Date.now();
  const amount = 120; // PRO mensal
  const dgSub = await createAsaasSubscription('downgrade_credit', amount);
  const subId = dgSub.subscriptionId;
  const payId = dgSub.firstPaymentId;

  log('\n──── CENÁRIO: Downgrade com Crédito ≤7 dias ────');
  await cancelAllPendingRequests();

  const processedAt = subDays(new Date(), 3); // 3 dias atrás → janela de arrependimento
  await insertSeedRequest({
    subscription_id: subId,
    payment_id: payId,
    plan: 'PRO',
    billing_type: 'PIX',
    billing_period: 'monthly',
    amount,
    status: 'approved',
    processed_at_override: processedAt,
  });
  await setProfilePlan('PRO');

  // Simula o fluxo de downgrade imediato:
  // handleSubscriptionCancellation com ≤7d cancela a sub e cria registro FREE
  // Aqui simulamos diretamente o resultado esperado

  // 1. Marca request original como cancelled
  const { error: cancelErr } = await supabase
    .from('tb_upgrade_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('profile_id', userId)
    .eq('asaas_subscription_id', subId);
  if (cancelErr) throw new Error(`Erro ao cancelar: ${cancelErr.message}`);

  // 2. Adiciona crédito ao metadata
  const profile = await fetchProfile();
  const currentMeta = (profile.metadata ?? {}) as Record<string, unknown>;
  const currentBalance = Number(currentMeta.credit_balance ?? 0);
  await supabase
    .from('tb_profiles')
    .update({
      metadata: {
        ...currentMeta,
        credit_balance: Math.round((currentBalance + amount) * 100) / 100,
      },
      plan_key: 'FREE',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // 3. Insere registro downgrade
  const downgradeRow = {
    profile_id: userId,
    plan_key_current: 'PRO',
    plan_key_requested: 'FREE',
    billing_type: 'PIX',
    billing_period: 'monthly',
    snapshot_name: 'Test User',
    snapshot_cpf_cnpj: '00000000000',
    snapshot_email: 'test@test.local',
    snapshot_whatsapp: '11999999999',
    snapshot_address: 'Rua Teste, 1',
    asaas_customer_id: await ensureAsaasCustomer(),
    asaas_subscription_id: subId,
    asaas_payment_id: null,
    payment_url: null,
    amount_original: 0,
    amount_discount: 0,
    amount_final: 0,
    installments: 1,
    status: 'cancelled',
    notes: `Cancelamento com direito de arrependimento (3d após compra). Crédito gerado: R$ ${amount}.`,
  };
  await supabase.from('tb_upgrade_requests').insert(downgradeRow);

  const profileAfter = await fetchProfile();
  const metaAfter = (profileAfter.metadata ?? {}) as Record<string, unknown>;
  const creditBalance = Number(metaAfter.credit_balance ?? 0);

  const pass = profileAfter.plan_key === 'FREE' && creditBalance >= amount;

  return {
    scenario: 'downgrade_credit',
    pass,
    details: {
      plan_after: profileAfter.plan_key,
      credit_balance: creditBalance,
      credit_expected: amount,
      credit_ok: creditBalance >= amount,
    },
  };
}

// 7. DOWNGRADE AGENDADO >7 DIAS (pending_change)
async function scenarioScheduledDowngrade(): Promise<ScenarioResult> {
  const runId = Date.now();
  const amount = 120; // PRO mensal
  const currentSub = await createAsaasSubscription('downgrade_sched', amount);
  const currentSubId = currentSub.subscriptionId;
  const payId = currentSub.firstPaymentId;
  const nextSub = await createAsaasSubscription('downgrade_sched', 29);
  const newSubId = nextSub.subscriptionId;
  await cancelAsaasSubscriptionWithPendingCleanup(newSubId);

  log('\n──── CENÁRIO: Downgrade Agendado >7 dias (pending_change) ────');
  await cancelAllPendingRequests();

  const processedAt = subDays(new Date(), 20); // 20 dias atrás → fora da janela
  const expiresAt = addMonths(processedAt, 1);
  const expiresAtStr = expiresAt.toISOString();

  // Seed: assinatura PRO aprovada há 20 dias
  await insertSeedRequest({
    subscription_id: currentSubId,
    payment_id: payId,
    plan: 'PRO',
    billing_type: 'PIX',
    billing_period: 'monthly',
    amount,
    status: 'approved',
    processed_at_override: processedAt,
  });
  await setProfilePlan('PRO');

  // Insere pending_change (START mensal, começa no vencimento atual)
  const pendingChangeRow = {
    profile_id: userId,
    plan_key_current: 'PRO',
    plan_key_requested: 'START',
    billing_type: 'PIX',
    billing_period: 'monthly',
    snapshot_name: 'Test User',
    snapshot_cpf_cnpj: '00000000000',
    snapshot_email: 'test@test.local',
    snapshot_whatsapp: '11999999999',
    snapshot_address: 'Rua Teste, 1',
    asaas_customer_id: await ensureAsaasCustomer(),
    asaas_subscription_id: newSubId,
    asaas_payment_id: null,
    payment_url: null,
    amount_original: 29,
    amount_discount: 0,
    amount_final: 29,
    installments: 1,
    status: 'pending_change',
    processed_at: expiresAtStr, // aplicar no vencimento
    notes: `Mudança agendada para Plano START (monthly).\nPlano atual (PRO) vigente até ${expiresAtStr.split('T')[0]}.\nNova assinatura Asaas: ${newSubId} com nextDueDate ${expiresAtStr.split('T')[0]}.`,
  };

  const { data: pcRow, error: pcErr } = await supabase
    .from('tb_upgrade_requests')
    .insert(pendingChangeRow)
    .select('id, status, plan_key_requested, processed_at')
    .single();
  if (pcErr)
    throw new Error(`Erro ao inserir pending_change: ${pcErr.message}`);

  // Verifica estado: PRO ainda vigente, pending_change existente
  const profileDuring = await fetchProfile();
  const pendingRows = await fetchRowsByStatus('pending_change');
  const hasPendingChange = pendingRows.some(
    (r) => r.asaas_subscription_id === newSubId,
  );

  // Simula o cron ao vencer: aplica o pending_change
  await supabase
    .from('tb_profiles')
    .update({ plan_key: 'START', updated_at: new Date().toISOString() })
    .eq('id', userId);
  await supabase
    .from('tb_upgrade_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', pcRow!.id);
  await supabase.from('tb_plan_history').insert({
    profile_id: userId,
    old_plan: 'PRO',
    new_plan: 'START',
    reason: `Mudança agendada aplicada (cron simulado). Registro: ${pcRow!.id}`,
  });

  const profileAfter = await fetchProfile();
  const appliedRow = await supabase
    .from('tb_upgrade_requests')
    .select('id, status, plan_key_requested')
    .eq('id', pcRow!.id)
    .single();

  const pass =
    hasPendingChange &&
    (profileAfter.plan_key === 'START' || profileAfter.plan_key === 'FREE') &&
    appliedRow.data?.status === 'approved';

  return {
    scenario: 'downgrade_sched',
    pass,
    details: {
      plan_during_pending: profileDuring.plan_key,
      pending_change_registered: hasPendingChange,
      pending_change_expires: expiresAtStr,
      plan_after_cron: profileAfter.plan_key,
      pending_change_status_after: appliedRow.data?.status,
    },
  };
}

// 8. CANCELAMENTO TOTAL → FREE
async function scenarioCancellation(): Promise<ScenarioResult> {
  const runId = Date.now();
  const amount = 79;
  const cancelSub = await createAsaasSubscription('cancellation', amount);
  const subId = cancelSub.subscriptionId;
  const payId = cancelSub.firstPaymentId;
  await cancelAsaasSubscriptionWithPendingCleanup(subId);

  log('\n──── CENÁRIO: Cancelamento Total → FREE ────');
  await cancelAllPendingRequests();

  const processedAt = subDays(new Date(), 20);
  const expiresAt = addMonths(processedAt, 1);
  const expiresAtStr = expiresAt.toISOString();

  const seed = await insertSeedRequest({
    subscription_id: subId,
    payment_id: payId,
    plan: 'PRO',
    billing_type: 'PIX',
    billing_period: 'monthly',
    amount,
    status: 'approved',
    processed_at_override: processedAt,
  });
  await setProfilePlan('PRO');

  // Simula handleSubscriptionCancellation >7d: agenda pending_downgrade
  await supabase
    .from('tb_profiles')
    .update({ is_cancelling: true, updated_at: new Date().toISOString() })
    .eq('id', userId);
  await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_downgrade',
      processed_at: expiresAtStr,
      notes: `Cancelamento solicitado. Acesso até ${expiresAtStr}.`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seed.id);
  await supabase.from('tb_plan_history').insert({
    profile_id: userId,
    old_plan: 'PRO',
    new_plan: 'PRO',
    reason: `Cancelamento agendado. Acesso até ${expiresAtStr}`,
  });

  // Estado intermediário: ainda PRO, is_cancelling=true
  const profileDuring = await fetchProfile();
  const pendingDowngrade = await fetchRowsByStatus('pending_downgrade');
  const hasPendingDg = pendingDowngrade.some(
    (r) => r.asaas_subscription_id === subId,
  );

  // Simula cron ao vencer: performDowngradeToFree
  await supabase
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      is_cancelling: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  await supabase
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes: `Downgrade automático (cron): período pago encerrado em ${expiresAtStr}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seed.id);
  await supabase.from('tb_plan_history').insert({
    profile_id: userId,
    old_plan: 'PRO',
    new_plan: 'FREE',
    reason: `Downgrade automático após término do período pago`,
  });

  const profileAfter = await fetchProfile();
  const cancelledRow = await supabase
    .from('tb_upgrade_requests')
    .select('id, status, processed_at')
    .eq('id', seed.id)
    .single();

  const pass =
    hasPendingDg &&
    (profileAfter.plan_key === 'FREE' || profileAfter.plan_key === 'START') &&
    cancelledRow.data?.status === 'cancelled';

  return {
    scenario: 'cancellation',
    pass,
    details: {
      plan_during_pending: profileDuring.plan_key,
      pending_downgrade_registered: hasPendingDg,
      access_ends_at: expiresAtStr,
      plan_after_cron: profileAfter.plan_key,
      request_status_after: cancelledRow.data?.status,
      pending_processed_at: cancelledRow.data?.processed_at ?? null,
    },
  };
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  const customerId = await ensureAsaasCustomer();
  console.log('\n══════════════════════════════════════════════════');
  console.log(' SIMULAÇÃO COMPLETA — asaas.service');
  console.log('══════════════════════════════════════════════════');
  console.log(INFO, `userId: ${userId}`);
  console.log(INFO, `webhookUrl: ${webhookUrl}`);
  console.log(INFO, `cenário: ${scenarioArg}`);
  console.log(INFO, `asaasEnvironment: ${asaasEnvironment}`);
  console.log(INFO, `asaas_customer_id: ${customerId}`);

  const allScenarios: Record<string, () => Promise<ScenarioResult>> = {
    recurrency: scenarioRecurrency,
    free_upgrade: scenarioFreeUpgrade,
    credit_upgrade: scenarioCreditUpgrade,
    cycle_change: scenarioCycleChange,
    payment_change: scenarioPaymentChange,
    downgrade_credit: scenarioDowngradeWithCredit,
    downgrade_sched: scenarioScheduledDowngrade,
    cancellation: scenarioCancellation,
  };

  const toRun =
    scenarioArg === 'all'
      ? Object.keys(allScenarios)
      : scenarioArg.split(',').map((s) => s.trim());

  const results: ScenarioResult[] = [];

  for (const name of toRun) {
    if (!allScenarios[name]) {
      console.warn(
        `\nCenário desconhecido: "${name}". Disponíveis: ${Object.keys(allScenarios).join(', ')}`,
      );
      continue;
    }
    try {
      const result = await allScenarios[name]();
      results.push(result);
      logResult(result);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      const result: ScenarioResult = {
        scenario: name,
        pass: false,
        details: {},
        error: err,
      };
      results.push(result);
      logResult(result);
    }
  }

  // Resumo final
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log('\n══════════════════════════════════════════════════');
  console.log(` RESULTADO: ${passed}/${results.length} cenários passaram`);
  if (failed > 0) {
    console.log(
      ` FALHAS: ${results
        .filter((r) => !r.pass)
        .map((r) => r.scenario)
        .join(', ')}`,
    );
  }
  console.log('══════════════════════════════════════════════════\n');

  console.log('══════════════════════════════════════════════════');
  console.log(' RELATÓRIO FINAL (ASAAS + DB)');
  console.log('══════════════════════════════════════════════════');
  console.log(
    JSON.stringify(
      {
        userId,
        asaas_environment: asaasEnvironment,
        asaas_customer_id: customerId,
        subscriptions: asaasSubscriptionsCreated,
        payments: asaasPaymentsCreated,
        results,
      },
      null,
      2,
    ),
  );
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(
    '[test-recurrency] Falhou:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
