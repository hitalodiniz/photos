import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { getAsaasPaymentCheckoutUrls } from '@/core/services/asaas';

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
    return NextResponse.json(
      { error: 'Solicitação não encontrada ou sem pagamento vinculado' },
      { status: 404 },
    );
  }

  const result = await getAsaasPaymentCheckoutUrls(row.asaas_payment_id);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? 'URL do boleto indisponível' },
      { status: 502 },
    );
  }

  const target = result.bankSlipUrl ?? result.invoiceUrl;
  if (!target) {
    return NextResponse.json(
      { error: 'Boleto indisponível para esta cobrança' },
      { status: 404 },
    );
  }

  return NextResponse.redirect(target, 302);
}

