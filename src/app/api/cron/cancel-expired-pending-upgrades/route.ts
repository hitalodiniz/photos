// src/app/api/cron/cancel-expired-pending-upgrades/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/** Solicitações pendentes mais antigas que este valor são canceladas (24h). */
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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
    const since = new Date(Date.now() - PENDING_MAX_AGE_MS).toISOString();

    const { data: rows, error: selectError } = await supabase
      .from('tb_upgrade_requests')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', since);

    if (selectError) {
      console.error('[cancel-expired-pending-upgrades] Select error:', selectError);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const ids = (rows ?? []).map((r) => r.id);
    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        cancelled: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const { error: updateError } = await supabase
      .from('tb_upgrade_requests')
      .update({
        status: 'cancelled',
        notes: `Cancelamento automático: solicitação pendente expirada (criada antes de ${since})`,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (updateError) {
      console.error('[cancel-expired-pending-upgrades] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[cancel-expired-pending-upgrades] Cancelled ${ids.length} pending request(s)`);
    return NextResponse.json({
      success: true,
      cancelled: ids.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cancel-expired-pending-upgrades] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
