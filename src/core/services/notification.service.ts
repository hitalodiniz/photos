'use server';

import { revalidatePath } from 'next/cache';
import { sendPushNotification } from '@/lib/web-push-admin';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
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

// @/core/services/notification.service
export async function markNotificationsAsRead(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('tb_notifications')
    .update({ read_at: utcIsoFrom(nowFn()) })
    .eq('user_id', userId)
    .is('read_at', null); // Importante: só atualiza o que for nulo

  if (error) throw error;
}

export async function markNotificationsAsReadUnique(notificationId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('tb_notifications')
    .update({ read_at: utcIsoFrom(nowFn()) })
    .eq('id', notificationId)
    .is('read_at', null); // Importante: só atualiza o que for nulo

  if (error) throw error;
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
  shouldRevalidateDashboard = true,
}: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  eventData?: any;
  shouldRevalidateDashboard?: boolean;
}) {
  // console.log('--- 🛡️ DEBUG NOTIFICATION START ---');
  // console.log('📍 Target UserId:', userId);
  // console.log('📍 Payload:', { title, type });

  try {
    // 1. Validar se o cliente Admin está sendo criado com as chaves certas
    const supabase = await createSupabaseAdmin();

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        '❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não detectada no ambiente!',
      );
    }

    // 2. Inserção na tb_notifications
    // console.log('DB: Tentando insert na tb_notifications...');

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
          // Removido created_at manual para deixar o DB usar o default now()
        },
      ])
      .select()
      .single();

    if (insertError) {
      // Log detalhado do objeto de erro do Supabase
      console.error('❌ Erro Supabase Insert:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });
      return { success: false, error: insertError };
    }

    // console.log('✅ Sucesso DB: Notificação gravada ID:', insertedData?.id);

    // 3. Busca o Perfil para Push
    console.log('DB: Buscando perfil para Push...');
    const { data: profile, error: profileError } = await supabase
      .from('tb_profiles')
      .select('push_subscription, notifications_enabled')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('⚠️ Erro ao buscar perfil:', profileError.message);
    }
    // else {
    //   console.log('📡 Status do Perfil:', {
    //     hasSubscription: !!profile?.push_subscription,
    //     enabled: profile?.notifications_enabled,
    //   });
    // }

    if (
      profile?.push_subscription &&
      profile?.notifications_enabled !== false
    ) {
      // console.log('📲 Enviando Web Push...');
      try {
        await sendPushNotification(profile.push_subscription, {
          title,
          message,
          link: link || '/dashboard',
        });
        console.log('🚀 Web Push enviado com sucesso');
      } catch (pushErr) {
        console.error('❌ Falha no envio do Web Push:', pushErr);
      }
    }

    // console.log('--- 🛡️ DEBUG NOTIFICATION END ---');

    if (shouldRevalidateDashboard) {
      revalidatePath('/dashboard');
    }
    return { success: true, data: insertedData };
  } catch (err: any) {
    console.error('💥 Erro Crítico (Catch):', {
      name: err.name,
      message: err.message,
      stack: err.stack?.split('\n')[0], // Apenas a primeira linha da stack para o log
    });
    return { success: false, error: err };
  }
}
