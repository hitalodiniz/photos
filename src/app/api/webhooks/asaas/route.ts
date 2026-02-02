// app/api/webhooks/asaas/route.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.json();
  const { event, subscription, payment } = body;

  // O metadata que injetamos no pacote identifica a aplicação
  const originApp =
    subscription?.metadata?.origin_app || payment?.metadata?.origin_app;
  const userId = subscription?.metadata?.user_id || payment?.metadata?.user_id;

  if (event === 'PAYMENT_CONFIRMED' || event === 'SUBSCRIPTION_CREATED') {
    // Usamos SERVICE_ROLE para ignorar o RLS no webhook
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    await supabase
      .from('tb_subscricao')
      .update({ status: 'ACTIVE' })
      .match({
        gateway_subscription_id: subscription?.id || payment?.subscription,
        user_id: userId,
      });
  }

  return new Response('OK', { status: 200 });
}
