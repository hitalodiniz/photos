import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { revalidatePath } from 'next/cache';
import { revalidateUserCache } from '@/actions/revalidate.actions';
import type {
  AsaasWebhookPayload,
  AsaasWebhookEvent,
} from '@/core/types/billing';
import { performDowngradeToFree } from '@/core/services/asaas.service';
import { reactivateAutoArchivedGalleries } from '@/core/services/asaas';
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
    const requestId = paymentId ?? subscriptionId;

    let logId: number | null = null;
    try {
      const { data: log, error: logError } = await supabase
        .from('tb_webhook_logs')
        .insert({
          provider: 'asaas',
          event_type: body.event,
          payload: body,
          request_id: requestId,
        })
        .select('id')
        .single();

      if (logError) {
        console.error(
          '[Webhook Asaas] Falha ao inserir log inicial:',
          logError,
        );
      } else {
        logId = log.id;
      }
    } catch (e) {
      console.error('[Webhook Asaas] Exceção ao inserir log inicial:', e);
    }

    /**
     * Processamento sempre por identificadores externos (asaas_payment_id / asaas_subscription_id).
     * Não depende de sessão do usuário: compensação bancária e webhooks são tratados mesmo com
     * sessão expirada, usando apenas os IDs fixos do Asaas.
     */

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
        console.info(
          '[Webhook Asaas] validatePaymentAmount — divergência de valor:',
          {
            request_id: req.id,
            amount_final_registrado: req.amount_final,
            valor_pago: paidValue,
            diff,
            tolerance,
          },
        );
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

    try {
      switch (event as AsaasWebhookEvent) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED': {
          if (paymentId) {
            const subscriptionIdFromPayment =
              typeof payment?.subscription === 'string'
                ? payment.subscription
                : ((payment as { subscription?: string })?.subscription ??
                  null);

            // Vínculo de assinatura: se o pagamento traz subscription e o request ainda tem asaas_subscription_id nulo, atualizar.
            if (subscriptionIdFromPayment) {
              const { data: byPayment } = await supabase
                .from('tb_upgrade_requests')
                .select('id, asaas_subscription_id')
                .eq('asaas_payment_id', paymentId)
                .maybeSingle();
              if (
                byPayment?.id &&
                (byPayment.asaas_subscription_id == null ||
                  byPayment.asaas_subscription_id === '')
              ) {
                await supabase
                  .from('tb_upgrade_requests')
                  .update({
                    asaas_subscription_id: subscriptionIdFromPayment,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', byPayment.id);
              }
            }

            // Vínculo dinâmico: se não existe request com este paymentId mas existe com este subscriptionId, criar registro herdando dados da assinatura (renovações automáticas).
            const { data: existingByPayment } = await supabase
              .from('tb_upgrade_requests')
              .select('id')
              .eq('asaas_payment_id', paymentId)
              .maybeSingle();

            if (!existingByPayment?.id && subscriptionIdFromPayment) {
              const { data: subRow } = await supabase
                .from('tb_upgrade_requests')
                .select(
                  'profile_id, plan_key_current, plan_key_requested, billing_type, billing_period, snapshot_name, snapshot_cpf_cnpj, snapshot_email, snapshot_whatsapp, snapshot_address, asaas_customer_id',
                )
                .eq('asaas_subscription_id', subscriptionIdFromPayment)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (subRow?.profile_id) {
                const paidValue = payment?.value ?? 0;
                const now = new Date().toISOString();
                const { error: insertErr } = await supabase
                  .from('tb_upgrade_requests')
                  .insert({
                    profile_id: subRow.profile_id,
                    plan_key_current: subRow.plan_key_current,
                    plan_key_requested: subRow.plan_key_requested,
                    billing_type: subRow.billing_type,
                    billing_period: subRow.billing_period,
                    snapshot_name: subRow.snapshot_name,
                    snapshot_cpf_cnpj: subRow.snapshot_cpf_cnpj,
                    snapshot_email: subRow.snapshot_email,
                    snapshot_whatsapp: subRow.snapshot_whatsapp,
                    snapshot_address: subRow.snapshot_address,
                    asaas_customer_id: subRow.asaas_customer_id ?? undefined,
                    asaas_subscription_id: subscriptionIdFromPayment,
                    asaas_payment_id: paymentId,
                    amount_original: paidValue,
                    amount_discount: 0,
                    amount_final: paidValue,
                    installments: 1,
                    status: 'pending',
                    notes: `Cobrança de renovação vinculada ao webhook (paymentId: ${paymentId})`,
                    updated_at: now,
                  });
              }
            }

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
                  notes:
                    amountValidation.reason ??
                    'Valor pago diverge do registrado',
                  updated_at: new Date().toISOString(),
                })
                .eq('asaas_payment_id', paymentId);
              // Return 200 so Asaas doesn't retry; fraud/error logged above
              return NextResponse.json({ received: true }, { status: 200 });
            }

            // 1. Atualiza o status do pagamento via RPC (apenas uma vez)
            await handlePaymentRpc('CONFIRMED');

            // 2. Busca os dados da requisição de upgrade vinculada a este pagamento
            // Buscamos sem o filtro de 'approved' para garantir que pegamos a req.
            // Se o RPC funcionou, ela já deve estar aprovada ou em processamento.
            const { data: upgradeReq } = await supabase
              .from('tb_upgrade_requests')
              .select('profile_id, plan_key_requested, status')
              .eq('asaas_payment_id', paymentId)
              .maybeSingle();

            // 3. Se temos os dados necessários, executamos as ações pós-pagamento
            if (upgradeReq?.profile_id && upgradeReq?.plan_key_requested) {
              console.log(
                `[Webhook Asaas] Ativando plano ${upgradeReq.plan_key_requested} para userId ${upgradeReq.profile_id}`,
              );

              // Reativa galerias que foram arquivadas no downgrade (downgrade -> upgrade)
              await reactivateAutoArchivedGalleries(
                upgradeReq.profile_id,
                upgradeReq.plan_key_requested as PlanKey,
                supabase,
              );

              // Limpa o cache para o usuário ver o novo plano e as galerias voltarem ao ar
              // Usamos o catch para o webhook não travar se a revalidação falhar
              await revalidateUserCache(upgradeReq.profile_id).catch((err) =>
                console.warn(
                  '[Webhook Asaas] Falha na revalidação de cache:',
                  err,
                ),
              );
            } else {
              console.warn(
                `[Webhook Asaas] Nenhuma requisição de upgrade encontrada para o pagamento ${paymentId}`,
              );
            }

            // ── NOVO: pagamento regularizado, limpa carência de atraso ────────────
            if (subscriptionId) {
              await supabase
                .from('tb_upgrade_requests')
                .update({
                  overdue_since: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('asaas_subscription_id', subscriptionId)
                .eq('status', 'approved');
            }

            revalidatePath('/dashboard');
            revalidatePath('/dashboard/planos');
          }
          break;
        }

        case 'PAYMENT_OVERDUE': {
          if (paymentId) {
            await handlePaymentRpc('OVERDUE');

            const subscriptionIdOverdue = payment?.subscription ?? null;
            // ── NOVO: marca início da carência de 5 dias ──────────────────────────
            if (subscriptionIdOverdue) {
              await supabase
                .from('tb_upgrade_requests')
                .update({
                  overdue_since: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('asaas_subscription_id', subscriptionIdOverdue)
                .eq('status', 'approved')
                .is('overdue_since', null); // não sobrescreve se já foi marcado
            }

            // Quando há um cancelamento agendado (pending_downgrade),
            // o Asaas pode marcar a cobrança de renovação como OVERDUE.
            // Só aplicar downgrade se o perfil ainda não estiver em FREE (sanitização).

            if (subscriptionIdOverdue) {
              const { data: subReq } = await supabase
                .from('tb_upgrade_requests')
                .select('id, profile_id, status')
                .eq('asaas_subscription_id', subscriptionIdOverdue)
                .maybeSingle();

              if (subReq?.profile_id && subReq.status === 'pending_downgrade') {
                const { data: profileRow } = await supabase
                  .from('tb_profiles')
                  .select('plan_key')
                  .eq('id', subReq.profile_id)
                  .single();
                const currentPlan = (profileRow?.plan_key ?? 'FREE') as string;
                if (currentPlan !== 'FREE') {
                  await performDowngradeToFree(
                    subReq.profile_id,
                    subReq.id,
                    `Downgrade via PAYMENT_OVERDUE (webhook Asaas, subscriptionId: ${subscriptionIdOverdue})`,
                    supabase,
                  );
                  await revalidateUserCache(subReq.profile_id).catch((err) =>
                    console.warn('[Webhook Asaas] revalidateUserCache:', err),
                  );
                  revalidatePath('/dashboard');
                }
              }
            }
          }
          break;
        }

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
              await revalidateUserCache(refundedReq.profile_id).catch((err) =>
                console.warn('[Webhook Asaas] revalidateUserCache:', err),
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
                await revalidateUserCache(subReq.profile_id).catch((err) =>
                  console.warn('[Webhook Asaas] revalidateUserCache:', err),
                );
                revalidatePath('/dashboard');
              } else {
                // Cancelamento imediato já processado — apenas garantir status 'cancelled'
                await supabase
                  .from('tb_upgrade_requests')
                  .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', subReq.id)
                  .neq('status', 'cancelled');
              }
            }
          }
          break;
        }

        case 'SUBSCRIPTION_DELETED': {
          // Assinatura removida no Asaas → downgrade imediato para FREE
          const subId =
            subscriptionId ??
            (body as { subscription?: { id?: string } }).subscription?.id;
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
              await revalidateUserCache(subReq.profile_id).catch((err) =>
                console.warn('[Webhook Asaas] revalidateUserCache:', err),
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

      if (logId) {
        await supabase
          .from('tb_webhook_logs')
          .update({ status_code: 200, updated_at: new Date().toISOString() })
          .eq('id', logId);
      }
    } catch (err) {
      console.error(`[Webhook Asaas] Erro no evento ${event}:`, err);
      if (logId) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido';
        await supabase
          .from('tb_webhook_logs')
          .update({
            status_code: 500,
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', logId);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Webhook Asaas] Erro:', error);
    // Sempre 200 para o Asaas não reenviar indefinidamente
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
