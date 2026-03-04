// useGaleriaSyncObserver.ts — versão simplificada
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase.client';

interface Props {
  userId: string;
  onSynced?: (galeriaId: string, photoCount: number) => void;
}

export function GaleriaSyncObserver({ userId, onSynced }: Props) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`galeria-sync-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tb_galerias',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          // Atualiza o card quando photo_count mudar
          if (updated.photo_count !== undefined) {
            onSynced?.(updated.id, updated.photo_count);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onSynced]);

  return null;
}
