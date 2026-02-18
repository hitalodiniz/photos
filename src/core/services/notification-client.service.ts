'use client';

import { supabase } from '@/lib/supabase.client';

/**
 * 📡 SERVICE (CLIENT-SIDE REALTIME)
 * WebSocket puro para o navegador.
 */
export const notificationClientService = {
  subscribeRealtime(userId: string, onNewNotification: (payload: any) => void) {
    return supabase
      .channel(`user_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tb_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onNewNotification(payload.new),
      )
      .subscribe();
  },
};
