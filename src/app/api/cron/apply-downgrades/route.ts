// src/app/api/cron/apply-downgrades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase.server';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { performDowngradeToFree } from '@/core/services/asaas.service';
import { getNeedsAdjustment } from '@/core/services/asaas/gallery/adjustments';
import {
  parseExpiryFromNotes,
  addMonths,
  billingPeriodToMonths,
} from '@/core/services/asaas/utils/dates';
import { billingNotesDisplayText } from '@/core/services/asaas/utils/billing-notes-doc';
import { getAsaasSubscription } from '@/core/services/asaas/api/subscriptions';
import type { PlanKey } from '@/core/config/plans';
import { enforcePhotoQuotaByArchivingOldest } from '@/core/services/asaas/gallery/quota-enforcement';
import { appendBillingNotesBlock } from '@/core/services/asaas/utils/billing-notes-doc';
import { logSystemEvent } from '@/core/utils/telemetry';
import { applyThemeRollbackForLowerPlan } from '@/core/services/theme-rollback.service';
import { setUpgradeRequestAsCurrent } from '@/core/services/billing/upgrade-request-current';

const OVERDUE_GRACE_DAYS = 5;

function extractLatestCancelWindowFromNotes(
  notes: string | null | undefined,
): {
  accessEndsAtFromLatestCancel: Date | null;
  hasReactivationAfterLatestCancel: boolean;
} {
  const text = billingNotesDisplayText(notes);
  if (!text.trim()) {
    return {
      accessEndsAtFromLatestCancel: null,
      hasReactivationAfterLatestCancel: false,
    };
  }

  let latestCancelPos = -1;
  let latestCancelEndsAt: Date | null = null;
  const cancelRegex =
    /Cancelamento solicitado em\s+([0-9T:.+\-Z]+)\.\s*Acesso até\s+([0-9T:.+\-Z]+)\./gi;
  let m: RegExpExecArray | null;
  while ((m = cancelRegex.exec(text)) !== null) {
    latestCancelPos = m.index;
    const parsedEnd = new Date(m[2] ?? '');
    latestCancelEndsAt = Number.isNaN(parsedEnd.getTime()) ? null : parsedEnd;
  }

  if (latestCancelPos < 0) {
    return {
      accessEndsAtFromLatestCancel: null,
      hasReactivationAfterLatestCancel: false,
    };
  }

  const reactivationPos = Math.max(
    text.lastIndexOf('[Reactivation'),
    text.lastIndexOf('Assinatura reativada'),
  );
  return {
    accessEndsAtFromLatestCancel: latestCancelEndsAt,
    hasReactivationAfterLatestCancel: reactivationPos > latestCancelPos,
  };
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
  const supabase = createSupabaseAdmin();
  const now = nowFn();
  const results = {
    processed: 0,
    skipped: 0,
    quota_adjusted: 0,
    errors: [] as string[],
  };

  // ── 1. Downgrade programado (pending_downgrade com acesso vencido) ────────
  const { data: scheduledPendingDowngrade, error: scheduledPendingDowngradeErr } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, profile_id, plan_key_requested, billing_period, processed_at, scheduled_cancel_at, notes, status, asaas_raw_status',
    )
    .eq('status', 'pending_downgrade')
    .order('created_at', { ascending: true });

  const { data: scheduledPendingCancellation, error: scheduledPendingCancellationErr } =
    await supabase
      .from('tb_upgrade_requests')
      .select(
        'id, profile_id, plan_key_requested, billing_period, processed_at, scheduled_cancel_at, notes, status, asaas_raw_status',
      )
      .eq('status', 'pending_cancellation')
    .order('created_at', { ascending: true });

  if (scheduledPendingDowngradeErr || scheduledPendingCancellationErr) {
    const msg =
      scheduledPendingDowngradeErr?.message ??
      scheduledPendingCancellationErr?.message ??
      'Erro ao buscar downgrades agendados';
    await logSystemEvent({
      serviceName: 'cron/apply-downgrades',
      status: 'error',
      executionTimeMs: Date.now() - startTime,
      errorMessage: msg,
      payload: {
        scheduledPendingDowngradeErr: scheduledPendingDowngradeErr?.message,
        scheduledPendingCancellationErr:
          scheduledPendingCancellationErr?.message,
      },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const scheduled = [
    ...(scheduledPendingDowngrade ?? []),
    ...(scheduledPendingCancellation ?? []),
  ].sort(
    (a, b) =>
      new Date(a.processed_at ?? 0).getTime() -
      new Date(b.processed_at ?? 0).getTime(),
  );

  for (const row of scheduled ?? []) {
    try {
      const {
        accessEndsAtFromLatestCancel,
        hasReactivationAfterLatestCancel,
      } = extractLatestCancelWindowFromNotes(row.notes);
      if (hasReactivationAfterLatestCancel) {
        const recoveredStatus =
          row.status === 'pending_downgrade' || row.status === 'pending_cancellation'
            ? 'approved'
            : row.status;
        const note = `[Cron apply-downgrades] ${utcIsoFrom(now)} - Linha reativada após último cancelamento; downgrade agendado ignorado. status_atual=${row.status}; status_ajustado=${recoveredStatus}.`;
        await supabase
          .from('tb_upgrade_requests')
          .update({
            status: recoveredStatus,
            notes: appendBillingNotesBlock(row.notes, note),
            scheduled_cancel_at: null,
            updated_at: utcIsoFrom(now),
          })
          .eq('id', row.id);
        results.skipped++;
        continue;
      }

      const fromNotes = parseExpiryFromNotes(row.notes);
      const fromScheduledCancelAt = row.scheduled_cancel_at
        ? new Date(row.scheduled_cancel_at)
        : null;
      const processedAtDate = row.processed_at ? new Date(row.processed_at) : null;
      const isPendingScheduledStatus =
        row.status === 'pending_downgrade' ||
        row.status === 'pending_cancellation';
      // Fonte da verdade para cancelamento agendado:
      // pending_* => scheduled_cancel_at.
      // Fallback apenas quando scheduled_cancel_at estiver nulo.
      const pendingAuthoritativeEndsAt =
        isPendingScheduledStatus && fromScheduledCancelAt
          ? fromScheduledCancelAt
          : null;
      const accessEndSource = pendingAuthoritativeEndsAt
        ? 'scheduled_cancel_at'
        : accessEndsAtFromLatestCancel
          ? 'notes_latest_cancel'
          : fromNotes
            ? 'notes'
            : isPendingScheduledStatus &&
                processedAtDate &&
                processedAtDate.getTime() > now.getTime()
              ? 'processed_at'
              : 'processed_at_plus_billing_period';

      const accessEndsAt =
        pendingAuthoritativeEndsAt ??
        accessEndsAtFromLatestCancel ??
        fromNotes ??
        (isPendingScheduledStatus &&
        processedAtDate &&
        processedAtDate.getTime() > now.getTime()
          ? processedAtDate
          : addMonths(
              new Date(row.processed_at ?? utcIsoFrom(now)),
              billingPeriodToMonths(row.billing_period),
            ));

      if (accessEndsAt.getTime() > now.getTime()) {
        const skipNote = `[Cron apply-downgrades] ${utcIsoFrom(now)} - Ainda dentro do período pago. origem_data_fim=${accessEndSource}; access_ends_at=${utcIsoFrom(accessEndsAt)}; status=${row.status}; asaas_raw_status=${row.asaas_raw_status ?? 'n/a'}`;
        await supabase
          .from('tb_upgrade_requests')
          .update({
            notes: appendBillingNotesBlock(row.notes, skipNote),
            updated_at: utcIsoFrom(now),
          })
          .eq('id', row.id);
        results.skipped++;
        continue;
      }

      const result = await performDowngradeToFree(
        row.profile_id,
        row.id,
        `Downgrade automático (cron): período pago encerrado em ${utcIsoFrom(accessEndsAt)}`,
      );

      if (result.success) {
        const successNote = `[Cron apply-downgrades] ${utcIsoFrom(now)} - Downgrade aplicado para FREE. origem_data_fim=${accessEndSource}; access_ends_at=${utcIsoFrom(accessEndsAt)}; status=${row.status}; asaas_raw_status=${row.asaas_raw_status ?? 'n/a'}`;
        await supabase
          .from('tb_upgrade_requests')
          .update({
            notes: appendBillingNotesBlock(row.notes, successNote),
            updated_at: utcIsoFrom(now),
          })
          .eq('id', row.id);
        await enforcePhotoQuotaByArchivingOldest(supabase, row.profile_id, 'FREE');
        results.processed++;
      } else {
        const errorNote = `[Cron apply-downgrades] ${utcIsoFrom(now)} - Falha ao aplicar downgrade. origem_data_fim=${accessEndSource}; access_ends_at=${utcIsoFrom(accessEndsAt)}; erro=${result.error}`;
        await supabase
          .from('tb_upgrade_requests')
          .update({
            notes: appendBillingNotesBlock(row.notes, errorNote),
            updated_at: utcIsoFrom(now),
          })
          .eq('id', row.id);
        results.errors.push(`[scheduled] ${row.id}: ${result.error}`);
      }
    } catch (e) {
      results.errors.push(
        `[scheduled] ${row.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // ── 2. Downgrade por atraso (approved + overdue_since + 5 dias) ───────────
  const graceCutoffMs =
    now.getTime() - OVERDUE_GRACE_DAYS * 24 * 60 * 60 * 1000;

  const { data: overdue, error: overdueErr } = await supabase
    .from('tb_upgrade_requests')
    .select(
      'id, profile_id, plan_key_requested, asaas_subscription_id, overdue_since',
    )
    .eq('status', 'approved')
    .not('overdue_since', 'is', null)
    .lte('overdue_since', utcIsoFrom(new Date(graceCutoffMs)))
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
            .update({ overdue_since: null, updated_at: utcIsoFrom(now) })
            .eq('id', row.id);
          results.skipped++;
          continue;
        }
      }

      // Salva o last_paid_plan antes do downgrade
      const { data: profileData } = await supabase
        .from('tb_profiles')
        .select('plan_key')
        .eq('id', row.profile_id)
        .single();
      
      if (profileData?.plan_key && profileData.plan_key !== 'FREE') {
        await supabase
          .from('tb_profiles')
          .update({ last_paid_plan: profileData.plan_key })
          .eq('id', row.profile_id);
      }

      const result = await performDowngradeToFree(
        row.profile_id,
        row.id,
        `Downgrade automático (cron): pagamento em atraso desde ${row.overdue_since}, carência de ${OVERDUE_GRACE_DAYS} dias esgotada.`,
      );

      if (result.success) {
        await enforcePhotoQuotaByArchivingOldest(supabase, row.profile_id, 'FREE');
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
    .lte('processed_at', utcIsoFrom(now))
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
        downgrade_reason: `Mudança agendada aplicada (cron). Registro: ${row.id}`,
        downgrade_at: utcIsoFrom(now),
      };

      await applyThemeRollbackForLowerPlan(supabase, profileId, newPlanKey);

      const { error: planError } = await supabase
        .from('tb_profiles')
        .update({
          plan_key: newPlanKey,
          metadata: newMetadata,
          is_cancelling: false,
          updated_at: utcIsoFrom(now),
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
          updated_at: utcIsoFrom(now),
        })
        .eq('id', row.id);

      {
        const { error: curErr } = await setUpgradeRequestAsCurrent(
          supabase,
          profileId,
          row.id,
        );
        if (curErr) {
          console.warn(
            `[pending_change] setUpgradeRequestAsCurrent: ${curErr}`,
          );
        }
      }

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
            updated_at: utcIsoFrom(now),
          })
          .in('id', excessIds);
        if (hideError) {
          console.warn(
            `[pending_change] ${row.id}: Não foi possível arquivar galerias excedentes:`,
            hideError,
          );
        }
      }

      await enforcePhotoQuotaByArchivingOldest(supabase, profileId, newPlanKey);

      results.processed++;
    } catch (e) {
      results.errors.push(
        `[pending_change] ${row.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // ── 4. Enforcement de limites (fallback): perfis acima da cota/limite ─────
  // Esse passo cobre cenários em que não existe pending_downgrade, mas o usuário
  // já está acima dos limites do plano atual (ex.: fluxo antigo/inconsistente).
  const { data: activeProfiles, error: activeProfilesErr } = await supabase
    .from('tb_profiles')
    .select('id, plan_key, is_exempt');

  if (activeProfilesErr) {
    results.errors.push(`[quota_enforcement query] ${activeProfilesErr.message}`);
  }

  const nonExemptProfiles = (activeProfiles ?? []).filter(
    (profile) => profile.is_exempt !== true,
  );

  for (const profile of nonExemptProfiles) {
    try {
      const planKey = (profile.plan_key ?? 'FREE') as PlanKey;
      let adjustedAny = false;

      const adjustment = await getNeedsAdjustment(profile.id, planKey, supabase);
      if (adjustment.needs_adjustment && adjustment.excess_galleries.length > 0) {
        const excessIds = adjustment.excess_galleries.map((g) => g.id);
        const { error: hideError } = await supabase
          .from('tb_galerias')
          .update({
            is_public: false,
            auto_archived: true,
            updated_at: utcIsoFrom(now),
          })
          .in('id', excessIds);

        if (hideError) {
          results.errors.push(
            `[quota_enforcement galleries] ${profile.id}: ${hideError.message}`,
          );
        } else {
          results.processed++;
          results.quota_adjusted++;
          adjustedAny = true;
        }
      }

      const quotaResult = await enforcePhotoQuotaByArchivingOldest(
        supabase,
        profile.id,
        planKey,
      );
      if (quotaResult.archivedCount > 0) {
        results.processed++;
        results.quota_adjusted++;
        adjustedAny = true;
      }

      if (!adjustedAny) {
        results.skipped++;
      }
    } catch (e) {
      results.errors.push(
        `[quota_enforcement] ${profile.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log('[apply-downgrades]', results);

  await logSystemEvent({
    serviceName: 'cron/apply-downgrades',
    status: results.errors.length > 0 ? 'partial' : 'success',
    executionTimeMs: Date.now() - startTime,
    payload: {
      processed: results.processed,
      skipped: results.skipped,
      quota_adjusted: results.quota_adjusted,
      errorCount: results.errors.length,
      errors: results.errors,
    },
    errorMessage:
      results.errors.length > 0 ? results.errors.join(' | ') : undefined,
  });

  return NextResponse.json({
    ok: true,
    timestamp: utcIsoFrom(now),
    ...results,
  });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logSystemEvent({
      serviceName: 'cron/apply-downgrades',
      status: 'error',
      executionTimeMs: Date.now() - startTime,
      errorMessage: err.message,
      payload: { stack: err.stack },
    });
    return NextResponse.json(
      { ok: false, error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
