import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase.server';
import { performDowngradeToFree } from '@/core/services/asaas.service';
import {
  parseExpiryFromNotes,
  addMonths,
  billingPeriodToMonths,
} from '@/core/services/asaas/utils/dates';
import { getAsaasSubscription } from '@/core/services/asaas/api/subscriptions';

const OVERDUE_GRACE_DAYS = 5;

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

  // ── 1. Downgrade programado (pending_downgrade com acesso vencido) ─────────
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
      // Confirma no Asaas se ainda está em atraso (pode ter quitado sem webhook)
      if (row.asaas_subscription_id) {
        const sub = await getAsaasSubscription(row.asaas_subscription_id);
        if (sub.success && sub.status === 'ACTIVE') {
          // Pagamento regularizado — limpa overdue_since
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

  console.log('[apply-downgrades]', results);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    ...results,
  });
}
