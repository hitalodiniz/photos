'use server';

import { revalidatePath } from 'next/cache';
import { sendPushNotification } from '@/lib/web-push-admin';
import {
  createSupabaseAdmin,
  createSupabaseServerClient,
  createSupabaseServerClientReadOnly,
} from '@/lib/supabase.server';

/**
 * 🛠️ SERVICE (SERVER-SIDE SQL)
 */

export async function getLatestNotifications(userId: string, limit = 15) {
  // ✅ Admin para garantir que o fotógrafo veja as notificações criadas pelo sistema
  const supabase = await createSupabaseServerClientReadOnly();

  const { data, error } = await supabase
    .from('tb_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Erro ao buscar notificações:', error.message);
    return [];
  }
  return data || [];
}

export async function getPushStatus(userId: string) {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data } = await supabase
    .from('tb_profiles')
    .select('notifications_enabled')
    .eq('id', userId)
    .single();
  return !!data?.notifications_enabled;
}

export async function markNotificationsAsRead(userId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('tb_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  revalidatePath('/dashboard');
}

export async function disablePush(userId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('tb_profiles')
    .update({ push_subscription: null, notifications_enabled: false })
    .eq('id', userId);

  revalidatePath('/dashboard');
}

/**
 * 🔔 CRIAÇÃO DE NOTIFICAÇÃO INTERNA
 * Adicionado suporte a 'event_data' no metadata para o Ver Mais do BI.
 */
export async function createInternalNotification({
  userId,
  title,
  message,
  type = 'info',
  link,
  eventData = null,
}: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  eventData?: any;
}) {
  try {
    // 🎯 Usamos o ADMIN para ter bypass total de RLS
    const supabase = await createSupabaseAdmin();

    // 1. Inserção na tb_notifications (Sempre ocorre para alimentar o sino cinza)
    const { data: insertedData, error: insertError } = await supabase
      .from('tb_notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
          link,
          metadata: eventData ? { event_data: eventData } : {},
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir notificação:', insertError.message);
      return { success: false, error: insertError };
    }

    // 2. Busca o Perfil para disparar o Push Notification do Navegador
    // IMPORTANTE: Buscamos tanto a subscrição quanto o booleano de controle
    const { data: profile, error: profileError } = await supabase
      .from('tb_profiles')
      .select('push_subscription, notifications_enabled')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error(
        '⚠️ Perfil não encontrado para envio de Push:',
        profileError.message,
      );
    }

    // ✅ VALIDAÇÃO TRIPLA PARA O PUSH:
    // 1. Tem que ter o token (push_subscription)
    // 2. O usuário tem que ter permitido no switch (notifications_enabled)
    // 3. O navegador não pode estar bloqueando (isso o servidor não vê, mas ele envia)
    if (
      profile?.push_subscription &&
      profile?.notifications_enabled !== false
    ) {
      // console.log('📡 Disparando Web Push para o servidor do navegador...');

      await sendPushNotification(profile.push_subscription, {
        title,
        message,
        link: link || '/dashboard', // Fallback de link para o clique no banner
      });
    }

    revalidatePath('/dashboard');
    return { success: true, data: insertedData };
  } catch (err) {
    console.error('💥 Erro crítico no service de notificação:', err);
    return { success: false, error: err };
  }
}
