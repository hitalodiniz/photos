import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import {
  getPixQrCodeFromPayment,
  getAsaasPaymentCheckoutUrls,
} from '@/core/services/asaas';

export const dynamic = 'force-dynamic';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    .select('id, asaas_payment_id, billing_type, status, asaas_subscription_id, created_at')
    .eq('id', requestId.trim())
    .eq('profile_id', userId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json(
      { error: 'Solicitação não encontrada ou sem pagamento vinculado' },
      { status: 404 },
    );
  }

  let resolvedRow: typeof row | null = row;
  const isRequestedRowPix = String(row.billing_type ?? '').toUpperCase() === 'PIX';
  const isRejectedLike =
    String(row.status ?? '').toLowerCase() === 'rejected' ||
    !row.asaas_payment_id;

  // Fallback transparente:
  // se pediram um request rejeitado/antigo, tentamos o registro pendente mais recente
  // da mesma assinatura para não expor erro ao usuário.
  if ((isRejectedLike || !isRequestedRowPix) && row.asaas_subscription_id) {
    const { data: newestPendingPix } = await supabase
      .from('tb_upgrade_requests')
      .select('id, asaas_payment_id, billing_type, status, asaas_subscription_id, created_at')
      .eq('profile_id', userId)
      .eq('asaas_subscription_id', row.asaas_subscription_id)
      .eq('billing_type', 'PIX')
      .in('status', ['pending', 'processing'])
      .not('asaas_payment_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (newestPendingPix?.asaas_payment_id) {
      resolvedRow = newestPendingPix;
    }
  }

  if (!resolvedRow?.asaas_payment_id) {
    return NextResponse.json(
      { error: 'Solicitação não encontrada ou sem pagamento vinculado' },
      { status: 404 },
    );
  }

  if (String(resolvedRow.billing_type ?? '').toUpperCase() !== 'PIX') {
    return NextResponse.json(
      { error: 'A cobrança desta solicitação não é PIX.' },
      { status: 400 },
    );
  }

  const checkout = await getAsaasPaymentCheckoutUrls(resolvedRow.asaas_payment_id);
  let pix = await getPixQrCodeFromPayment(resolvedRow.asaas_payment_id);

  // Asaas pode levar alguns segundos para disponibilizar o QR logo após reciclagem.
  const RETRIES = 4;
  for (let i = 0; i < RETRIES && !pix.success; i += 1) {
    await sleep(900);
    pix = await getPixQrCodeFromPayment(resolvedRow.asaas_payment_id);
  }

  if (!pix.success || !pix.encodedImage || !pix.payload) {
    return NextResponse.json(
      {
        error:
          pix.error ??
          'PIX ainda está sendo preparado pelo gateway. Tente novamente em instantes.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    encodedImage: pix.encodedImage ?? null,
    payload: pix.payload ?? '',
    dueDate: checkout.success ? (checkout.dueDate ?? null) : null,
  });
}

