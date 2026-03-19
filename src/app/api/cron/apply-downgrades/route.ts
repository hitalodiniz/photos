// src/app/api/cron/apply-downgrades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase.server';
import { performDowngradeToFree } from '@/core/services/asaas.service';
import { getNeedsAdjustment } from '@/core/services/asaas/gallery/adjustments';
import {
  parseExpiryFromNotes,
  addMonths,
  billingPeriodToMonths,
} from '@/core/services/asaas/utils/dates';
import { getAsaasSubscription } from '@/core/services/asaas/api/subscriptions';
import { PLANS_BY_SEGMENT } from '@/core/config/plans';
import type { PlanKey } from '@/core/config/plans';

const OVERDUE_GRACE_DAYS = 5;
const SEGMENT = 'PHOTOGRAPHER' as const;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const now = new Date();
  const results = {
    processed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // ── 1. Downgrade programado (pending_downgrade com acesso vencido) ────────
  const { data: scheduled, error: scheduledErr } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, profile_id, plan_key_requested, billing_period, processed_at, notes',
    )
    .eq('status', 'pending_downgrade')
    .order('created_at', { ascending: true });

  if (scheduledErr) {
    return NextResponse.json({ error: scheduledErr.message }, { status: 500 });
  }

  for (const row of scheduled ?? []) {
    try {
      const fromNotes = parseExpiryFromNotes(row.notes);
      const accessEndsAt = fromNotes
        ? fromNotes
        : addMonths(
            new Date(row.processed_at ?? now),
            billingPeriodToMonths(row.billing_period),
          );

      if (accessEndsAt > now) {
        results.skipped++;
        continue;
      }

      const result = await performDowngradeToFree(
        row.profile_id,
        row.id,
        `Downgrade automático (cron): período pago encerrado em ${accessEndsAt.toISOString()}`,
      );

      if (result.success) {
        results.processed++;
      } else {
        results.errors.push(`[scheduled] ${row.id}: ${result.error}`);
      }
    } catch (e) {
      results.errors.push(
        `[scheduled] ${row.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // ── 2. Downgrade por atraso (approved + overdue_since + 5 dias) ───────────
  const graceCutoff = new Date(
    now.getTime() - OVERDUE_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );

  const { data: overdue, error: overdueErr } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, profile_id, plan_key_requested, asaas_subscription_id, overdue_since',
    )
    .eq('status', 'approved')
    .not('overdue_since', 'is', null)
    .lte('overdue_since', graceCutoff.toISOString())
    .order('overdue_since', { ascending: true });

  if (overdueErr) {
    results.errors.push(`[overdue query] ${overdueErr.message}`);
  }

  for (const row of overdue ?? []) {
    try {
      if (row.asaas_subscription_id) {
        const sub = await getAsaasSubscription(row.asaas_subscription_id);
        if (sub.success && sub.status === 'ACTIVE') {
          await supabase
            .from('tb_upgrade_requests')
            .update({ overdue_since: null, updated_at: now.toISOString() })
            .eq('id', row.id);
          results.skipped++;
          continue;
        }
      }

      const result = await performDowngradeToFree(
        row.profile_id,
        row.id,
        `Downgrade automático (cron): pagamento em atraso desde ${row.overdue_since}, carência de ${OVERDUE_GRACE_DAYS} dias esgotada.`,
      );

      if (result.success) {
        results.processed++;
      } else {
        results.errors.push(`[overdue] ${row.id}: ${result.error}`);
      }
    } catch (e) {
      results.errors.push(
        `[overdue] ${row.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // ── 3. NOVO: Mudança agendada (pending_change com processed_at vencido) ───
  //
  // pending_change.processed_at = data em que o plano atual expira.
  // Quando processed_at <= now:
  //   a) Atualiza plan_key no tb_profiles para o plano novo
  //   b) Marca o pending_change como 'approved'
  //   c) Arquiva galerias excedentes se necessário
  //   d) Registra em tb_plan_history
  //
  // Nota: NÃO chama performDowngradeToFree pois pode ser qualquer plano inferior,
  // não necessariamente FREE. Usa lógica própria abaixo.
  // ─────────────────────────────────────────────────────────────────────────

  const { data: pendingChanges, error: pendingChangeErr } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, profile_id, plan_key_current, plan_key_requested, billing_period, processed_at, asaas_subscription_id',
    )
    .eq('status', 'pending_change')
    .lte('processed_at', now.toISOString())
    .order('processed_at', { ascending: true });

  if (pendingChangeErr) {
    results.errors.push(`[pending_change query] ${pendingChangeErr.message}`);
  }

  for (const row of pendingChanges ?? []) {
    try {
      const profileId = row.profile_id;
      const newPlanKey = row.plan_key_requested as PlanKey;
      const oldPlanKey = row.plan_key_current as PlanKey;

      // Verifica se o perfil é isento (nunca downgradeamos isentos)
      const { data: profileRow } = await supabase
        .from('tb_profiles')
        .select('plan_key, is_exempt, metadata')
        .eq('id', profileId)
        .single();

      if (profileRow?.is_exempt === true) {
        results.skipped++;
        continue;
      }

      // Atualiza plan_key no perfil
      const newMetadata = {
        ...(profileRow?.metadata ?? {}),
        last_downgrade_alert_viewed: false,
      };

      const { error: planError } = await supabase
        .from('tb_profiles')
        .update({
          plan_key: newPlanKey,
          metadata: newMetadata,
          is_cancelling: false,
          updated_at: now.toISOString(),
        })
        .eq('id', profileId);

      if (planError) {
        results.errors.push(
          `[pending_change] ${row.id}: Erro ao atualizar plan_key: ${planError.message}`,
        );
        continue;
      }

      // Registra histórico
      await supabase.from('tb_plan_history').insert({
        profile_id: profileId,
        old_plan: oldPlanKey,
        new_plan: newPlanKey,
        reason: `Mudança agendada aplicada (cron). Registro: ${row.id}`,
      });

      // Aprova o pending_change
      await supabase
        .from('tb_upgrade_requests')
        .update({
          status: 'approved',
          updated_at: now.toISOString(),
        })
        .eq('id', row.id);

      // Arquiva galerias excedentes se necessário
      const adjustment = await getNeedsAdjustment(
        profileId,
        newPlanKey,
        supabase,
      );
      if (
        adjustment.needs_adjustment &&
        adjustment.excess_galleries.length > 0
      ) {
        const excessIds = adjustment.excess_galleries.map((g) => g.id);
        const { error: hideError } = await supabase
          .from('tb_galerias')
          .update({
            is_public: false,
            auto_archived: true,
            updated_at: now.toISOString(),
          })
          .in('id', excessIds);
        if (hideError) {
          console.warn(
            `[pending_change] ${row.id}: Não foi possível arquivar galerias excedentes:`,
            hideError,
          );
        }
      }

      results.processed++;
    } catch (e) {
      results.errors.push(
        `[pending_change] ${row.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log('[apply-downgrades]', results);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    ...results,
  });
}
