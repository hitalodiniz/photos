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
  eventData = null, // 🎯 Novo parâmetro opcional
}: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  eventData?: any;
}) {
  try {
    const supabase = await createSupabaseAdmin();

    // 1. Inserção com metadados do evento para o BI ler depois
    const { data, error } = await supabase
      .from('tb_notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
          link,
          // ✅ Salvamos o objeto do evento dentro da notificação
          // Isso permite que o "Ver Detalhes" abra o BI imediatamente
          metadata: eventData ? { event_data: eventData } : {},
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('❌ Erro Supabase Admin (Insert Notif):', error.message);
      return { success: false, error };
    }

    // 2. Push Notification
    const { data: profile } = await supabase
      .from('tb_profiles')
      .select('push_subscription')
      .eq('id', userId)
      .single();

    if (profile?.push_subscription) {
      await sendPushNotification(profile.push_subscription, {
        title,
        message,
        link,
      });
    }

    revalidatePath('/dashboard');
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('💥 Erro crítico no service de notificação:', err);
    return { success: false, error: err };
  }
}
