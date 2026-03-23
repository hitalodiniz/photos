// scripts/test-recurrency.ts
// npx tsx scripts/test-recurrency.ts --userId="SEU_USER_ID" --scenario=all
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

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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
}): Promise<UpgradeRow> {
  const snap = await getSnapshotFields();
  const { data, error } = await sb
    .from('tb_upgrade_requests')
    .insert({
      profile_id: userId,
      plan_key_current: 'FREE',
      plan_key_requested: opts.plan,
      billing_type: opts.billingType,
      billing_period: opts.billingPeriod,
      ...snap,
      asaas_subscription_id: opts.subId,
      asaas_payment_id: opts.payId,
      amount_original: opts.amount,
      amount_discount: opts.discount ?? 0,
      amount_final: opts.amount - (opts.discount ?? 0),
      installments: 1,
      status: 'approved',
      processed_at: (opts.processedAt ?? new Date()).toISOString(),
      notes: opts.notes ?? null,
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
      amount_original: opts.amount,
      amount_discount: 0,
      amount_final: opts.amount,
      installments: 1,
      status: 'pending',
      processed_at: null,
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

async function scenarioRecurrency(): Promise<ScenarioResult> {
  const id = Date.now();
  const subId = `sub-rec-${id}`;
  const amount = 79;
  const errors: string[] = [];
  console.log('\n──── [recurrency] Renovação mensal 24 meses + OVERDUE ────');
  await resetUserState('PRO');

  const pay1 = `pay-rec-m1-${id}`;
  await insertPendingRequest({
    subId,
    payId: pay1,
    plan: 'PRO',
    billingType: 'PIX',
    billingPeriod: 'monthly',
    amount,
  });

  const r1 = await wh('PAYMENT_RECEIVED', pay1, amount, 'RECEIVED', subId);
  const p1 = await fetchProfile();
  assert(r1.http === 200, 'mês1 HTTP 200', errors);
  assert(p1.plan_key === 'PRO', `mês1 plan=PRO (got ${p1.plan_key})`, errors);

  let allHttp200 = true;
  const expiries: (Date | null)[] = [];
  for (let m = 2; m <= 24; m++) {
    const payM = `pay-rec-m${m}-${id}`;
    const rM = await wh('PAYMENT_RECEIVED', payM, amount, 'RECEIVED', subId);
    if (rM.http !== 200) allHttp200 = false;
    const rows = await fetchRowsBySubscription(subId);
    expiries.push(
      estimateExpiry(rows.find((r) => r.status === 'approved') ?? null),
    );
  }
  assert(allHttp200, 'todos meses HTTP 200', errors);
  assert(
    !expiries[0] || !expiries[23] || expiries[23]! > expiries[0]!,
    'vigência cresce mês a mês',
    errors,
  );

  const payOver = `pay-over-${id}`;
  const rOver = await wh('PAYMENT_OVERDUE', payOver, amount, 'OVERDUE', subId);
  assert(rOver.http === 200, 'OVERDUE HTTP 200', errors);
  const rowsAfter = await fetchRowsBySubscription(subId);
  const overdueMarked = rowsAfter.some(
    (r) => r.status === 'approved' && !!r.overdue_since,
  );
  assert(overdueMarked, 'overdue_since marcado', errors);
  const pOver = await fetchProfile();
  assert(pOver.plan_key === 'PRO', 'ainda PRO durante carência', errors);

  return {
    scenario: 'recurrency',
    pass: errors.length === 0,
    errors,
    details: {
      months: 24,
      all_http_200: allHttp200,
      expiry_m1: expiries[0]?.toISOString(),
      expiry_m24: expiries[23]?.toISOString(),
      overdue_marked: overdueMarked,
      plan_during_grace: pOver.plan_key,
    },
  };
}

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
      notes: `Upgrade gratuito (Crédito): Plano PLUS.\nSaldo residual R$ ${creditValue.toFixed(2)}; nova data de vencimento: ${newExpiry}.`,
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
      notes: `Aproveitamento de crédito pro-rata: R$ ${creditApplied.toFixed(2)}.`,
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
      notes: `Aproveitamento de crédito pro-rata: R$ ${creditApplied.toFixed(2)} (troca mensal → semestral).`,
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

  // Simula updateSubscriptionBillingMethod
  const newPayId = `pay-boleto-${id}`;
  const nowIso = new Date().toISOString();
  await sb
    .from('tb_upgrade_requests')
    .update({
      billing_type: 'BOLETO',
      asaas_payment_id: newPayId,
      notes: `[PaymentMethodChange ${nowIso}] PIX -> BOLETO`,
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

  // Aplica downgrade imediato + crédito (simula handleSubscriptionCancellation ≤7d)
  const pBefore = await fetchProfile();
  const metaBefore = (pBefore.metadata ?? {}) as Record<string, unknown>;
  const balanceBefore = Number(metaBefore.credit_balance ?? 0);
  const expectedBalance = Math.round((balanceBefore + amount) * 100) / 100;

  await sb
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      metadata: { ...metaBefore, credit_balance: expectedBalance },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  await sb
    .from('tb_upgrade_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', seed.id);
  await sb
    .from('tb_plan_history')
    .insert({
      profile_id: userId,
      old_plan: 'PRO',
      new_plan: 'FREE',
      reason: 'Arrependimento ≤7d',
    });

  const p = await fetchProfile();
  const balanceAfter = Number(
    ((p.metadata ?? {}) as Record<string, unknown>).credit_balance ?? 0,
  );

  assert(p.plan_key === 'FREE', `plan=FREE (got ${p.plan_key})`, errors);
  assert(
    balanceAfter >= amount,
    `credit_balance≥${amount} (got ${balanceAfter})`,
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
      notes: `Mudança agendada para Plano START.\nAssinatura atual encerrada em: ${expiresAt.toISOString().split('T')[0]}.`,
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
  await sb
    .from('tb_plan_history')
    .insert({
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
      notes: 'Mudança agendada.',
    })
    .select('*')
    .single();

  // Simula cancelScheduledChange
  await sb
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      notes: 'Intenção cancelada pelo usuário.',
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

  // Simula handleSubscriptionCancellation ≤7d
  const pBefore = await fetchProfile();
  const metaBefore = (pBefore.metadata ?? {}) as Record<string, unknown>;
  const balanceBefore = Number(metaBefore.credit_balance ?? 0);
  await sb
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      metadata: {
        ...metaBefore,
        credit_balance: Math.round((balanceBefore + amount) * 100) / 100,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  await sb
    .from('tb_upgrade_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', seed.id);

  const p = await fetchProfile();
  const balanceAfter = Number(
    ((p.metadata ?? {}) as Record<string, unknown>).credit_balance ?? 0,
  );
  assert(p.plan_key === 'FREE', `plan=FREE (got ${p.plan_key})`, errors);
  assert(
    balanceAfter >= amount,
    `credit≥${amount} (got ${balanceAfter})`,
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
      notes: `Cancelamento solicitado. Acesso até ${expiresAt.toISOString()}.`,
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

  // Simula cron
  await sb
    .from('tb_profiles')
    .update({
      plan_key: 'FREE',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  await sb
    .from('tb_upgrade_requests')
    .update({
      status: 'cancelled',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', seed.id);
  await sb
    .from('tb_plan_history')
    .insert({
      profile_id: userId,
      old_plan: 'PRO',
      new_plan: 'FREE',
      reason: 'Downgrade automático (cron simulado)',
    });

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

  // Cron aplica downgrade
  await sb
    .from('tb_profiles')
    .update({ plan_key: 'FREE', updated_at: new Date().toISOString() })
    .eq('id', userId);
  await sb
    .from('tb_upgrade_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', overdueRow?.id ?? seed.id);
  await sb
    .from('tb_plan_history')
    .insert({
      profile_id: userId,
      old_plan: 'PRO',
      new_plan: 'FREE',
      reason: `Inadimplência: carência ${GRACE}d esgotada`,
    });

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

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
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

// ═════════════════════════════════════════════════════════════════════════════
// RUNNER
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(
    '\n══════════════════════════════════════════════════════════════════',
  );
  console.log(' SIMULAÇÃO COMPLETA — asaas.service (14 cenários)');
  console.log(
    '══════════════════════════════════════════════════════════════════',
  );
  console.log(`  userId:   ${userId}`);
  console.log(`  webhook:  ${webhookUrl}`);
  console.log(`  cenário:  ${scenarioArg}`);

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
  };

  const toRun =
    scenarioArg === 'all'
      ? Object.keys(all)
      : scenarioArg
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s in all);

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

  const results: ScenarioResult[] = [];

  for (const name of toRun) {
    try {
      const r = await all[name]();
      results.push(r);
      console.log(`\n${r.pass ? '✅' : '❌'} [${r.scenario}]`);
      if (r.errors.length) r.errors.forEach((e) => console.log(`  ⚠ ${e}`));
      console.log('  ·', JSON.stringify(r.details));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ scenario: name, pass: false, details: {}, errors: [msg] });
      console.log(`\n❌ [${name}] EXCEPTION: ${msg}`);
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
