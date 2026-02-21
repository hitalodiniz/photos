// hooks/useSyncInternalTraffic.ts
'use client';
import { supabase } from '@/lib/supabase.client';
import { useEffect, useState } from 'react';
import { getCookie, setCookie } from 'cookies-next';

export function useSyncInternalTraffic(userId: string | undefined) {
  const [isSynced, setIsSynced] = useState(false);
  const isProd = process.env.NODE_ENV === 'production';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Definição do Domínio Raiz (Crucial para subdomínios)
    const hostname = window.location.hostname;
    // Se for localhost, usa '.localhost', se for prod, usa '.suagaleria.com.br'
    const rootDomain =
      hostname === 'localhost' || hostname.includes('127.0.0.1')
        ? '.localhost'
        : '.' + process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

    // 2. Identifica este navegador
    let currentId =
      getCookie('visitor_id') || localStorage.getItem('visitor_id');

    if (!currentId) {
      currentId = crypto.randomUUID();
      localStorage.setItem('visitor_id', currentId);
      // Salva com o domínio wildcard
      setCookie('visitor_id', currentId, {
        domain: rootDomain,
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        secure: isProd, // 🎯 Só envia o cookie via HTTPS
      });
    } else {
      // 3. Garantia de Redundância e Propagação de Domínio
      // Mesmo que o ID exista, forçamos o setCookie para garantir que ele tenha o 'domain' correto
      setCookie('visitor_id', currentId, {
        domain: rootDomain,
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });

      if (!localStorage.getItem('visitor_id')) {
        localStorage.setItem('visitor_id', currentId as string);
      }
    }

    if (!userId) return;

    const sync = async () => {
      const storageKey = `synced_${userId}_${currentId}`;
      if (sessionStorage.getItem(storageKey)) {
        setIsSynced(true);
        return;
      }

      // 4. Execução da RPC (Baixo custo computacional)
      const { error } = await supabase.rpc('append_ignored_visitor', {
        user_id_target: userId,
        visitor_id_to_add: currentId,
      });

      if (!error) {
        sessionStorage.setItem(storageKey, 'true');
        setIsSynced(true);
      } else {
        console.error('❌ Erro ao sincronizar tráfego interno:', error.message);
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
