import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { revalidatePath } from 'next/cache';
import type { AsaasWebhookPayload, AsaasWebhookEvent } from '@/core/types/billing';
import { performDowngradeToFree, reactivateAutoArchivedGalleries } from '@/core/services/asaas.service';
import type { PlanKey } from '@/core/config/plans';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar token de segurança do webhook
    const token = request.headers.get('asaas-access-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const text = await request.text();
    if (!text?.trim()) {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    let body: AsaasWebhookPayload & { subscription?: { id?: string } };
    try {
      body = JSON.parse(text) as AsaasWebhookPayload & {
        subscription?: { id?: string };
      };
    } catch {
      console.warn('[Webhook Asaas] Corpo inválido ou vazio, ignorando.');
      return NextResponse.json({ received: true }, { status: 200 });
    }
    const { event, payment } = body;

    if (!event) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabase = await createSupabaseServerClient();

    const paymentId = payment?.id;
    const subscriptionId =
      payment?.subscription ?? body.subscription?.id ?? null;

    /**
     * Validate that the payment value matches the registered amount_final.
     * Returns true if the amounts match (within R$ 0.01 tolerance) or if
     * no matching request is found (fallback: allow processing).
     */
    const validatePaymentAmount = async (
      p_payment_id: string,
      paidValue: number | undefined,
    ): Promise<{ valid: boolean; reason?: string }> => {
      if (paidValue === undefined || paidValue === null) {
        return { valid: true }; // no value to compare
      }
      const { data: req } = await supabase
        .from('tb_upgrade_requests')
        .select('amount_final, id')
        .eq('asaas_payment_id', p_payment_id)
        .maybeSingle();

      if (!req) {
        // No request linked to this payment — allow (may be renewal or direct payment)
        return { valid: true };
      }

      const tolerance = 0.01;
      const diff = Math.abs((req.amount_final ?? 0) - paidValue);
      if (diff > tolerance) {
        return {
          valid: false,
          reason: `Valor pago (R$ ${paidValue}) diverge do registrado (R$ ${req.amount_final}) para request ${req.id}`,
        };
      }
      return { valid: true };
    };

    const handlePaymentRpc = async (p_asaas_status: string) => {
      if (!paymentId) return;
      await supabase.rpc('activate_plan_from_payment', {
        p_asaas_payment_id: paymentId,
        p_asaas_status,
      });
    };

    switch (event as AsaasWebhookEvent) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        if (paymentId) {
          const amountValidation = await validatePaymentAmount(
            paymentId,
            payment?.value,
          );
          if (!amountValidation.valid) {
            console.error(
              '[Webhook Asaas] Valor divergente — pagamento NÃO ativado.',
              amountValidation.reason,
            );
            // Mark the request as rejected due to value mismatch
            await supabase
              .from('tb_upgrade_requests')
              .update({
                status: 'rejected',
                notes: amountValidation.reason ?? 'Valor pago diverge do registrado',
                updated_at: new Date().toISOString(),
              })
              .eq('asaas_payment_id', paymentId);
            // Return 200 so Asaas doesn't retry; fraud/error logged above
            return NextResponse.json({ received: true }, { status: 200 });
          }
          await handlePaymentRpc('CONFIRMED');
          // Reativar galerias auto-arquivadas por downgrade anterior (respeitando limite do novo plano)
          const { data: req } = await supabase
            .from('tb_upgrade_requests')
            .select('profile_id, plan_key_requested')
            .eq('asaas_payment_id', paymentId)
            .maybeSingle();
          if (req?.profile_id && req?.plan_key_requested) {
            await reactivateAutoArchivedGalleries(
              req.profile_id,
              req.plan_key_requested as PlanKey,
              supabase,
            );
          }
          revalidatePath('/dashboard');
          revalidatePath('/dashboard/planos');
        }
        break;
      }

      case 'PAYMENT_OVERDUE':
        if (paymentId) await handlePaymentRpc('OVERDUE');
        break;

      case 'PAYMENT_REFUNDED': {
        // Estorno confirmado pelo Asaas → downgrade imediato para FREE
        if (paymentId) {
          const { data: refundedReq } = await supabase
            .from('tb_upgrade_requests')
            .select('id, profile_id')
            .eq('asaas_payment_id', paymentId)
            .maybeSingle();

          if (refundedReq?.profile_id) {
            await performDowngradeToFree(
              refundedReq.profile_id,
              refundedReq.id,
              `Downgrade via PAYMENT_REFUNDED (webhook Asaas, paymentId: ${paymentId})`,
              supabase,
            );
            revalidatePath('/dashboard');
          } else {
            // Sem request vinculado — apenas registrar via RPC
            await handlePaymentRpc(payment.status);
          }
        }
        break;
      }

      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE':
        if (paymentId) {
          await handlePaymentRpc(payment.status);
          revalidatePath('/dashboard');
        }
        break;

      case 'SUBSCRIPTION_CANCELED': {
        /**
         * Dois cenários:
         * 1. Cancelamento imediato (arrependimento): request já está 'cancelled'
         *    → apenas confirmar, sem novo downgrade.
         * 2. Cancelamento agendado (fim do período): request está 'pending_cancellation'
         *    → aplicar downgrade agora.
         */
        if (subscriptionId) {
          const { data: subReq } = await supabase
            .from('tb_upgrade_requests')
            .select('id, profile_id, status')
            .eq('asaas_subscription_id', subscriptionId)
            .maybeSingle();

          if (subReq) {
            if (subReq.status === 'pending_cancellation') {
              // Período pago expirou — downgrade para FREE
              await performDowngradeToFree(
                subReq.profile_id,
                subReq.id,
                `Downgrade via SUBSCRIPTION_CANCELED (webhook Asaas, subscriptionId: ${subscriptionId})`,
                supabase,
              );
              revalidatePath('/dashboard');
            } else {
              // Cancelamento imediato já processado — apenas garantir status 'cancelled'
              await supabase
                .from('tb_upgrade_requests')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', subReq.id)
                .neq('status', 'cancelled');
            }
          }
        }
        break;
      }

      case 'SUBSCRIPTION_DELETED': {
        // Assinatura removida no Asaas → downgrade imediato para FREE
        const subId = subscriptionId ?? (body as { subscription?: { id?: string } }).subscription?.id;
        if (subId) {
          const { data: subReq } = await supabase
            .from('tb_upgrade_requests')
            .select('id, profile_id')
            .eq('asaas_subscription_id', subId)
            .maybeSingle();

          if (subReq?.profile_id) {
            await performDowngradeToFree(
              subReq.profile_id,
              subReq.id,
              `Downgrade via SUBSCRIPTION_DELETED (webhook Asaas, subscriptionId: ${subId})`,
              supabase,
            );
            revalidatePath('/dashboard');
          }
        }
        break;
      }

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
