'use client';

import useAuthStatus from '@/hooks/useAuthStatus';
import { supabase } from '@/lib/supabase.client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Profile {
  full_name: string | null;
  mini_bio: string | null;
  username: string | null;
}

export default function AppClientGuard() {
  const { session, loading: authLoading } = useAuthStatus();
  const [profileLoading, setProfileLoading] = useState(true);
  const router = useRouter();
  /*const [cookieSyncing, setCookieSyncing] = useState(false);

  // 1. Força sincronização do cookie HTTP
  useEffect(() => {
    const hasTokenInStorage = !!localStorage.getItem(
      'sb-bdgqiyvasucvhihaueuk-auth-token'
    );

    if (session && hasTokenInStorage && !cookieSyncing) {
      setCookieSyncing(true);

      supabase.auth
        .refreshSession()
        .catch((e) => console.error('Falha ao sincronizar cookie:', e))
        .finally(() => setCookieSyncing(false));
    }
  }, [session, cookieSyncing]);*/

  // 1. Troque o useState por useRef para a trava de controle
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const hasTokenInStorage = !!localStorage.getItem(
      'sb-bdgqiyvasucvhihaueuk-auth-token',
    );

    // 2. Verificamos a Ref em vez do estado
    if (session && hasTokenInStorage && !isSyncingRef.current) {
      isSyncingRef.current = true;

      supabase.auth
        .refreshSession()
        .catch((e) => console.error('Falha ao sincronizar cookie:', e))
        .finally(() => {
          isSyncingRef.current = false;
        });
    }
  }, [session]); // 3. Removemos o cookieSyncing daqui. O efeito só roda se a sessão mudar.

  // 2. Busca o perfil e redireciona
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/');
      return;
    }

    const fetchProfile = async () => {
      if (!session || cookieSyncing) return;

      const user = session.user;

      const { data, error } = await supabase
        .from('tb_profiles')
        .select('full_name, username, mini_bio')
        .eq('id', user.id)
        .single();

      const profile: Profile = data || {
        full_name: null,
        username: null,
        mini_bio: null,
      };

      const isComplete =
        profile.full_name && profile.username && profile.mini_bio;

      if (!isComplete) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }

      setProfileLoading(false);
    };

    if (session && !cookieSyncing) {
      fetchProfile();
    }
  }, [session, authLoading, cookieSyncing, router]);

  if (authLoading || profileLoading || cookieSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#F8FAFD] text-gray-700">
        <p>Verificando seu acesso...</p>
      </div>
    );
  }

  return null;
}
