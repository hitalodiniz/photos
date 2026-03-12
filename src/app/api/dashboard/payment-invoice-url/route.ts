// src/app/api/dashboard/payment-invoice-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import { getAsaasPaymentInvoiceUrl } from '@/core/services/asaas.service';

export const dynamic = 'force-dynamic';

/**
 * GET ?requestId=xxx
 * Redireciona para a URL do comprovante/fatura do pagamento no Asaas.
 * Usado quando o pagamento já foi confirmado ou cancelado, para abrir o comprovante em vez do boleto/PIX.
 */
export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('requestId');
  if (!requestId?.trim()) {
    return NextResponse.json(
      { error: 'requestId obrigatório' },
      { status: 400 },
    );
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

  const result = await getAsaasPaymentInvoiceUrl(row.asaas_payment_id);
  if (!result.success || !result.invoiceUrl) {
    return NextResponse.json(
      { error: result.error ?? 'URL do comprovante indisponível' },
      { status: 502 },
    );
  }

  return NextResponse.redirect(result.invoiceUrl, 302);
}
