import { BillingAsaas } from '@photos/billing-asaas';
import { createClient } from '@/lib/supabase/server';

export async function handleSubscribe(formData: any) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autorizado');

  const billing = new BillingAsaas({
    apiKey: process.env.ASAAS_API_KEY!,
    domain: 'sua-galeria',
    isSandbox: process.env.NODE_ENV !== 'production',
  });

  const subscription = await billing.createSubscription({
    customer: {
      name: user.user_metadata.full_name,
      email: user.email!,
      cpfCnpj: formData.cpfCnpj,
    },
    value: 60.0,
    nextDueDate: new Date().toISOString().split('T')[0],
    remoteUserId: user.id,
  });

  // Salvar na tabela tb_subscricao que criamos
  await supabase.from('tb_subscricao').insert({
    user_id: user.id,
    gateway_customer_id: subscription.customer,
    gateway_subscription_id: subscription.id,
    status: 'PENDING',
    plano_identifier: 'pro',
    origin_app: 'sua-galeria',
  });

  return { checkoutUrl: subscription.invoiceUrl };
}
