// src/app/api/cron/cancel-expired-pending-upgrades/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/** Solicitações pendentes (não-BOLETO) mais antigas que este valor são canceladas (24h). */
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Mínimo de dias úteis para cobranças BOLETO antes de marcar como expirada (evita cancelar antes da compensação). */
const BOLETO_MIN_BUSINESS_DAYS = 3;

/**
 * Retorna uma data N dias úteis atrás a partir de hoje (exclui sábado e domingo).
 */
function subtractBusinessDays(fromDate: Date, days: number): Date {
  const d = new Date(fromDate);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return d;
}

/**
 * True se created_at é anterior a (agora - N dias úteis).
 */
function isOlderThanBusinessDays(createdAtIso: string, businessDays: number): boolean {
  const threshold = subtractBusinessDays(new Date(), businessDays);
  return new Date(createdAtIso) < threshold;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const since24h = new Date(Date.now() - PENDING_MAX_AGE_MS).toISOString();

    const { data: rows, error: selectError } = await supabase
      .from('tb_upgrade_requests')
      .select('id, billing_type, created_at')
      .eq('status', 'pending');

    if (selectError) {
      console.error('[cancel-expired-pending-upgrades] Select error:', selectError);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const now = new Date();
    const idsToCancel: string[] = [];
    for (const r of rows ?? []) {
      const createdAt = r.created_at as string;
      const billingType = (r.billing_type as string) || '';
      if (billingType === 'BOLETO') {
        if (isOlderThanBusinessDays(createdAt, BOLETO_MIN_BUSINESS_DAYS)) {
          idsToCancel.push(r.id);
        }
      } else {
        if (createdAt < since24h) {
          idsToCancel.push(r.id);
        }
      }
    }

    if (idsToCancel.length === 0) {
      return NextResponse.json({
        success: true,
        cancelled: 0,
        timestamp: now.toISOString(),
      });
    }

    const { error: updateError } = await supabase
      .from('tb_upgrade_requests')
      .update({
        status: 'cancelled',
        notes: `Cancelamento automático: solicitação pendente expirada (não paga dentro do prazo). Registros mantidos no banco; apenas status atualizado.`,
        updated_at: new Date().toISOString(),
      })
      .in('id', idsToCancel);

    if (updateError) {
      console.error('[cancel-expired-pending-upgrades] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[cancel-expired-pending-upgrades] Cancelled ${idsToCancel.length} pending request(s)`);
    return NextResponse.json({
      success: true,
      cancelled: idsToCancel.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cancel-expired-pending-upgrades] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
