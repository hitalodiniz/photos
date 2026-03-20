// src/app/api/admin/dev-reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createSupabaseAdmin } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { addSecondsToSaoPauloIso } from '@/core/utils/date-time';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ResetAction =
  | 'clean_billing' // Limpa tabelas de billing + Asaas sandbox
  | 'clean_asaas' // Remove assinaturas e cobranças no sandbox Asaas dos usuários de teste
  | 'clean_asaas_payments' // Remove TODAS as cobranças do sandbox Asaas (sem depender do banco)
  | 'set_plan' // Atualiza plan_key e is_exempt de um username
  | 'simulate_expired' // Simula upgrade_request vencido há mais de 7 dias para um username
  | 'simulate_trial' // Simula trial vencido há 1h para um username
  | 'restore_galerias' // Desfaz auto_archived em todas as galerias
  | 'simulate_overdue' // Simula atraso de pagamento para um username
  | 'revalidate_users'; // Revalida tags de cache dos usuários de teste

interface ResetPayload {
  action: ResetAction;
  username?: string;
  plan_key?: string;
}

// ─── Usernames permitidos para limpeza Asaas ──────────────────────────────────

const TEST_USERNAMES = [
  'hitalodiniz',
  'hitalodiniz80',
  'hitalomentor',
] as const;

// ─── Guard de segurança ───────────────────────────────────────────────────────

async function assertAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'Rota indisponível em produção.' };
  }
  const { profile } = await getAuthenticatedUser();
  if (!profile?.roles?.includes('admin')) {
    return { ok: false, error: 'Acesso restrito a administradores.' };
  }
  return { ok: true };
}

// ─── Helpers Asaas ────────────────────────────────────────────────────────────

const ASAAS_BASE = 'https://sandbox.asaas.com/api/v3';
const ASAAS_KEY = process.env.ASAAS_API_KEY ?? process.env.ASAAS_KEY ?? '';

async function asaasList<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${ASAAS_BASE}${path}${sep}limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { access_token: ASAAS_KEY },
      cache: 'no-store',
    });
    if (!res.ok) break;
    const data = await res.json();
    const items: T[] = data.data ?? [];
    all.push(...items);
    if (!data.hasMore) break;
    offset += limit;
  }
  return all;
}

async function asaasDelete(path: string): Promise<boolean> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method: 'DELETE',
    headers: { access_token: ASAAS_KEY },
    cache: 'no-store',
  });
  return res.ok || res.status === 404;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface AsaasCleanupResult {
  username: string;
  customerId: string;
  subscriptionsCancelled: number;
  paymentsDeleted: number;
  errors: string[];
}

interface ProfileLite {
  id: string;
  username: string;
  email?: string | null;
}

// ─── Resolve customer_ids via 3 fontes ───────────────────────────────────────
// 1. tb_billing_profiles
// 2. tb_upgrade_requests (quando billing_profiles já foi limpo)
// 3. Busca direta no Asaas por email (quando ambas as tabelas estão limpas)

async function resolveAsaasCustomerIdsByProfile(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  profiles: ProfileLite[],
): Promise<Map<string, Set<string>>> {
  const profileToCustomers = new Map<string, Set<string>>();
  const profileIds = profiles.map((p) => p.id);

  // Fonte 1: billing profiles
  const { data: billingProfiles } = await supabase
    .from('tb_billing_profiles')
    .select('id, asaas_customer_id')
    .in('id', profileIds);

  for (const bp of billingProfiles ?? []) {
    if (!bp.asaas_customer_id) continue;
    if (!profileToCustomers.has(bp.id))
      profileToCustomers.set(bp.id, new Set());
    profileToCustomers.get(bp.id)!.add(bp.asaas_customer_id);
  }

  // Fonte 2: upgrade requests (fallback quando billing_profiles foi limpo)
  const { data: upgradeRequests } = await supabase
    .from('tb_upgrade_requests')
    .select('profile_id, asaas_customer_id')
    .in('profile_id', profileIds)
    .not('asaas_customer_id', 'is', null);

  for (const req of upgradeRequests ?? []) {
    if (!req.asaas_customer_id) continue;
    if (!profileToCustomers.has(req.profile_id))
      profileToCustomers.set(req.profile_id, new Set());
    profileToCustomers.get(req.profile_id)!.add(req.asaas_customer_id);
  }

  // Fonte 3: busca no Asaas por email (quando ambas as tabelas estão limpas)
  for (const p of profiles) {
    const alreadyHas = (profileToCustomers.get(p.id)?.size ?? 0) > 0;
    if (alreadyHas || !p.email) continue;
    const customers = await asaasList<{ id: string }>(
      `/customers?email=${encodeURIComponent(p.email)}`,
    );
    if (!customers.length) continue;
    if (!profileToCustomers.has(p.id)) profileToCustomers.set(p.id, new Set());
    for (const c of customers) {
      if (c.id) profileToCustomers.get(p.id)!.add(c.id);
    }
  }

  return profileToCustomers;
}

// ─── Limpa Asaas para um customer_id ─────────────────────────────────────────

async function cleanAsaasForCustomer(
  customerId: string,
  username: string,
): Promise<AsaasCleanupResult> {
  const result: AsaasCleanupResult = {
    username,
    customerId,
    subscriptionsCancelled: 0,
    paymentsDeleted: 0,
    errors: [],
  };

  // 1. Cancela todas as assinaturas
  const subscriptions = await asaasList<{ id: string; status: string }>(
    `/subscriptions?customer=${customerId}`,
  );

  for (const sub of subscriptions) {
    if (sub.status === 'INACTIVE') {
      result.subscriptionsCancelled++;
      continue;
    }
    const ok = await asaasDelete(`/subscriptions/${sub.id}`);
    if (ok) result.subscriptionsCancelled++;
    else result.errors.push(`Sub ${sub.id}: falha ao cancelar`);
  }

  // 2. Remove cobranças avulsas (one-off)
  const payments = await asaasList<{ id: string; status: string }>(
    `/payments?customer=${customerId}&includeDeleted=false`,
  );

  const deleted = new Set<string>();
  for (const pay of payments) {
    if (deleted.has(pay.id)) continue;
    const ok = await asaasDelete(`/payments/${pay.id}`);
    if (ok) {
      result.paymentsDeleted++;
      deleted.add(pay.id);
    } else
      result.errors.push(`Pay ${pay.id} (${pay.status}): falha ao deletar`);
  }

  return result;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await assertAdmin();
  if (!guard.ok) {
    const errorMessage =
      'error' in guard ? guard.error : 'Acesso restrito a administradores.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 403 },
    );
  }

  const supabase = createSupabaseAdmin();
  const body: ResetPayload = await req.json();
  const { action, username, plan_key } = body;

  try {
    switch (action) {
      // ── Limpeza geral de billing (inclui Asaas sandbox) ───────────────────
      case 'clean_billing': {
        // Limpa Asaas antes de apagar o vínculo local
        if (ASAAS_KEY) {
          const { data: profiles } = await supabase
            .from('tb_profiles')
            .select('id, username, email')
            .in('username', TEST_USERNAMES);

          if (profiles?.length) {
            const profileToCustomers = await resolveAsaasCustomerIdsByProfile(
              supabase,
              profiles,
            );
            for (const profile of profiles) {
              for (const customerId of profileToCustomers.get(profile.id) ??
                []) {
                await cleanAsaasForCustomer(customerId, profile.username);
              }
            }
          }
        }

        await supabase
          .from('tb_plan_sync_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase
          .from('tb_webhook_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase
          .from('tb_upgrade_requests')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase
          .from('tb_billing_profiles')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        return NextResponse.json({
          success: true,
          message: 'Asaas sandbox + tabelas de billing limpas.',
        });
      }

      // ── Limpeza Asaas sandbox (por customer_id dos usuários de teste) ──────
      case 'clean_asaas': {
        if (!ASAAS_KEY) {
          return NextResponse.json(
            {
              success: false,
              error: 'ASAAS_API_KEY não configurada no ambiente.',
            },
            { status: 500 },
          );
        }

        const { data: profiles } = await supabase
          .from('tb_profiles')
          .select('id, username, email')
          .in('username', TEST_USERNAMES);

        if (!profiles?.length) {
          return NextResponse.json(
            {
              success: false,
              error: 'Nenhum usuário de teste encontrado no banco.',
            },
            { status: 404 },
          );
        }

        const profileToCustomers = await resolveAsaasCustomerIdsByProfile(
          supabase,
          profiles,
        );
        const results: AsaasCleanupResult[] = [];
        let totalSubs = 0;
        let totalPays = 0;
        const allErrors: string[] = [];

        for (const profile of profiles) {
          for (const customerId of profileToCustomers.get(profile.id) ?? []) {
            const r = await cleanAsaasForCustomer(customerId, profile.username);
            results.push(r);
            totalSubs += r.subscriptionsCancelled;
            totalPays += r.paymentsDeleted;
            allErrors.push(...r.errors);
          }
        }

        const semCustomer = profiles
          .filter((p) => (profileToCustomers.get(p.id)?.size ?? 0) === 0)
          .map((p) => p.username);

        const message = [
          `${results.length} cliente(s) processado(s) no Asaas.`,
          `${totalSubs} assinatura(s) cancelada(s).`,
          `${totalPays} cobrança(s) removida(s).`,
          semCustomer.length
            ? `Sem customer_id (ignorados): ${semCustomer.join(', ')}.`
            : '',
          allErrors.length ? `${allErrors.length} erro(s) — veja details.` : '',
        ]
          .filter(Boolean)
          .join(' ');

        return NextResponse.json({
          success: true,
          message,
          details: results,
          errors: allErrors,
        });
      }

      // ── Remove TODAS as cobranças do sandbox (sem depender do banco) ───────
      case 'clean_asaas_payments': {
        if (!ASAAS_KEY) {
          return NextResponse.json(
            {
              success: false,
              error: 'ASAAS_API_KEY não configurada no ambiente.',
            },
            { status: 500 },
          );
        }

        // Busca todas as cobranças da conta sandbox sem filtro de customer
        const allPayments = await asaasList<{
          id: string;
          status: string;
          value: number;
        }>('/payments?includeDeleted=false');

        let deleted = 0;
        let skipped = 0;
        const errors: string[] = [];
        const deletedIds = new Set<string>();

        for (const pay of allPayments) {
          if (deletedIds.has(pay.id)) continue;
          const ok = await asaasDelete(`/payments/${pay.id}`);
          if (ok) {
            deleted++;
            deletedIds.add(pay.id);
          } else {
            skipped++;
            errors.push(
              `Pay ${pay.id} (${pay.status} R$${pay.value}): não removido`,
            );
          }
        }

        const message = [
          `${allPayments.length} cobrança(s) encontrada(s) no sandbox.`,
          `${deleted} removida(s).`,
          skipped ? `${skipped} não removida(s) (status bloqueante).` : '',
        ]
          .filter(Boolean)
          .join(' ');

        return NextResponse.json({
          success: true,
          message,
          deleted,
          skipped,
          errors: errors.slice(0, 10),
        });
      }

      // ── Definir plano de um usuário ───────────────────────────────────────
      case 'set_plan': {
        if (!username || !plan_key) {
          return NextResponse.json(
            { success: false, error: 'username e plan_key são obrigatórios.' },
            { status: 400 },
          );
        }
        const { error } = await supabase
          .from('tb_profiles')
          .update({ plan_key, is_exempt: false, is_trial: false })
          .eq('username', username);
        if (error) throw error;
        return NextResponse.json({
          success: true,
          message: `${username} → ${plan_key}`,
        });
      }

      // ── Simular upgrade_request vencido há >7 dias ────────────────────────
      case 'simulate_expired': {
        if (!username) {
          return NextResponse.json(
            { success: false, error: 'username obrigatório.' },
            { status: 400 },
          );
        }
        const { data: profile } = await supabase
          .from('tb_profiles')
          .select('id')
          .eq('username', username)
          .single();
        if (!profile) {
          return NextResponse.json(
            { success: false, error: 'Usuário não encontrado.' },
            { status: 404 },
          );
        }
        const { error } = await supabase
          .from('tb_upgrade_requests')
          .update({
            processed_at: '2026-02-10 14:00:00+00',
            created_at: '2026-02-10 13:55:00+00',
            updated_at: '2026-02-10 14:00:00+00',
          })
          .eq('profile_id', profile.id);
        if (error) throw error;
        return NextResponse.json({
          success: true,
          message: `upgrade_request de ${username} marcado como expirado (>7 dias).`,
        });
      }

      // ── Simular trial vencido há 1h ───────────────────────────────────────
      case 'simulate_trial': {
        if (!username) {
          return NextResponse.json(
            { success: false, error: 'username obrigatório.' },
            { status: 400 },
          );
        }
        const input = username.trim();
        const inputLower = input.toLowerCase();

        // Resolve o perfil alvo de forma robusta (username exato, case-insensitive e email)
        let profileRow:
          | { id: string; username: string | null; email: string | null }
          | null
          | undefined = null;

        const { data: byUsernameExact } = await supabase
          .from('tb_profiles')
          .select('id, username, email')
          .eq('username', input)
          .maybeSingle();
        profileRow = byUsernameExact;

        if (!profileRow) {
          const { data: byUsernameInsensitive } = await supabase
            .from('tb_profiles')
            .select('id, username, email')
            .ilike('username', inputLower)
            .maybeSingle();
          profileRow = byUsernameInsensitive;
        }

        if (!profileRow) {
          const { data: byEmail } = await supabase
            .from('tb_profiles')
            .select('id, username, email')
            .ilike('email', inputLower)
            .maybeSingle();
          profileRow = byEmail;
        }

        if (!profileRow) {
          return NextResponse.json(
            {
              success: false,
              error: `Usuário não encontrado para "${username}" (username/email).`,
            },
            { status: 404 },
          );
        }

        const expiredAt = addSecondsToSaoPauloIso(-60 * 60);
        const { error } = await supabase
          .from('tb_profiles')
          .update({
            plan_key: plan_key ?? 'PRO',
            is_exempt: false,
            is_trial: true,
            plan_trial_expires: expiredAt,
          })
          .eq('id', profileRow.id);
        if (error) throw error;

        if (profileRow) {
          await supabase
            .from('tb_galerias')
            .update({ auto_archived: false })
            .eq('user_id', profileRow.id)
            .eq('auto_archived', true);
        }
        return NextResponse.json({
          success: true,
          message: `${profileRow.username ?? username} → trial vencido há 1h (${expiredAt}).`,
        });
      }

      // ── Restaurar galerias auto_archived ──────────────────────────────────
      case 'restore_galerias': {
        let query = supabase
          .from('tb_galerias')
          .update({ auto_archived: false })
          .eq('auto_archived', true);

        if (username) {
          const { data: profileRow } = await supabase
            .from('tb_profiles')
            .select('id')
            .eq('username', username)
            .single();
          if (profileRow) {
            query = (query as any).eq('user_id', profileRow.id);
          }
        }

        const { error, count } = await query;
        if (error) throw error;
        return NextResponse.json({
          success: true,
          message: `${count ?? '?'} galerias restauradas (auto_archived → false).`,
        });
      }

      // ── Simular atraso de pagamento ───────────────────────────────────────
      case 'simulate_overdue': {
        if (!username) {
          return NextResponse.json(
            { success: false, error: 'username obrigatório.' },
            { status: 400 },
          );
        }
        const { data: profileRow } = await supabase
          .from('tb_profiles')
          .select('id')
          .eq('username', username)
          .single();
        if (!profileRow) {
          return NextResponse.json(
            { success: false, error: 'Usuário não encontrado.' },
            { status: 404 },
          );
        }
        await supabase
          .from('tb_profiles')
          .update({
            plan_key: plan_key ?? 'PRO',
            is_exempt: false,
            is_trial: true,
            plan_trial_expires: addSecondsToSaoPauloIso(24 * 60 * 60),
          })
          .eq('username', username);

        const overdueSince = new Date(
          Date.now() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const { error } = await supabase
          .from('tb_upgrade_requests')
          .update({ overdue_since: overdueSince, status: 'pending' })
          .eq('profile_id', profileRow.id);
        if (error) throw error;
        return NextResponse.json({
          success: true,
          message: `${username} → overdue_since = ${overdueSince}.`,
        });
      }

      // ── Revalidar cache dos usuários de teste ─────────────────────────────
      case 'revalidate_users': {
        const { data: profiles, error: fetchError } = await supabase
          .from('tb_profiles')
          .select('id, username')
          .in('username', TEST_USERNAMES);

        if (fetchError) throw fetchError;
        if (!profiles?.length) {
          return NextResponse.json(
            { success: false, error: 'Nenhum usuário de teste encontrado.' },
            { status: 404 },
          );
        }

        for (const p of profiles) {
          const u = p.username;
          const id = p.id;
          revalidateTag(`profile-${u}`);
          revalidateTag(`profile-data-${u}`);
          revalidateTag(`profile-galerias-${u}`);
          revalidateTag(`profile-private-${id}`);
          revalidateTag(`user-galerias-${id}`);
          revalidateTag(`profile-categories-${id}`);
        }

        const names = profiles.map((p) => p.username).join(', ');
        return NextResponse.json({
          success: true,
          message: `Cache revalidado para ${profiles.length} usuário(s): ${names}.`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Ação desconhecida: ${action}` },
          { status: 400 },
        );
    }
  } catch (err: any) {
    console.error('[dev-reset]', err);
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Erro interno.' },
      { status: 500 },
    );
  }
}
