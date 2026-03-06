// src/app/api/webhook/asaas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { revalidatePath } from 'next/cache';
import type { AsaasWebhookPayload, AsaasWebhookEvent } from '@/core/types/billing';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar token de segurança do webhook
    const token = request.headers.get('asaas-access-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as AsaasWebhookPayload & {
      subscription?: { id?: string };
    };
    const { event, payment } = body;

    if (!event) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabase = await createSupabaseServerClient();

    const paymentId = payment?.id;
    const subscriptionId =
      payment?.subscription ?? body.subscription?.id ?? null;

    const handlePaymentRpc = async (p_asaas_status: string) => {
      if (!paymentId) return;
      await supabase.rpc('activate_plan_from_payment', {
        p_asaas_payment_id: paymentId,
        p_asaas_status,
      });
    };

    switch (event as AsaasWebhookEvent) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        if (paymentId) {
          await handlePaymentRpc('CONFIRMED');
          revalidatePath('/dashboard');
          revalidatePath('/dashboard/planos');
        }
        break;

      case 'PAYMENT_OVERDUE':
        if (paymentId) await handlePaymentRpc('OVERDUE');
        break;

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE':
        if (paymentId) {
          await handlePaymentRpc(payment.status);
          revalidatePath('/dashboard');
        }
        break;

      case 'SUBSCRIPTION_CANCELED':
        if (subscriptionId) {
          await supabase
            .from('tb_upgrade_requests')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('asaas_subscription_id', subscriptionId);
        }
        break;

      case 'PAYMENT_CREATED':
      case 'PAYMENT_AWAITING_RISK_ANALYSIS':
      case 'SUBSCRIPTION_CREATED':
      case 'PAYMENT_DELETED':
      case 'PAYMENT_RESTORED':
        // Ignorados — retornar 200 sem ação
        break;

      default:
        // Qualquer outro evento: 200 para o Asaas não reenviar
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Webhook Asaas] Erro:', error);
    // Sempre 200 para o Asaas não reenviar indefinidamente
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
