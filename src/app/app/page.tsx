'use client';

import LoadingScreen from '@/components/ui/LoadingScreen';
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

  // 1. Trava de controle com useRef para evitar loops de sincronização
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const hasTokenInStorage = !!localStorage.getItem(
      'sb-bdgqiyvasucvhihaueuk-auth-token',
    );

    if (session && hasTokenInStorage && !isSyncingRef.current) {
      isSyncingRef.current = true;

      supabase.auth
        .refreshSession()
        .catch((e) => console.error('Falha ao sincronizar cookie:', e))
        .finally(() => {
          isSyncingRef.current = false;
        });
    }
  }, [session]);

  // 2. Busca o perfil e redireciona
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/');
      return;
    }

    const fetchProfile = async () => {
      if (!session) return; // Removido cookieSyncing daqui

      const user = session.user;

      const { data } = await supabase
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

    if (session) {
      fetchProfile();
    }
    // Removido cookieSyncing das dependências abaixo
  }, [session, authLoading, router]);

  // 3. Condição de carregamento elegante e minimalista
  if (authLoading || profileLoading) {
    return;
    <LoadingScreen message="Verificando seu acesso" />;
  }

  return null;
}
