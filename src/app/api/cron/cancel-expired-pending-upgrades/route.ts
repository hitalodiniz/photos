// src/app/api/cron/cancel-expired-pending-upgrades/route.ts
import { createClient } from '@supabase/supabase-js';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { NextResponse } from 'next/server';
import { deleteAsaasPayment } from '@/core/services/asaas';
import { appendBillingNotesBlock } from '@/core/services/asaas/utils/billing-notes-doc';

// Prazos diferenciados (em milissegundos)
const AGE_LIMITS = {
  CREDIT_CARD: 2 * 60 * 60 * 1000, // 2 horas
  PIX: 48 * 60 * 60 * 1000, // 2 dias
  BOLETO: 5 * 24 * 60 * 60 * 1000, // 5 dias
};

export async function GET(request: Request) {
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
    // Buscamos apenas o que está pendente
    const { data: rows, error: selectError } = await supabase
      .from('tb_upgrade_requests')
      .select(
        'id, profile_id, created_at, asaas_payment_id, notes, billing_type, plan_key_current',
      ) // Importante trazer o billing_type
      .eq('status', 'pending');

    if (selectError) {
      console.error(
        '[cancel-expired-pending-upgrades] Select error:',
        selectError,
      );
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    // 🎯 Lógica de Filtragem Inteligente
    const rowsToCancel = (rows ?? []).filter((r) => {
      const createdAt = new Date(r.created_at).getTime();
      const type = (r.billing_type as keyof typeof AGE_LIMITS) || 'PIX'; // Default para PIX se nulo
      const limit = AGE_LIMITS[type] || AGE_LIMITS.PIX;

      return now.getTime() - createdAt > limit;
    });

    const cancelledIds: string[] = [];
    const errors: string[] = [];
    let skipped = 0;

    for (const row of rowsToCancel) {
      const requestId = String(row.id);
      const paymentId = String(row.asaas_payment_id ?? '').trim();
      const billingType =
        (row.billing_type as keyof typeof AGE_LIMITS) || 'PIX';
      const limitMs = AGE_LIMITS[billingType] || AGE_LIMITS.PIX;
      const limitHours = Math.round(limitMs / (60 * 60 * 1000));
      const hasCreditCarryover =
        /aproveitamento de crédito|aproveitamento de credito/i.test(
          row.notes ?? '',
        );

      if (paymentId) {
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

      // Se o pending expirado foi gerado por aproveitamento de crédito, restaura
      // o plano anterior (já pago) para não penalizar o usuário.
      if (hasCreditCarryover && row.profile_id && row.plan_key_current) {
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

      const noteLine = `[Cron cancel-expired-pending-upgrades] ${utcIsoFrom(now)} - Cancelamento automático por falta de pagamento no prazo (${limitHours}h, billing_type=${billingType}). Solicitação pendente expirada e cobrança cancelada no Asaas${paymentId ? ` (payment_id=${paymentId})` : ' (sem payment_id no registro)'}.`;
      const restorePlanLine =
        hasCreditCarryover && row.plan_key_current
          ? ` [Plano restaurado: ${row.plan_key_current} devido a aproveitamento de crédito.]`
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

    if (rowsToCancel.length === 0) {
      return NextResponse.json({
        success: true,
        cancelled: 0,
        skipped,
        errors,
        timestamp: utcIsoFrom(now),
      });
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
    return NextResponse.json({
      success: true,
      cancelled: cancelledIds.length,
      skipped,
      errors,
      timestamp: utcIsoFrom(now),
    });
  } catch (error) {
    console.error('[cancel-expired-pending-upgrades] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
