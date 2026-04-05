import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { getAsaasPaymentStatus } from '@/core/services/asaas';
import { revalidateProfileCachesForBilling } from '@/actions/revalidate.actions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('requestId');
  if (!requestId?.trim()) {
    return NextResponse.json({ error: 'requestId obrigatório' }, { status: 400 });
  }

  const { success, userId } = await getAuthenticatedUser();
  if (!success || !userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from('tb_upgrade_requests')
    .select('asaas_payment_id')
    .eq('id', requestId.trim())
    .eq('profile_id', userId)
    .maybeSingle();
  if (error || !row?.asaas_payment_id) {
    return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 });
  }

  const st = await getAsaasPaymentStatus(row.asaas_payment_id);
  if (!st.success) {
    return NextResponse.json({ error: st.error ?? 'Falha ao verificar status' }, { status: 502 });
  }

  const paid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(
    String(st.status ?? '').toUpperCase(),
  );
  if (paid) {
    await revalidateProfileCachesForBilling(userId);
  }
  return NextResponse.json({ success: true, paid, status: st.status ?? null });
}

