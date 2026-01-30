import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/web-push-admin';

export async function createInternalNotification({
  userId,
  title,
  message,
  type = 'info',
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}) {
  const supabase = await createSupabaseServerClient();

  // 1. Salva no banco para o Dashboard
  await supabase.from('tb_notifications').insert([
    {
      user_id: userId,
      title,
      message,
      type,
      link,
    },
  ]);

  // 2. Busca a assinatura de Push do perfil
  const { data: profile } = await supabase
    .from('tb_profiles')
    .select('push_subscription')
    .eq('id', userId)
    .single();

  // 3. Se tiver assinatura, dispara o Push para o celular
  if (profile?.push_subscription) {
    const result = await sendPushNotification(profile.push_subscription, {
      title,
      message,
      link,
    });

    // Opcional: Se a assinatura expirou (GONE), limpa o banco
    if (result.error === 'GONE') {
      await supabase
        .from('tb_profiles')
        .update({ push_subscription: null, notifications_enabled: false })
        .eq('id', userId);
    }
  }
}
