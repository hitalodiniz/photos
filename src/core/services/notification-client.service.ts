'use client';

import { supabase } from '@/lib/supabase.client';

/**
 * 📡 SERVICE (CLIENT-SIDE REALTIME)
 * WebSocket puro para o navegador.
 */
export const notificationClientService = {
  subscribeRealtime(userId: string, onEvent: (payload: any) => void) {
    return supabase
      .channel(`user_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Mantém o asterisco para pegar o UPDATE de leitura
          schema: 'public',
          table: 'tb_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onEvent(payload), // Passa o payload bruto para o componente tratar
      )
      .subscribe();
  },
};
