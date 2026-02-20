// hooks/useSyncInternalTraffic.ts
'use client';
import { supabase } from '@/lib/supabase.client';
import { useEffect, useState } from 'react';
import { getCookie, setCookie } from 'cookies-next';

export function useSyncInternalTraffic(userId: string | undefined) {
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    // 1. Identifica este navegador (Cookie ou LocalStorage)
    let currentId =
      getCookie('visitor_id') || localStorage.getItem('visitor_id');

    // 2. Se for um navegador totalmente novo, gera um ID
    if (!currentId) {
      currentId = crypto.randomUUID();
      localStorage.setItem('visitor_id', currentId);
      setCookie('visitor_id', currentId, { maxAge: 60 * 60 * 24 * 365 });
    } else {
      // Garantia de sincronia local: se tem num, garante no outro
      if (!getCookie('visitor_id'))
        setCookie('visitor_id', currentId, { path: '/' });
      if (!localStorage.getItem('visitor_id'))
        localStorage.setItem('visitor_id', currentId as string);
    }

    // Se não estiver logado, não tenta sincronizar com o banco
    if (!userId) return;

    const sync = async () => {
      // 3. Sincroniza com o BD (Apenas uma vez por sessão de browser)
      const storageKey = `synced_${userId}_${currentId}`;
      if (sessionStorage.getItem(storageKey)) {
        setIsSynced(true);
        return;
      }
      console.log('append_ignored_visitor', userId, currentId);
      const { error, data } = await supabase.rpc('append_ignored_visitor', {
        p_user_id: userId,
        visitor_id_to_add: currentId,
      });

      //console.log('📡 RPC Payload:', { userId, currentId });

      if (!error) {
        //console.log('✅ RPC executada com sucesso. Verifique o banco.');
        sessionStorage.setItem(storageKey, 'true');
        setIsSynced(true);
      }
    };

    sync();
  }, [userId]);

  return isSynced;
}

export function InternalTrafficSync({
  userId,
}: {
  userId: string | undefined;
}) {
  // O Hook roda apenas no navegador do fotógrafo
  useSyncInternalTraffic(userId);

  return null; // Não renderiza nada visualmente
}
