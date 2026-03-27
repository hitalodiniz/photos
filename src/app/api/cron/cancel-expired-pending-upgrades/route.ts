// src/app/api/cron/cancel-expired-pending-upgrades/route.ts
import { createClient } from '@supabase/supabase-js';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { NextResponse } from 'next/server';
import { cancelAsaasSubscriptionById, deleteAsaasPayment } from '@/core/services/asaas';
import { appendBillingNotesBlock } from '@/core/services/asaas/utils/billing-notes-doc';
import { logSystemEvent } from '@/core/utils/telemetry';
import { rollbackPendingUpgradeOnAsaas } from '@/core/services/billing.service';
import type { BillingPeriod, BillingType } from '@/core/types/billing';

// Prazos diferenciados (em milissegundos)
const AGE_LIMITS = {
  CREDIT_CARD: 2 * 60 * 60 * 1000, // 2 horas
  PIX: 48 * 60 * 60 * 1000, // 2 dias
  BOLETO: 5 * 24 * 60 * 60 * 1000, // 5 dias
};
const CRITICAL_OVERDUE_DAYS = 30;

export async function GET(request: Request) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = nowFn();
  try {
    const criticalOverdueCutoff = new Date(
      now.getTime() - CRITICAL_OVERDUE_DAYS * 24 * 60 * 60 * 1000,
    );
    const [pendingQuery, criticalOverdueQuery] = await Promise.all([
      supabase
        .from('tb_upgrade_requests')
        .select(
          'id, profile_id, created_at, asaas_payment_id, asaas_subscription_id, notes, billing_type, billing_period, plan_key_current',
        )
        .eq('status', 'pending'),
      supabase
        .from('tb_upgrade_requests')
        .select(
          'id, profile_id, notes, asaas_subscription_id, overdue_since, plan_key_current',
        )
        .eq('status', 'approved')
        .not('overdue_since', 'is', null)
        .lte('overdue_since', utcIsoFrom(criticalOverdueCutoff)),
    ]);

    if (pendingQuery.error || criticalOverdueQuery.error) {
      const queryError =
        pendingQuery.error?.message ??
        criticalOverdueQuery.error?.message ??
        'Erro ao buscar registros para cancelamento';
      console.error(
        '[cancel-expired-pending-upgrades] Select error:',
        queryError,
      );
      await logSystemEvent({
        serviceName: 'cron/cancel-expired-pending-upgrades',
        status: 'error',
        executionTimeMs: Date.now() - startTime,
        errorMessage: queryError,
        payload: {
          pendingQueryError: pendingQuery.error?.message,
          criticalOverdueQueryError: criticalOverdueQuery.error?.message,
        },
      });
      return NextResponse.json({ error: queryError }, { status: 500 });
    }
    const rows = pendingQuery.data ?? [];
    const criticalOverdueRows = criticalOverdueQuery.data ?? [];

    // 🎯 Lógica de Filtragem Inteligente
    const rowsToCancel = (rows ?? []).filter((r) => {
      const createdAt = new Date(r.created_at).getTime();
      const type = (r.billing_type as keyof typeof AGE_LIMITS) || 'PIX'; // Default para PIX se nulo
      const limit = AGE_LIMITS[type] || AGE_LIMITS.PIX;

      return now.getTime() - createdAt > limit;
    });

    const cancelledIds: string[] = [];
    const overdueExpiredIds: string[] = [];
    const errors: string[] = [];
    let skipped = 0;

    for (const row of rowsToCancel) {
      const requestId = String(row.id);
      const paymentId = String(row.asaas_payment_id ?? '').trim();
      const subscriptionId = String(row.asaas_subscription_id ?? '').trim();
      const billingType =
        (row.billing_type as keyof typeof AGE_LIMITS) || 'PIX';
      const limitMs = AGE_LIMITS[billingType] || AGE_LIMITS.PIX;
      const limitHours = Math.round(limitMs / (60 * 60 * 1000));
      const hasCreditCarryover =
        /aproveitamento de crédito|aproveitamento de credito/i.test(
          row.notes ?? '',
        );

      if (subscriptionId) {
        const gatewayRollback = await rollbackPendingUpgradeOnAsaas({
          supabase,
          userId: row.profile_id,
          requestId,
          row: {
            notes: row.notes,
            asaas_subscription_id: row.asaas_subscription_id,
            asaas_payment_id: row.asaas_payment_id,
            plan_key_current: row.plan_key_current,
            billing_period: row.billing_period as BillingPeriod,
            billing_type: row.billing_type as BillingType,
          },
        });
        if (!gatewayRollback.success) {
          errors.push(
            `[${requestId}] Rollback gateway (expirado): ${gatewayRollback.error ?? 'erro desconhecido'}`,
          );
          continue;
        }
      } else if (paymentId) {
        const cancelAsaas = await deleteAsaasPayment(paymentId);
        if (!cancelAsaas.success) {
          errors.push(
            `[${requestId}] Falha ao cancelar cobrança no Asaas (${paymentId}): ${cancelAsaas.error ?? 'erro desconhecido'}`,
          );
          continue;
        }
      } else {
        skipped++;
      }

      // Se uma tentativa de mudança expirar, restaura o plano anterior com
      // plan_key_current para evitar perfil sem plano por checkout abandonado.
      if (row.profile_id && row.plan_key_current) {
        const { error: restorePlanError } = await supabase
          .from('tb_profiles')
          .update({
            plan_key: row.plan_key_current,
            updated_at: utcIsoFrom(now),
          })
          .eq('id', row.profile_id);
        if (restorePlanError) {
          errors.push(
            `[${requestId}] Falha ao restaurar plano anterior (${row.plan_key_current}): ${restorePlanError.message}`,
          );
          continue;
        }
      }

      const noteLine = `[Cron cancel-expired-pending-upgrades] ${utcIsoFrom(now)} - Upgrade não concluído no prazo (${limitHours}h, billing_type=${billingType}). Solicitação pendente expirada e cobrança cancelada no Asaas${paymentId ? ` (payment_id=${paymentId})` : ' (sem payment_id no registro)'}.`;
      const restorePlanLine = row.plan_key_current
        ? hasCreditCarryover
          ? ` [Plano restaurado: ${row.plan_key_current} devido a aproveitamento de crédito.]`
          : ` [Plano restaurado para ${row.plan_key_current} após expiração de checkout.]`
        : '';
      const mergedNotes = appendBillingNotesBlock(
        row.notes,
        `${noteLine}${restorePlanLine}`,
      );
      const { error: updateOneError } = await supabase
        .from('tb_upgrade_requests')
        .update({
          status: 'cancelled',
          notes: mergedNotes,
          updated_at: utcIsoFrom(now),
          processed_at: utcIsoFrom(now),
        })
        .eq('id', requestId);

      if (updateOneError) {
        errors.push(
          `[${requestId}] Falha ao atualizar status local: ${updateOneError.message}`,
        );
        continue;
      }

      cancelledIds.push(requestId);
    }

    for (const row of criticalOverdueRows) {
      const requestId = String(row.id);
      const subscriptionId = String(row.asaas_subscription_id ?? '').trim();
      try {
        if (subscriptionId) {
          const cancelSubscription = await cancelAsaasSubscriptionById(
            subscriptionId,
            {
              deletePendingPayments: true,
            },
          );
          if (!cancelSubscription.success) {
            errors.push(
              `[critical_overdue ${requestId}] Falha ao encerrar assinatura no Asaas (${subscriptionId}): ${cancelSubscription.error ?? 'erro desconhecido'}`,
            );
            continue;
          }
        }

        if (row.profile_id) {
          const profilePatchBase = {
            plan_key: 'FREE',
            last_paid_plan: null,
            updated_at: utcIsoFrom(now),
          };
          const profileWithOverdue = await supabase
            .from('tb_profiles')
            .update({
              ...profilePatchBase,
              overdue_since: null,
            } as Record<string, unknown>)
            .eq('id', row.profile_id);

          // Compatibilidade: se tb_profiles não tiver overdue_since, aplica patch sem a coluna.
          if (profileWithOverdue.error) {
            const fallbackProfilePatch = await supabase
              .from('tb_profiles')
              .update(profilePatchBase)
              .eq('id', row.profile_id);
            if (fallbackProfilePatch.error) {
              errors.push(
                `[critical_overdue ${requestId}] Falha ao atualizar perfil para FREE: ${fallbackProfilePatch.error.message}`,
              );
              continue;
            }
          }
        }

        const overdueNote = appendBillingNotesBlock(
          row.notes,
          `[Cron cancel-expired-pending-upgrades] ${utcIsoFrom(now)} - Assinatura encerrada e removida por inadimplência superior a 30 dias.`,
        );
        const { error: expireErr } = await supabase
          .from('tb_upgrade_requests')
          .update({
            status: 'expired',
            notes: overdueNote,
            updated_at: utcIsoFrom(now),
            processed_at: utcIsoFrom(now),
            overdue_since: null,
          })
          .eq('id', requestId);
        if (expireErr) {
          errors.push(
            `[critical_overdue ${requestId}] Falha ao expirar request: ${expireErr.message}`,
          );
          continue;
        }
        overdueExpiredIds.push(requestId);
      } catch (e) {
        errors.push(
          `[critical_overdue ${requestId}] ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (errors.length > 0) {
      console.error(
        '[cancel-expired-pending-upgrades] Partial errors:',
        errors,
      );
    }
    console.log(
      `[cancel-expired-pending-upgrades] Cancelled ${cancelledIds.length}/${rowsToCancel.length} expired pending request(s)`,
    );

    await logSystemEvent({
      serviceName: 'cron/cancel-expired-pending-upgrades',
      status: errors.length > 0 ? 'partial' : 'success',
      executionTimeMs: Date.now() - startTime,
      payload: {
        cancelledIds,
        overdueExpiredIds,
        skipped,
        scannedPending: rows.length,
        scannedCriticalOverdue: criticalOverdueRows.length,
        rowsToCancel: rowsToCancel.length,
        errorCount: errors.length,
        errors,
      },
      errorMessage: errors.length > 0 ? errors.join(' | ') : undefined,
    });

    return NextResponse.json({
      success: true,
      cancelled_pending: cancelledIds.length,
      cancelled_critical_overdue: overdueExpiredIds.length,
      scanned_pending: rows.length,
      scanned_critical_overdue: criticalOverdueRows.length,
      skipped,
      errors,
      timestamp: utcIsoFrom(now),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[cancel-expired-pending-upgrades] Unexpected error:', error);
    await logSystemEvent({
      serviceName: 'cron/cancel-expired-pending-upgrades',
      status: 'error',
      executionTimeMs: Date.now() - startTime,
      payload: {
        stack: err.stack,
      },
      errorMessage: err.message,
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
