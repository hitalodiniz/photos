import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import {
  getPixQrCodeFromPayment,
  getAsaasPaymentCheckoutUrls,
} from '@/core/services/asaas';

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
    .select('asaas_payment_id, billing_type')
    .eq('id', requestId.trim())
    .eq('profile_id', userId)
    .maybeSingle();

  if (error || !row?.asaas_payment_id) {
    return NextResponse.json(
      { error: 'Solicitação não encontrada ou sem pagamento vinculado' },
      { status: 404 },
    );
  }

  if (String(row.billing_type ?? '').toUpperCase() !== 'PIX') {
    return NextResponse.json(
      { error: 'A cobrança desta solicitação não é PIX.' },
      { status: 400 },
    );
  }

  const [pix, checkout] = await Promise.all([
    getPixQrCodeFromPayment(row.asaas_payment_id),
    getAsaasPaymentCheckoutUrls(row.asaas_payment_id),
  ]);

  if (!pix.success) {
    return NextResponse.json(
      { error: pix.error ?? 'PIX indisponível' },
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

