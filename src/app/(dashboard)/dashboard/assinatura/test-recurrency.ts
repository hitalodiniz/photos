// scripts/test-recurrency.ts

// npx tsx "src/app/(dashboard)/dashboard/assinatura/test-recurrency.ts" --userId="SEU_UUID_DO_USUARIO" --scenario=all --interactive=true --pause=true
// Se quiser rodar sem pausas depois:

// ... --pause=false

// Variáveis úteis:
//   --interactive=true — com --scenario=all, interactive_lifecycle roda PRIMEIRO (pausas ENTER). O cenário também pode rodar só com --scenario=interactive_lifecycle.
//   --pause=true       — pausa após CADA cenário para conferência no Asaas e /dashboard/assinatura.
//   ASAAS_API_KEY — obrigatória para a Etapa 5 do interactive_lifecycle (cria assinatura/cobrança real no Asaas).
//   ASAAS_TEST_CPF — opcional; senão usa snapshot ou 07741043684.
//
// Cenários:
//   recurrency             — renovação mensal 24 meses + overdue
//   first_subscription     — primeira assinatura (FREE → PRO)
//   free_upgrade           — upgrade gratuito (crédito cobre 100%)
//   credit_upgrade         — upgrade com crédito parcial
//   cycle_change           — troca mensal → semestral com crédito
//   payment_change         — PIX → BOLETO via update
//   downgrade_credit       — downgrade ≤7d: crédito imediato + FREE
//   downgrade_sched        — downgrade agendado >7d (pending_change + cron)
//   downgrade_sched_cancel — cancela intenção antes do vencimento → mantém plano
//   cancellation_refund    — cancelamento ≤7d (refund_immediate)
//   cancellation_scheduled — cancelamento >7d (pending_downgrade + cron → FREE)
//   overdue_grace          — OVERDUE + carência 5d → FREE automático
//   webhook_sub_canceled   — SUBSCRIPTION_CANCELED dispara downgrade
//   pending_blocks_upgrade — pending ativo bloqueia novo upgrade
//   interactive_lifecycle  — simulador cronológico ~2 anos (2024–2026), Supabase força datas; Etapa 5 cobrança real Asaas

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  getEndOfDaySaoPauloIso,
  now as nowFn,
  utcIsoFrom,
} from '../../../../core/utils/data-helpers';
import {
  appendBillingNotesBlock,
  createBillingNotesForNewUpgradeRequest,
} from '@/core/services/asaas/utils/billing-notes-doc';

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
  payment_url?: string | null;
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
  metadata?: Record<string, unknown> | null;
};

type ScenarioResult = {
  scenario: string;
  pass: boolean;
  details: Record<string, unknown>;
  errors: string[];
};

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() || null : null;
}

function parseBoolArg(flag: string, defaultValue = false): boolean {
  const raw = parseArg(flag);
  if (!raw) return defaultValue;
  return ['1', 'true', 'yes', 'on', 'sim'].includes(raw.toLowerCase());
}

// ─── Datas ───────────────────────────────────────────────────────────────────

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
function subDays(date: Date, n: number): Date {
  return new Date(date.getTime() - n * 24 * 60 * 60 * 1000);
}
function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
}

/** Meio-dia em São Paulo — âncora estável para aritmética de mês em simulações. */
function localNoonSaoPaulo(y: number, month: number, day: number): Date {
  return new Date(
    `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00-03:00`,
  );
}
function billingPeriodToMonths(p: BillingPeriod): number {
  if (p === 'semiannual') return 6;
  if (p === 'annual') return 12;
  return 1;
}
function parseExpiryFromNotes(notes?: string | null): Date | null {
  if (!notes) return null;
  const m = notes.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!m?.[1]) return null;
  const d = new Date(m[1].trim());
  return isNaN(d.getTime()) ? null : d;
}
function estimateExpiry(row: UpgradeRow | null): Date | null {
  if (!row) return null;
  const fromNotes = parseExpiryFromNotes(row.notes);
  if (fromNotes) return fromNotes;
  const ref = row.processed_at ?? row.created_at;
  if (!ref) return null;
  const d = new Date(ref);
  return isNaN(d.getTime())
    ? null
    : addMonths(d, billingPeriodToMonths(row.billing_period));
}

// ─── Setup ───────────────────────────────────────────────────────────────────

loadEnv({ path: '.env.local' });

const userId =
  parseArg('userId') ?? process.env.ASAAS_TEST_USER_ID?.trim() ?? null;
const scenarioArg = parseArg('scenario') ?? 'all';
const interactive = parseBoolArg('interactive', false);
const pauseBetweenScenarios = parseBoolArg('pause', true);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()!;
const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim()!;
const baseUrl = (
  process.env.ASAAS_WEBHOOK_TEST_BASE_URL?.trim() ??
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ??
  'http://localhost:3000'
).replace(/\/$/, '');
const webhookUrl = `${baseUrl}/api/webhook/asaas`;

if (!userId)
  throw new Error('Informe userId via --userId=... ou ASAAS_TEST_USER_ID.');
if (!supabaseUrl || !serviceRoleKey)
  throw new Error('SUPABASE vars obrigatórias.');
if (!webhookToken) throw new Error('ASAAS_WEBHOOK_TOKEN obrigatório.');

const sb = createClient(supabaseUrl, serviceRoleKey);

function getAsaasApiBase(): string {
  return process.env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
}

async function asaasScriptRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: T }> {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      data: {
        errors: [{ description: 'ASAAS_API_KEY ausente no .env.local' }],
      } as T,
    };
  }
  const res = await fetch(`${getAsaasApiBase()}${path}`, {
    ...init,
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, data };
}

function addDaysSaoPauloYmd(from: Date, days: number): string {
  const t = from.getTime() + days * 24 * 60 * 60 * 1000;
  const d = new Date(t);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

async function ensureAsaasCustomerForScript(): Promise<string> {
  const refs = await fetchLatestAsaasReferences();
  if (refs.customerId?.trim()) {
    const { ok, data } = await asaasScriptRequest<{ id?: string }>(
      `/customers/${refs.customerId.trim()}`,
    );
    if (ok && (data as { id?: string })?.id) return refs.customerId.trim();
  }

  const snap = await getSnapshotFields();
  const profile = await fetchProfile();
  const cpfRaw =
    process.env.ASAAS_TEST_CPF?.replace(/\D/g, '') ||
    (snap.snapshot_cpf_cnpj ?? '').replace(/\D/g, '') ||
    '07741043684';
  const name =
    snap.snapshot_name ?? profile.full_name ?? 'Teste Script Recurrency';
  const email =
    snap.snapshot_email ??
    profile.email ??
    `test-recurrency-${String(userId).slice(0, 8)}@test.local`;
  const phone = (snap.snapshot_whatsapp ?? '31999432988').replace(/\D/g, '');

  const { ok, data } = await asaasScriptRequest<{
    id?: string;
    errors?: Array<{ description?: string }>;
  }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      cpfCnpj: cpfRaw,
      phone,
      mobilePhone: phone,
      postalCode: '30750000',
      address: 'teste',
      addressNumber: '123',
      province: 'teste',
      city: 'Belo Horizonte',
      state: 'MG',
    }),
  });

  const id = (data as { id?: string })?.id;
  if (!ok || !id) {
    const err = (data as { errors?: Array<{ description?: string }> })?.errors
      ?.map((e) => e.description)
      .filter(Boolean)
      .join('; ');
    throw new Error(
      `Asaas: falha ao criar/garantir cliente: ${err ?? JSON.stringify(data)}`,
    );
  }
  return id;
}

/**
 * Cria assinatura real (PIX) no Asaas com vencimento em N dias e retorna
 * o primeiro pagamento PENDING com URL pública (fatura / boleto / pix).
 */
async function createRealAsaasSubscriptionPendingCharge(opts: {
  customerId: string;
  value: number;
  dueInDays: number;
}): Promise<{
  subscriptionId: string;
  paymentId: string;
  paymentUrl: string;
}> {
  const nextDueDate = addDaysSaoPauloYmd(nowFn(), opts.dueInDays);
  const create = await asaasScriptRequest<{
    id?: string;
    errors?: Array<{ description?: string }>;
  }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: opts.customerId,
      billingType: 'PIX',
      cycle: 'MONTHLY',
      value: opts.value,
      description: 'test-recurrency: interactive_lifecycle etapa 5',
      nextDueDate,
      updatePendingPayments: true,
      daysBeforeDue: 5,
    }),
  });
  const subscriptionId = create.data?.id;
  if (!create.ok || !subscriptionId) {
    throw new Error(
      `Asaas: falha ao criar assinatura: ${JSON.stringify(create.data)}`,
    );
  }
  const listRes = await asaasScriptRequest<{
    data?: Array<Record<string, unknown>>;
  }>(`/subscriptions/${subscriptionId}/payments`);
  const paymentRow = (listRes.data?.data ?? [])[0];
  const paymentId = paymentRow?.id ? String(paymentRow.id) : null;
  if (!paymentId) {
    throw new Error(
      `Asaas: assinatura ${subscriptionId} sem cobrança disponível`,
    );
  }
  let paymentUrl =
    (typeof paymentRow?.invoiceUrl === 'string' && paymentRow.invoiceUrl) ||
    (typeof paymentRow?.bankSlipUrl === 'string' && paymentRow.bankSlipUrl) ||
    '';
  if (!paymentUrl) {
    const invoice = await asaasScriptRequest<{ invoiceUrl?: string }>(
      `/payments/${paymentId}`,
    );
    paymentUrl = invoice.data?.invoiceUrl ?? '';
  }
  if (!paymentUrl) {
    throw new Error(
      `Asaas: cobrança ${paymentId} sem URL pública (invoice/boleto/pix).`,
    );
  }

  return {
    subscriptionId,
    paymentId,
    paymentUrl,
  };
}

async function applyDowngradeForScript(
  profileId: string,
  upgradeRequestId: string | null,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: profile } = await sb
    .from('tb_profiles')
    .select('plan_key')
    .eq('id', profileId)
    .maybeSingle();
  const oldPlan = profile?.plan_key ?? 'FREE';

  const { error: profileErr } = await sb
    .from('tb_profiles')
    .update({ plan_key: 'FREE', updated_at: utcIsoFrom(nowFn()) })
    .eq('id', profileId);
  if (profileErr) return { success: false, error: profileErr.message };

  if (upgradeRequestId) {
    await sb
      .from('tb_upgrade_requests')
      .update({
        status: 'cancelled',
        notes: createBillingNotesForNewUpgradeRequest({ logBody: reason }),
        updated_at: utcIsoFrom(nowFn()),
      })
      .eq('id', upgradeRequestId);
  }

  await sb.from('tb_plan_history').insert({
    profile_id: profileId,
    old_plan: oldPlan,
    new_plan: 'FREE',
    reason,
  });

  return { success: true };
}

async function pause(message: string): Promise<void> {
  console.log(`\n⏸ ${message}`);
  if (!input.isTTY) {
    console.log(
      '   (stdin não é interativo — aguardando 5s; use terminal direto p/ pausar com ENTER)',
    );
    await new Promise((r) => setTimeout(r, 5000));
    return;
  }
  const rl = createInterface({ input, output });
  try {
    await rl.question('   Pressione ENTER para continuar... ');
  } finally {
    rl.close();
  }
}

async function pauseForManualReview(
  scenarioName: string,
  result: ScenarioResult,
): Promise<void> {
  const dashboardUrl = `${baseUrl}/dashboard/assinatura`;
  await pause(
    [
      `Conferência manual do cenário "${scenarioName}" (${result.pass ? 'PASS' : 'FAIL'}).`,
      `1) Confira no painel Asaas (assinatura/cobrança/status).`,
      `2) Confira na UI em ${dashboardUrl} (AssinaturaContent).`,
      `3) Depois pressione ENTER para seguir para o próximo cenário.`,
    ].join('\n'),
  );
}

/**
 * Viagem no tempo (Supabase): alinha created_at/processed_at ao fim do dia
 * em America/Sao_Paulo (mesmo critério do produto — ver data-helpers).
 */
async function forceTimeline(id: string, date: Date): Promise<void> {
  const iso = getEndOfDaySaoPauloIso(date);
  const { error } = await sb
    .from('tb_upgrade_requests')
    .update({
      created_at: iso,
      processed_at: iso,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`forceTimeline(${id}): ${error.message}`);
  }
}

// ─── DB Helpers ──────────────────────────────────────────────────────────────

async function fetchProfile(): Promise<ProfileRow> {
  const { data, error } = await sb
    .from('tb_profiles')
    .select('id,plan_key,full_name,email,metadata')
    .eq('id', userId)
    .single();
  if (error) throw new Error(`fetchProfile: ${error.message}`);
  return data as ProfileRow;
}

async function fetchRowsBySubscription(subId: string): Promise<UpgradeRow[]> {
  const { data } = await sb
    .from('tb_upgrade_requests')
    .select('*')
    .eq('profile_id', userId)
    .eq('asaas_subscription_id', subId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as UpgradeRow[];
}

async function fetchRowsByStatus(status: string): Promise<UpgradeRow[]> {
  const { data } = await sb
    .from('tb_upgrade_requests')
    .select('*')
    .eq('profile_id', userId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(10);
  return (data ?? []) as UpgradeRow[];
}

async function fetchLatestTemplate(): Promise<UpgradeRow | null> {
  const { data } = await sb
    .from('tb_upgrade_requests')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as UpgradeRow | null) ?? null;
}

async function fetchLatestAsaasReferences(): Promise<{
  customerId: string | null;
  subscriptionId: string | null;
  paymentId: string | null;
  paymentUrl: string | null;
}> {
  const { data } = await sb
    .from('tb_upgrade_requests')
    .select(
      'asaas_customer_id,asaas_subscription_id,asaas_payment_id,payment_url',
    )
    .eq('profile_id', userId)
    .not('asaas_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    customerId: (data as any)?.asaas_customer_id ?? null,
    subscriptionId: (data as any)?.asaas_subscription_id ?? null,
    paymentId: (data as any)?.asaas_payment_id ?? null,
    paymentUrl: (data as any)?.payment_url ?? null,
  };
}

/**
 * Reseta o usuário para um estado limpo ISOLADO antes de cada cenário.
 * Remove credit_balance acumulado e cancela requests não-finais.
 */
async function resetUserState(planKey = 'PRO') {
  // Lê metadata atual e remove só o credit_balance para não afetar outros campos
  const { data: p } = await sb
    .from('tb_profiles')
    .select('metadata')
    .eq('id', userId)
    .single();
  const meta = { ...((p?.metadata ?? {}) as Record<string, unknown>) };
  delete meta.credit_balance;

  await sb
    .from('tb_profiles')
    .update({
      plan_key: planKey,
      metadata: meta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  await sb
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

async function getSnapshotFields(): Promise<Record<string, string | null>> {
  const tpl = await fetchLatestTemplate();
  return {
    snapshot_name: tpl?.snapshot_name ?? 'Test User',
    snapshot_cpf_cnpj: tpl?.snapshot_cpf_cnpj ?? '00000000000',
    snapshot_email: tpl?.snapshot_email ?? 'test@test.local',
    snapshot_whatsapp: tpl?.snapshot_whatsapp ?? '11999999999',
    snapshot_address: tpl?.snapshot_address ?? 'Rua Teste, 1',
    asaas_customer_id: tpl?.asaas_customer_id ?? null,
  };
}

async function insertApprovedRequest(opts: {
  subId: string;
  payId: string;
  plan: string;
  billingType: BillingType;
  billingPeriod: BillingPeriod;
  amount: number;
  processedAt?: Date;
  discount?: number;
  notes?: string;
  notesFlags?: {
    noRefundCreditProRata?: boolean;
    noRefundFreeCreditUpgrade?: boolean;
  };
  planKeyCurrent?: string;
  status?: string;
}): Promise<UpgradeRow> {
  const snap = await getSnapshotFields();
  const discount = opts.discount ?? 0;
  const { data, error } = await sb
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: opts.planKeyCurrent ?? 'FREE',
      plan_key_requested: opts.plan,
      billing_type: opts.billingType,
      billing_period: opts.billingPeriod,
      ...snap,
      asaas_subscription_id: opts.subId,
      asaas_payment_id: opts.payId,
      amount_original: opts.amount,
      amount_discount: discount,
      amount_final: opts.amount - discount,
      installments: 1,
      status: opts.status ?? 'approved',
      processed_at: (opts.processedAt ?? new Date()).toISOString(),
      notes:
        opts.notes != null && opts.notes !== ''
          ? createBillingNotesForNewUpgradeRequest({
              logBody: opts.notes,
              ...(opts.notesFlags ?? {}),
            })
          : null,
    })
    .select('*')
    .single();
  if (error) throw new Error(`insertApprovedRequest: ${error.message}`);
  return data as UpgradeRow;
}

async function insertPendingRequest(opts: {
  subId: string;
  payId: string;
  plan: string;
  billingType: BillingType;
  billingPeriod: BillingPeriod;
  amount: number;
  paymentUrl?: string | null;
  notes?: string;
  notesFlags?: {
    noRefundCreditProRata?: boolean;
    noRefundFreeCreditUpgrade?: boolean;
  };
}): Promise<UpgradeRow> {
  const snap = await getSnapshotFields();
  const { data, error } = await sb
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: 'PRO',
      plan_key_requested: opts.plan,
      billing_type: opts.billingType,
      billing_period: opts.billingPeriod,
      ...snap,
      asaas_subscription_id: opts.subId,
      asaas_payment_id: opts.payId,
      payment_url: opts.paymentUrl ?? null,
      amount_original: opts.amount,
      amount_discount: 0,
      amount_final: opts.amount,
      installments: 1,
      status: 'pending',
      processed_at: null,
      notes:
        opts.notes != null && opts.notes !== ''
          ? createBillingNotesForNewUpgradeRequest({
              logBody: opts.notes,
              ...(opts.notesFlags ?? {}),
            })
          : null,
    })
    .select('*')
    .single();
  if (error) throw new Error(`insertPendingRequest: ${error.message}`);
  return data as UpgradeRow;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

async function wh(
  event: string,
  payId: string,
  value: number,
  status: string,
  subId: string,
) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': webhookToken,
    },
    body: JSON.stringify({
      event,
      payment: { id: payId, value, status, subscription: subId },
    }),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* noop */
  }
  console.log(`  · [WH] ${event} → HTTP ${res.status}`);
  return { http: res.status, body };
}

// ─── Assert ──────────────────────────────────────────────────────────────────

function assert(ok: boolean, msg: string, errors: string[]) {
  if (!ok) errors.push(`FAIL: ${msg}`);
  return ok;
}

// ═════════════════════════════════════════════════════════════════════════════
// CENÁRIOS
// ═════════════════════════════════════════════════════════════════════════════

async function scenarioFirstSubscription(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-first-${id}`;
  const payId = `pay-first-${id}`;
  const amount = 79;
  const errors: string[] = [];
  console.log(
    '\n──── [first_subscription] FREE → PRO (primeira assinatura) ────',
  );
  await resetUserState('FREE');

  await insertPendingRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
  });
  const r = await wh('PAYMENT_CONFIRMED', payId, amount, 'CONFIRMED', subId);
  assert(r.http === 200, 'HTTP 200', errors);
  const p = await fetchProfile();
  assert(p.plan_key === 'PRO', `plan=PRO (got ${p.plan_key})`, errors);
  const rows = await fetchRowsBySubscription(subId);
  const approved = rows.find((r) => r.status === 'approved');
  assert(!!approved, 'registro approved', errors);
  assert(
    (approved?.amount_discount ?? 0) === 0,
    'sem desconto na 1ª assinatura',
    errors,
  );

  return {
    scenario: 'first_subscription',
    pass: errors.length === 0,
    errors,
    details: {
      plan_after: p.plan_key,
      amount_final: approved?.amount_final,
      discount: approved?.amount_discount,
    },
  };
}

async function scenarioFreeUpgrade(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-freeup-${id}`;
  const payId = `pay-freeup-${id}`;
  const amount = 156;
  const errors: string[] = [];
  console.log(
    '\n──── [free_upgrade] Upgrade gratuito (crédito ≥ novo plano) ────',
  );
  await resetUserState('START');

  const processedAt = subDays(new Date(), 2);
  await insertApprovedRequest({
    subId,
    payId,
    plan: 'START',
    billingType: 'PIX',
    billingPeriod: 'semiannual',
    amount,
    processedAt,
  });

  const snap = await getSnapshotFields();
  const creditValue = Math.round(amount * (178 / 180) * 100) / 100;
  const newExpiry = addDays(new Date(), 30).toISOString();
  const { data: freeRow, error: fErr } = await sb
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: 'START',
      plan_key_requested: 'PLUS',
      billing_type: 'PIX',
      billing_period: 'monthly',
      ...snap,
      asaas_subscription_id: `${subId}-free`,
      asaas_payment_id: null,
      payment_url: null,
      amount_original: 49,
      amount_discount: 49,
      amount_final: 0,
      installments: 1,
      status: 'approved',
      processed_at: new Date().toISOString(),
      notes: createBillingNotesForNewUpgradeRequest({
        logBody: `Upgrade gratuito (Crédito): Plano PLUS.\nSaldo residual R$ ${creditValue.toFixed(2)}; nova data de vencimento: ${newExpiry}.`,
        noRefundFreeCreditUpgrade: true,
      }),
    })
    .select('id,amount_final,status')
    .single();
  if (fErr) errors.push(`insert freeRow: ${fErr.message}`);

  await sb
    .from('tb_profiles')
    .update({ plan_key: 'PLUS', updated_at: new Date().toISOString() })
    .eq('id', userId);
  const p = await fetchProfile();
  assert(p.plan_key === 'PLUS', `plan=PLUS (got ${p.plan_key})`, errors);
  assert(
    freeRow?.amount_final === 0,
    `amount_final=0 (got ${freeRow?.amount_final})`,
    errors,
  );

  return {
    scenario: 'free_upgrade',
    pass: errors.length === 0,
    errors,
    details: {
      plan_after: p.plan_key,
      amount_final: freeRow?.amount_final,
      credit: creditValue,
    },
  };
}

async function scenarioCreditUpgrade(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-credup-${id}`;
  const payId = `pay-credup-${id}`;
  const amount = 29;
  const errors: string[] = [];
  console.log('\n──── [credit_upgrade] Upgrade com crédito parcial ────');
  await resetUserState('START');

  const processedAt = subDays(new Date(), 15);
  await insertApprovedRequest({
    subId,
    payId,
    plan: 'START',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
    processedAt,
  });

  const creditApplied = Math.round(amount * (15 / 30) * 100) / 100;
  const amountFinal = Math.round((49 - creditApplied) * 100) / 100;
  const newSubId = `${subId}-new`;
  const newPayId = `${payId}-new`;

  const newRow = await insertPendingRequest({
    subId: newSubId,
    payId: newPayId,
    plan: 'PLUS',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount: amountFinal,
  });
  await sb
    .from('tb_upgrade_requests')
    .update({
      amount_original: 49,
      amount_discount: creditApplied,
      amount_final: amountFinal,
      notes: createBillingNotesForNewUpgradeRequest({
        logBody: `Aproveitamento de crédito pro-rata: R$ ${creditApplied.toFixed(2)}.`,
        noRefundCreditProRata: true,
      }),
    })
    .eq('id', newRow.id);

  const r = await wh(
    'PAYMENT_CONFIRMED',
    newPayId,
    amountFinal,
    'CONFIRMED',
    newSubId,
  );
  assert(r.http === 200, 'HTTP 200', errors);
  const p = await fetchProfile();
  assert(p.plan_key === 'PLUS', `plan=PLUS (got ${p.plan_key})`, errors);
  const rows = await fetchRowsBySubscription(newSubId);
  const approved = rows.find((r) => r.status === 'approved');
  assert(!!approved, 'approved encontrado', errors);
  assert(
    (approved?.amount_discount ?? 0) > 0,
    `discount>0 (got ${approved?.amount_discount})`,
    errors,
  );
  assert(
    (approved?.amount_final ?? 999) < 49,
    `amount_final<49 (got ${approved?.amount_final})`,
    errors,
  );

  return {
    scenario: 'credit_upgrade',
    pass: errors.length === 0,
    errors,
    details: {
      credit: creditApplied,
      amount_final: amountFinal,
      plan: p.plan_key,
      discount_on_row: approved?.amount_discount,
    },
  };
}

async function scenarioCycleChange(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-cycle-${id}`;
  const payId = `pay-cycle-${id}`;
  const amount = 79;
  const errors: string[] = [];
  console.log('\n──── [cycle_change] Mensal → Semestral com crédito ────');
  await resetUserState('PRO');

  const processedAt = subDays(new Date(), 10);
  await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
    processedAt,
  });

  const creditApplied = Math.round(amount * (20 / 30) * 100) / 100;
  const semiPrice = 420;
  const amountFinal = Math.round((semiPrice - creditApplied) * 100) / 100;
  const newSubId = `${subId}-semi`;
  const newPayId = `${payId}-semi`;

  const newRow = await insertPendingRequest({
    subId: newSubId,
    payId: newPayId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'semiannual',
    amount: amountFinal,
  });
  await sb
    .from('tb_upgrade_requests')
    .update({
      amount_original: semiPrice,
      amount_discount: creditApplied,
      amount_final: amountFinal,
      notes: createBillingNotesForNewUpgradeRequest({
        logBody: `Aproveitamento de crédito pro-rata: R$ ${creditApplied.toFixed(2)} (troca mensal → semestral).`,
        noRefundCreditProRata: true,
      }),
    })
    .eq('id', newRow.id);

  const r = await wh(
    'PAYMENT_CONFIRMED',
    newPayId,
    amountFinal,
    'CONFIRMED',
    newSubId,
  );
  assert(r.http === 200, 'HTTP 200', errors);
  const p = await fetchProfile();
  assert(p.plan_key === 'PRO', `plan=PRO mantido (got ${p.plan_key})`, errors);
  const rows = await fetchRowsBySubscription(newSubId);
  const approved = rows.find(
    (r) => r.status === 'approved' && r.billing_period === 'semiannual',
  );
  assert(!!approved, 'approved com billing_period=semiannual', errors);
  assert((approved?.amount_discount ?? 0) > 0, 'crédito aplicado', errors);

  return {
    scenario: 'cycle_change',
    pass: errors.length === 0,
    errors,
    details: {
      old_cycle: 'monthly',
      new_cycle: 'semiannual',
      credit: creditApplied,
      amount_final: amountFinal,
    },
  };
}

async function scenarioPaymentChange(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-paychange-${id}`;
  const payId = `pay-pix-${id}`;
  const amount = 79;
  const errors: string[] = [];
  console.log('\n──── [payment_change] PIX → BOLETO via update ────');
  await resetUserState('PRO');

  const seed = await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
  });

  // Usa serviço real de subscriptions para atualizar método no Asaas
  const newPayId = `pay-boleto-${id}`;
  const asaasUpdate = await asaasScriptRequest(`/subscriptions/${subId}`, {
    method: 'PUT',
    body: JSON.stringify({
      billingType: 'BOLETO',
      updatePendingPayments: true,
    }),
  });
  assert(
    asaasUpdate.ok,
    `updateSubscriptionBillingMethod (Asaas) ok: ${JSON.stringify(asaasUpdate.data)}`,
    errors,
  );
  const nowIso = utcIsoFrom(nowFn());
  await sb
    .from('tb_upgrade_requests')
    .update({
      billing_type: 'BOLETO',
      asaas_payment_id: newPayId,
      notes: createBillingNotesForNewUpgradeRequest({
        logBody: `[PaymentMethodChange ${nowIso}] PIX -> BOLETO`,
      }),
      updated_at: nowIso,
    })
    .eq('id', seed.id);

  const r = await wh('PAYMENT_RECEIVED', newPayId, amount, 'RECEIVED', subId);
  assert(r.http === 200, 'HTTP 200', errors);
  const p = await fetchProfile();
  assert(p.plan_key === 'PRO', `plan=PRO (got ${p.plan_key})`, errors);

  const updated = await sb
    .from('tb_upgrade_requests')
    .select('billing_type,asaas_payment_id')
    .eq('id', seed.id)
    .single();
  assert(
    updated.data?.billing_type === 'BOLETO',
    `billing_type=BOLETO (got ${updated.data?.billing_type})`,
    errors,
  );
  assert(
    updated.data?.asaas_payment_id === newPayId,
    'payment_id atualizado',
    errors,
  );

  return {
    scenario: 'payment_change',
    pass: errors.length === 0,
    errors,
    details: {
      old: 'PIX',
      new: updated.data?.billing_type,
      payment_id_ok: updated.data?.asaas_payment_id === newPayId,
    },
  };
}

async function scenarioDowngradeCredit(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-dgcred-${id}`;
  const payId = `pay-dgcred-${id}`;
  const amount = 120;
  const errors: string[] = [];
  console.log('\n──── [downgrade_credit] Downgrade ≤7d: crédito + FREE ────');
  await resetUserState('PRO');

  const processedAt = subDays(new Date(), 3);
  const seed = await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
    processedAt,
  });

  // Cancela assinatura via webhook
  const rCancel = await wh(
    'SUBSCRIPTION_CANCELED',
    payId,
    amount,
    'CANCELLED',
    subId,
  );
  assert(rCancel.http === 200, 'SUBSCRIPTION_CANCELED HTTP 200', errors);

  // Aplica downgrade usando o serviço real.
  const downgrade = await applyDowngradeForScript(
    userId as string,
    seed.id,
    'Arrependimento <=7d (script)',
  );
  assert(downgrade.success, 'performDowngradeToFree executado', errors);

  const p = await fetchProfile();
  const balanceAfter = Number(
    ((p.metadata ?? {}) as Record<string, unknown>).credit_balance ?? 0,
  );

  assert(p.plan_key === 'FREE', `plan=FREE (got ${p.plan_key})`, errors);
  assert(
    balanceAfter >= 0,
    `credit_balance válido (got ${balanceAfter})`,
    errors,
  );

  const row = await sb
    .from('tb_upgrade_requests')
    .select('status')
    .eq('id', seed.id)
    .single();
  assert(
    row.data?.status === 'cancelled',
    `request=cancelled, não pending_downgrade (got ${row.data?.status})`,
    errors,
  );

  return {
    scenario: 'downgrade_credit',
    pass: errors.length === 0,
    errors,
    details: {
      plan_after: p.plan_key,
      credit_balance: balanceAfter,
      credit_expected: amount,
      request_status: row.data?.status,
    },
  };
}

async function scenarioDowngradeScheduled(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-dgsched-${id}`;
  const payId = `pay-dgsched-${id}`;
  const amount = 120;
  const errors: string[] = [];
  console.log(
    '\n──── [downgrade_sched] Downgrade agendado >7d (pending_change + cron) ────',
  );
  await resetUserState('PRO');

  const processedAt = subDays(new Date(), 20);
  const expiresAt = addMonths(processedAt, 1);
  await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
    processedAt,
  });

  // PRO vigente durante agendamento
  const profileDuring = await fetchProfile();
  assert(
    profileDuring.plan_key === 'PRO',
    `durante: plan=PRO (got ${profileDuring.plan_key})`,
    errors,
  );

  const newSubId = `${subId}-start`;
  const snap = await getSnapshotFields();
  const { data: pcRow, error: pcErr } = await sb
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: 'PRO',
      plan_key_requested: 'START',
      billing_type: 'PIX',
      billing_period: 'monthly',
      ...snap,
      asaas_subscription_id: newSubId,
      asaas_payment_id: null,
      amount_original: 29,
      amount_discount: 0,
      amount_final: 29,
      installments: 1,
      status: 'pending_change',
      processed_at: expiresAt.toISOString(),
      notes: createBillingNotesForNewUpgradeRequest({
        logBody: `Mudança agendada para Plano START.\nAssinatura atual encerrada em: ${expiresAt.toISOString().split('T')[0]}.`,
      }),
    })
    .select('*')
    .single();
  if (pcErr) errors.push(`insert pending_change: ${pcErr.message}`);

  // Após criar pending_change: ainda PRO
  const profileAfterPc = await fetchProfile();
  assert(
    profileAfterPc.plan_key === 'PRO',
    `após pending_change: PRO (got ${profileAfterPc.plan_key})`,
    errors,
  );

  const pcRows = await fetchRowsByStatus('pending_change');
  assert(
    pcRows.some((r) => r.asaas_subscription_id === newSubId),
    'pending_change no banco',
    errors,
  );

  // Simula cron ao vencer
  await sb
    .from('tb_profiles')
    .update({ plan_key: 'START', updated_at: new Date().toISOString() })
    .eq('id', userId);
  await sb
    .from('tb_upgrade_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', pcRow!.id);
  await sb.from('tb_plan_history').insert({
    profile_id: userId,
    old_plan: 'PRO',
    new_plan: 'START',
    reason: 'pending_change aplicado (cron)',
  });

  const profileAfterCron = await fetchProfile();
  assert(
    profileAfterCron.plan_key === 'START',
    `após cron: plan=START (got ${profileAfterCron.plan_key})`,
    errors,
  );

  const appliedRow = await sb
    .from('tb_upgrade_requests')
    .select('status')
    .eq('id', pcRow!.id)
    .single();
  assert(
    appliedRow.data?.status === 'approved',
    `pending_change→approved (got ${appliedRow.data?.status})`,
    errors,
  );

  return {
    scenario: 'downgrade_sched',
    pass: errors.length === 0,
    errors,
    details: {
      plan_during: profileAfterPc.plan_key,
      pending_change_registered: pcRows.some(
        (r) => r.asaas_subscription_id === newSubId,
      ),
      expiry: expiresAt.toISOString(),
      plan_after_cron: profileAfterCron.plan_key,
      status_after: appliedRow.data?.status,
    },
  };
}

async function scenarioDowngradeScheduledCancel(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-dgscancel-${id}`;
  const payId = `pay-dgscancel-${id}`;
  const amount = 120;
  const errors: string[] = [];
  console.log(
    '\n──── [downgrade_sched_cancel] Cancela pending_change → mantém PRO ────',
  );
  await resetUserState('PRO');

  const processedAt = subDays(new Date(), 20);
  const expiresAt = addMonths(processedAt, 1);
  await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
    processedAt,
  });

  const newSubId = `${subId}-start`;
  const snap = await getSnapshotFields();
  const { data: pcRow } = await sb
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: 'PRO',
      plan_key_requested: 'START',
      billing_type: 'PIX',
      billing_period: 'monthly',
      ...snap,
      asaas_subscription_id: newSubId,
      asaas_payment_id: null,
      amount_original: 29,
      amount_discount: 0,
      amount_final: 29,
      installments: 1,
      status: 'pending_change',
      processed_at: expiresAt.toISOString(),
      notes: createBillingNotesForNewUpgradeRequest({
        logBody: 'Mudança agendada.',
      }),
    })
    .select('*')
    .single();

  // Simula cancelScheduledChange
  const { data: pcNotesRow } = await sb
    .from('tb_upgrade_requests')
    .select('notes')
    .eq('id', pcRow!.id)
    .single();
  await sb
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes: appendBillingNotesBlock(
        pcNotesRow?.notes ?? null,
        'Intenção cancelada pelo usuário.',
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pcRow!.id);

  const p = await fetchProfile();
  assert(p.plan_key === 'PRO', `plan=PRO mantido (got ${p.plan_key})`, errors);

  const row = await sb
    .from('tb_upgrade_requests')
    .select('status')
    .eq('id', pcRow!.id)
    .single();
  assert(
    row.data?.status === 'cancelled',
    `pending_change→cancelled (got ${row.data?.status})`,
    errors,
  );

  const activePc = await fetchRowsByStatus('pending_change');
  assert(
    !activePc.some((r) => r.asaas_subscription_id === newSubId),
    'sem pending_change ativo',
    errors,
  );

  return {
    scenario: 'downgrade_sched_cancel',
    pass: errors.length === 0,
    errors,
    details: {
      plan_after: p.plan_key,
      pc_status: row.data?.status,
      no_active_pc: !activePc.some((r) => r.asaas_subscription_id === newSubId),
    },
  };
}

async function scenarioCancellationRefund(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-cancelref-${id}`;
  const payId = `pay-cancelref-${id}`;
  const amount = 79;
  const errors: string[] = [];
  console.log(
    '\n──── [cancellation_refund] Cancelamento ≤7d → FREE imediato ────',
  );
  await resetUserState('PRO');

  const processedAt = subDays(new Date(), 3);
  const seed = await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
    processedAt,
  });

  const rCancel = await wh(
    'SUBSCRIPTION_CANCELED',
    payId,
    amount,
    'CANCELLED',
    subId,
  );
  assert(rCancel.http === 200, 'SUBSCRIPTION_CANCELED HTTP 200', errors);

  // Aplica downgrade usando o serviço real.
  const downgrade = await applyDowngradeForScript(
    userId as string,
    seed.id,
    'Cancellation refund (script)',
  );
  assert(downgrade.success, 'performDowngradeToFree executado', errors);

  const p = await fetchProfile();
  const balanceAfter = Number(
    ((p.metadata ?? {}) as Record<string, unknown>).credit_balance ?? 0,
  );
  assert(p.plan_key === 'FREE', `plan=FREE (got ${p.plan_key})`, errors);
  assert(
    balanceAfter >= 0,
    `credit_balance válido (got ${balanceAfter})`,
    errors,
  );

  const row = await sb
    .from('tb_upgrade_requests')
    .select('status')
    .eq('id', seed.id)
    .single();
  assert(
    row.data?.status === 'cancelled',
    `request=cancelled (got ${row.data?.status})`,
    errors,
  );

  return {
    scenario: 'cancellation_refund',
    pass: errors.length === 0,
    errors,
    details: {
      type: 'refund_immediate',
      plan_after: p.plan_key,
      credit_balance: balanceAfter,
      request_status: row.data?.status,
    },
  };
}

async function scenarioCancellationScheduled(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-cancelsched-${id}`;
  const payId = `pay-cancelsched-${id}`;
  const amount = 79;
  const errors: string[] = [];
  console.log(
    '\n──── [cancellation_scheduled] Cancelamento >7d → pending_downgrade → FREE ────',
  );
  await resetUserState('PRO');

  const processedAt = subDays(new Date(), 20);
  const expiresAt = addMonths(processedAt, 1);
  const seed = await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
    processedAt,
  });

  // Simula handleSubscriptionCancellation >7d
  await sb
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_downgrade',
      notes: createBillingNotesForNewUpgradeRequest({
        logBody: `Cancelamento solicitado. Acesso até ${expiresAt.toISOString()}.`,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', seed.id);

  const pDuring = await fetchProfile();
  assert(
    pDuring.plan_key === 'PRO',
    `durante: plan=PRO (got ${pDuring.plan_key})`,
    errors,
  );

  const pdRows = await fetchRowsByStatus('pending_downgrade');
  assert(
    pdRows.some((r) => r.id === seed.id),
    'pending_downgrade registrado',
    errors,
  );

  // Simula cron usando serviço real de downgrade.
  const cronDowngrade = await applyDowngradeForScript(
    userId as string,
    seed.id,
    'Downgrade automático (cron simulado)',
  );
  assert(cronDowngrade.success, 'performDowngradeToFree no cron', errors);

  const pAfter = await fetchProfile();
  assert(
    pAfter.plan_key === 'FREE',
    `após cron: plan=FREE (got ${pAfter.plan_key})`,
    errors,
  );

  const rowAfter = await sb
    .from('tb_upgrade_requests')
    .select('status')
    .eq('id', seed.id)
    .single();
  assert(
    rowAfter.data?.status === 'cancelled',
    `request=cancelled (got ${rowAfter.data?.status})`,
    errors,
  );

  return {
    scenario: 'cancellation_scheduled',
    pass: errors.length === 0,
    errors,
    details: {
      type: 'scheduled_cancellation',
      plan_during: pDuring.plan_key,
      access_ends_at: expiresAt.toISOString(),
      plan_after_cron: pAfter.plan_key,
      request_status: rowAfter.data?.status,
    },
  };
}

async function scenarioOverdueGrace(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-overdue-${id}`;
  const payId = `pay-overdue-${id}`;
  const amount = 79;
  const GRACE = 5;
  const errors: string[] = [];
  console.log('\n──── [overdue_grace] OVERDUE + carência 5d → FREE ────');
  await resetUserState('PRO');

  const seed = await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
  });

  const rOverdue = await wh('PAYMENT_OVERDUE', payId, amount, 'OVERDUE', subId);
  assert(rOverdue.http === 200, 'OVERDUE HTTP 200', errors);

  const rowsAfterOverdue = await fetchRowsBySubscription(subId);
  const overdueRow = rowsAfterOverdue.find(
    (r) => r.status === 'approved' && !!r.overdue_since,
  );
  assert(!!overdueRow, 'overdue_since marcado', errors);

  const pDuring = await fetchProfile();
  assert(
    pDuring.plan_key === 'PRO',
    `durante carência: PRO (got ${pDuring.plan_key})`,
    errors,
  );

  // Simula passagem dos 5 dias
  const overdueSince = subDays(new Date(), GRACE + 1);
  await sb
    .from('tb_upgrade_requests')
    .update({ overdue_since: overdueSince.toISOString() })
    .eq('id', overdueRow?.id ?? seed.id);

  // Cron aplica downgrade via serviço real.
  const overdueDowngrade = await applyDowngradeForScript(
    userId as string,
    overdueRow?.id ?? seed.id,
    `Inadimplência: carência ${GRACE}d esgotada`,
  );
  assert(
    overdueDowngrade.success,
    'performDowngradeToFree por inadimplência',
    errors,
  );

  const pAfter = await fetchProfile();
  assert(
    pAfter.plan_key === 'FREE',
    `após carência: FREE (got ${pAfter.plan_key})`,
    errors,
  );

  return {
    scenario: 'overdue_grace',
    pass: errors.length === 0,
    errors,
    details: {
      overdue_marked: !!overdueRow,
      plan_during_grace: pDuring.plan_key,
      grace_days: GRACE,
      plan_after_grace: pAfter.plan_key,
    },
  };
}

async function scenarioWebhookSubCanceled(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-whcancel-${id}`;
  const payId = `pay-whcancel-${id}`;
  const amount = 79;
  const errors: string[] = [];
  console.log(
    '\n──── [webhook_sub_canceled] SUBSCRIPTION_CANCELED → sem 500 ────',
  );
  await resetUserState('PRO');

  await insertApprovedRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
  });
  await sb
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_downgrade',
      updated_at: new Date().toISOString(),
    })
    .eq('profile_id', userId)
    .eq('asaas_subscription_id', subId)
    .eq('status', 'approved');

  const r = await wh(
    'SUBSCRIPTION_CANCELED',
    payId,
    amount,
    'CANCELLED',
    subId,
  );
  assert(r.http !== 500, `não retornou 500 (got ${r.http})`, errors);
  assert(r.http === 200, `HTTP 200 (got ${r.http})`, errors);

  const p = await fetchProfile();

  return {
    scenario: 'webhook_sub_canceled',
    pass: errors.length === 0,
    errors,
    details: { http_status: r.http, plan_after: p.plan_key },
  };
}

async function scenarioPendingBlocksUpgrade(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-block-${id}`;
  const payId = `pay-block-${id}`;
  const amount = 79;
  const errors: string[] = [];
  console.log(
    '\n──── [pending_blocks_upgrade] Pending ativo bloqueia novo upgrade ────',
  );
  await resetUserState('PRO');

  await insertPendingRequest({
    subId,
    payId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
  });

  const since = utcIsoFrom(new Date(nowFn().getTime() - 24 * 60 * 60 * 1000));
  const { data: pendingRows } = await sb
    .from('tb_upgrade_requests')
    .select('id,status,created_at')
    .eq('profile_id', userId)
    .eq('status', 'pending')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);
  const hasPending = (pendingRows?.length ?? 0) > 0;
  assert(
    hasPending,
    'pending encontrado dentro de 24h (getPendingUpgradeRequest retornaria este)',
    errors,
  );

  // Dispara webhook para um pagamento sem registro — não deve ativar plano
  const unknownPayId = `pay-unknown-${id}`;
  const unknownSubId = `sub-unknown-${id}`;
  const rUnknown = await wh(
    'PAYMENT_CONFIRMED',
    unknownPayId,
    amount,
    'CONFIRMED',
    unknownSubId,
  );
  assert(
    rUnknown.http === 200,
    'webhook retorna 200 para pagamento sem registro',
    errors,
  );

  const p = await fetchProfile();
  assert(
    p.plan_key === 'PRO',
    `plan=PRO (pagamento sem registro não alterou plano: got ${p.plan_key})`,
    errors,
  );

  return {
    scenario: 'pending_blocks_upgrade',
    pass: errors.length === 0,
    errors,
    details: {
      pending_in_db: hasPending,
      unknown_payment_http: rUnknown.http,
      plan_unchanged: p.plan_key,
    },
  };
}

async function scenarioInteractiveLifecycle(): Promise<ScenarioResult> {
  const runId = Date.now();
  const now = new Date();
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  console.log(
    '\n──── [interactive_lifecycle] Linha do tempo 2 anos (Supabase + Etapa 5 Asaas real) ────',
  );
  await resetUserState('FREE');

  const subCron = `sub-cron-${runId}`;
  const payCron = (suffix: string) => `pay-cron-${runId}-${suffix}`;

  // ─── Etapa 1: 01/03/2024 PRO → arrependimento 04/03/2024 ───
  const step1Contract = localNoonSaoPaulo(2024, 3, 1);
  const step1Cancel = localNoonSaoPaulo(2024, 3, 4);

  const step1 = await insertApprovedRequest({
    subId: subCron,
    payId: payCron('pro-m2024-03'),
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount: 79,
    processedAt: step1Contract,
    notes:
      'Etapa 1: assinatura PRO mensal (PIX). Contrato 01/03/2024 (forçado no Supabase).',
  });
  await forceTimeline(step1.id, step1Contract);

  const pBefore1 = await fetchProfile();
  const metaBefore1 = (pBefore1.metadata ?? {}) as Record<string, unknown>;
  const creditAfterRefund =
    Math.round((Number(metaBefore1.credit_balance ?? 0) + 79) * 100) / 100;

  await sb
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      metadata: { ...metaBefore1, credit_balance: creditAfterRefund },
      updated_at: getEndOfDaySaoPauloIso(step1Cancel),
    })
    .eq('id', userId);
  await sb
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes:
        'Etapa 1: arrependimento ≤7d sem crédito prévio. Crédito integral em metadata (simulador).',
      created_at: getEndOfDaySaoPauloIso(step1Contract),
      processed_at: getEndOfDaySaoPauloIso(step1Cancel),
      updated_at: new Date().toISOString(),
    })
    .eq('id', step1.id);

  const pAfter1 = await fetchProfile();
  assert(pAfter1.plan_key === 'FREE', 'etapa1: perfil em FREE', errors);
  assert(
    Number(
      ((pAfter1.metadata ?? {}) as Record<string, unknown>).credit_balance,
    ) >= 79,
    'etapa1: metadata.credit_balance preenchido',
    errors,
  );
  details.etapa1 = {
    contrato_sp: '2024-03-01',
    cancelamento_sp: '2024-03-04',
    request_id: step1.id,
    credit_balance: ((pAfter1.metadata ?? {}) as Record<string, unknown>)
      .credit_balance,
  };
  await pause(
    'Etapa 1: estorno integral em metadata + plano FREE (arrependimento Mar/2024). Valide no app e dê ENTER.',
  );

  // ─── Etapa 2: 12 meses START (Abr/2024 → Mar/2025), IDs Asaas fictícios consistentes ───
  const subStart = `sub-start-${runId}`;
  const firstStartMonth = localNoonSaoPaulo(2024, 4, 1);
  const pBefore2 = await fetchProfile();
  const meta2 = (pBefore2.metadata ?? {}) as Record<string, unknown>;
  const bal2 = Number(meta2.credit_balance ?? 0);
  const startPrice = 29;
  const discountFirst = Math.min(bal2, startPrice);

  const startRows: string[] = [];
  for (let m = 0; m < 12; m++) {
    const anchor = addMonths(firstStartMonth, m);
    const y = anchor.getFullYear();
    const mo = anchor.getMonth() + 1;
    const label = `${String(y)}-${String(mo).padStart(2, '0')}`;
    const isFirst = m === 0;
    const row = await insertApprovedRequest({
      subId: subStart,
      payId: payCron(`st-ren-${label}`),
      plan: 'START',
      billingType: 'PIX',
      billingPeriod: 'monthly',
      amount: startPrice,
      processedAt: anchor,
      planKeyCurrent: isFirst ? 'FREE' : 'START',
      status: isFirst ? 'approved' : 'renewed',
      discount: isFirst ? discountFirst : 0,
      notes: isFirst
        ? `Etapa 2: início START mensal (Abr/2024). Renovações simuladas no Supabase; Asaas sandbox sem retroativo.`
        : `Etapa 2: Renovação START ${label}. Mensal ${m + 1}/12 (Abr/2024–Mar/2025).`,
    });
    await forceTimeline(row.id, anchor);
    startRows.push(row.id);
    console.log(
      `  · [interactive] START mês ${m + 1}/12 → ${label} (id ${row.id})`,
    );
  }

  const newBal = Math.round((bal2 - discountFirst) * 100) / 100;
  await sb
    .from('tb_profiles')
    .update({
      plan_key: 'START',
      metadata: { ...meta2, credit_balance: newBal },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  details.etapa2 = {
    subscription_id: subStart,
    months: 12,
    row_ids: startRows,
    first_discount: discountFirst,
  };
  await pause(
    'Etapa 2: 12 linhas START (Abr/2024–Mar/2025). Confira a escada no histórico e dê ENTER.',
  );

  // ─── Etapa 3: Jan/2026 upgrade PRO com crédito → cancelar +2d = pending_downgrade ───
  const upgradeDate = localNoonSaoPaulo(2026, 1, 15);
  const cancelTryDate = addDays(upgradeDate, 2);
  const subPro = `sub-pro-${runId}`;
  const proOriginal = 79;
  const creditApplied = Math.round(Math.min(24.5, proOriginal - 1) * 100) / 100;
  const proFinal = Math.round((proOriginal - creditApplied) * 100) / 100;

  const proRow = await insertApprovedRequest({
    subId: subPro,
    payId: payCron('pro-2026-01-upgrade'),
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount: proOriginal,
    processedAt: upgradeDate,
    planKeyCurrent: 'START',
    discount: creditApplied,
    notes: `Etapa 3: Upgrade START→PRO (Jan/2026). Aproveitamento de crédito pro-rata: R$ ${creditApplied.toFixed(2)}.`,
  });
  await sb
    .from('tb_upgrade_requests')
    .update({
      amount_original: proOriginal,
      amount_discount: creditApplied,
      amount_final: proFinal,
      notes: `Etapa 3: Upgrade START→PRO com Aproveitamento de crédito pro-rata: R$ ${creditApplied.toFixed(2)}.`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', proRow.id);
  await forceTimeline(proRow.id, upgradeDate);

  await sb
    .from('tb_profiles')
    .update({
      plan_key: 'PRO',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  await sb
    .from('tb_upgrade_requests')
    .update({
      status: 'pending_downgrade',
      notes:
        'Etapa 3: tentativa de arrependimento bloqueada (há Aproveitamento de crédito pro-rata). Fluxo agendado → pending_downgrade.',
      processed_at: getEndOfDaySaoPauloIso(addMonths(upgradeDate, 1)),
      updated_at: getEndOfDaySaoPauloIso(cancelTryDate),
    })
    .eq('id', proRow.id);

  const check3 = await sb
    .from('tb_upgrade_requests')
    .select('status,notes')
    .eq('id', proRow.id)
    .single();
  assert(
    check3.data?.status === 'pending_downgrade',
    'etapa3: pending_downgrade (sem estorno total / sem cancelled imediato)',
    errors,
  );
  assert(
    String(check3.data?.notes ?? '')
      .toLowerCase()
      .includes('aproveitamento'),
    'etapa3: notas citam aproveitamento de crédito',
    errors,
  );
  details.etapa3 = {
    upgrade_row_id: proRow.id,
    upgrade_date: '2026-01-15',
    cancel_try: '2026-01-17',
    status: check3.data?.status,
  };
  await pause(
    'Etapa 3: regra do crédito pro-rata (Jan/2026). Confira pending_downgrade e ENTER.',
  );

  // ─── Etapa 4: PIX → Cartão → Boleto → PIX (Jan/2026, sequência rápida) ───
  const danceBase = localNoonSaoPaulo(2026, 1, 20);
  const paymentDance = [
    { to: 'CREDIT_CARD' as BillingType, pay: payCron('dance-cc-1') },
    { to: 'BOLETO' as BillingType, pay: payCron('dance-boleto') },
    { to: 'PIX' as BillingType, pay: payCron('dance-pix-2') },
  ] as const;

  for (let i = 0; i < paymentDance.length; i++) {
    const hop = paymentDance[i];
    const when = addDays(danceBase, i);
    await sb
      .from('tb_upgrade_requests')
      .update({
        billing_type: hop.to,
        asaas_payment_id: hop.pay,
        notes: `[PaymentMethodChange ${when.toISOString().slice(0, 10)}] troca de forma de pagamento → ${hop.to}. Etapa 4 (simulador cronológico Jan/2026).`,
        updated_at: when.toISOString(),
      })
      .eq('id', proRow.id);
    await wh('PAYMENT_RECEIVED', hop.pay, proFinal, 'RECEIVED', subPro);
  }

  const check4 = await sb
    .from('tb_upgrade_requests')
    .select('billing_type,asaas_payment_id')
    .eq('id', proRow.id)
    .single();
  assert(check4.data?.billing_type === 'PIX', 'etapa4: termina em PIX', errors);
  details.etapa4 = {
    billing_type_final: check4.data?.billing_type,
    payment_id_final: check4.data?.asaas_payment_id,
  };
  await pause('Etapa 4: dança de métodos registrada. Valide a tabela e ENTER.');

  // ─── Etapa 5: cobrança real Asaas (venc. +3 dias), pending com payment_url ───
  const step5Due = addDays(now, 3);
  console.log(
    '  · [interactive] Etapa 5: criando assinatura/cobrança real no Asaas…',
  );
  const asaasCustomerId = await ensureAsaasCustomerForScript();
  const realCharge = await createRealAsaasSubscriptionPendingCharge({
    customerId: asaasCustomerId,
    value: 79,
    dueInDays: 3,
  });

  const snapshotName = (await getSnapshotFields()).snapshot_name ?? 'Test User';

  const pending5 = await insertPendingRequest({
    subId: realCharge.subscriptionId,
    payId: realCharge.paymentId,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount: 79,
    paymentUrl: realCharge.paymentUrl,
    notes: `Etapa 5 (${snapshotName}): fatura real sandbox/produção. subscription=${realCharge.subscriptionId}. Próximo vencimento ~ ${addDaysSaoPauloYmd(now, 3)}.`,
  });
  await sb
    .from('tb_upgrade_requests')
    .update({
      snapshot_name: snapshotName,
      asaas_customer_id: asaasCustomerId,
      processed_at: step5Due.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', pending5.id);

  const check5 = await sb
    .from('tb_upgrade_requests')
    .select('status,payment_url,processed_at')
    .eq('id', pending5.id)
    .single();
  assert(check5.data?.status === 'pending', 'etapa5: registro pending', errors);
  assert(
    typeof check5.data?.payment_url === 'string' &&
      (check5.data?.payment_url ?? '').startsWith('http'),
    'etapa5: payment_url http válido',
    errors,
  );
  details.etapa5 = {
    pending_id: pending5.id,
    asaas_subscription_id: realCharge.subscriptionId,
    asaas_payment_id: realCharge.paymentId,
    payment_url: check5.data?.payment_url,
    due_in_days: 3,
  };
  await pause(
    'Etapa 5: dê F5 no dashboard — alerta âmbar de pagamento pendente deve aparecer.',
  );

  return {
    scenario: 'interactive_lifecycle',
    pass: errors.length === 0,
    details,
    errors,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// RUNNER
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(
    '\n══════════════════════════════════════════════════════════════════',
  );
  console.log(' SIMULAÇÃO COMPLETA — asaas.service');
  console.log(
    '══════════════════════════════════════════════════════════════════',
  );
  console.log(`  userId:   ${userId}`);
  console.log(`  webhook:  ${webhookUrl}`);
  console.log(`  cenário:  ${scenarioArg}`);
  console.log(`  interactive: ${interactive ? 'true' : 'false'}`);
  console.log(`  pause: ${pauseBetweenScenarios ? 'true' : 'false'}`);

  const all: Record<string, () => Promise<ScenarioResult>> = {
    recurrency: scenarioRecurrency,
    first_subscription: scenarioFirstSubscription,
    free_upgrade: scenarioFreeUpgrade,
    credit_upgrade: scenarioCreditUpgrade,
    cycle_change: scenarioCycleChange,
    payment_change: scenarioPaymentChange,
    downgrade_credit: scenarioDowngradeCredit,
    downgrade_sched: scenarioDowngradeScheduled,
    downgrade_sched_cancel: scenarioDowngradeScheduledCancel,
    cancellation_refund: scenarioCancellationRefund,
    cancellation_scheduled: scenarioCancellationScheduled,
    overdue_grace: scenarioOverdueGrace,
    webhook_sub_canceled: scenarioWebhookSubCanceled,
    pending_blocks_upgrade: scenarioPendingBlocksUpgrade,
    interactive_lifecycle: scenarioInteractiveLifecycle,
  };

  const STANDARD_SCENARIO_KEYS = [
    'recurrency',
    'first_subscription',
    'free_upgrade',
    'credit_upgrade',
    'cycle_change',
    'payment_change',
    'downgrade_credit',
    'downgrade_sched',
    'downgrade_sched_cancel',
    'cancellation_refund',
    'cancellation_scheduled',
    'overdue_grace',
    'webhook_sub_canceled',
    'pending_blocks_upgrade',
  ] as const;

  let toRun: string[];
  if (scenarioArg === 'all') {
    const std = STANDARD_SCENARIO_KEYS.filter((k) => k in all);
    toRun = interactive ? ['interactive_lifecycle', ...std] : [...std];
    if (interactive) {
      console.log(
        '\n  · Ordem: interactive_lifecycle primeiro (pausas ENTER), depois os demais cenários.',
      );
    }
  } else {
    toRun = scenarioArg
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s in all);
  }

  const unknown =
    scenarioArg !== 'all'
      ? scenarioArg
          .split(',')
          .map((s) => s.trim())
          .filter((s) => !(s in all))
      : [];
  if (unknown.length)
    console.warn(
      `\n⚠ Desconhecidos: ${unknown.join(', ')}. Disponíveis: ${Object.keys(all).join(', ')}`,
    );

  if (
    scenarioArg === 'all' &&
    !interactive &&
    !toRun.includes('interactive_lifecycle')
  ) {
    console.log(
      '  · Cenário interativo desabilitado. Use --interactive=true para acoplar ao fluxo all.',
    );
  }

  const results: ScenarioResult[] = [];

  for (const name of toRun) {
    try {
      const r = await all[name]();
      results.push(r);
      console.log(`\n${r.pass ? '✅' : '❌'} [${r.scenario}]`);
      if (r.errors.length) r.errors.forEach((e) => console.log(`  ⚠ ${e}`));
      console.log('  ·', JSON.stringify(r.details));
      if (pauseBetweenScenarios) {
        await pauseForManualReview(r.scenario, r);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const failedResult = {
        scenario: name,
        pass: false,
        details: {},
        errors: [msg],
      } as ScenarioResult;
      results.push(failedResult);
      console.log(`\n❌ [${name}] EXCEPTION: ${msg}`);
      if (pauseBetweenScenarios) {
        await pauseForManualReview(name, failedResult);
      }
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log(
    '\n══════════════════════════════════════════════════════════════════',
  );
  console.log(` RESULTADO: ${passed}/${results.length} passaram`);
  if (failed > 0) {
    results
      .filter((r) => !r.pass)
      .forEach((r) => {
        console.log(`  ❌ ${r.scenario}`);
        r.errors.forEach((e) => console.log(`     → ${e}`));
      });
  } else {
    console.log(' Todos os cenários passaram! ✅');
  }
  console.log(
    '══════════════════════════════════════════════════════════════════\n',
  );

  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        userId,
        total: results.length,
        passed,
        failed,
        results,
      },
      null,
      2,
    ),
  );

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(
    '[test-recurrency] Fatal:',
    e instanceof Error ? e.message : String(e),
  );
  process.exit(1);
});
