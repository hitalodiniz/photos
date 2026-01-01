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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFD] animate-in fade-in duration-700">
        <div className="relative w-16 h-16">
          {/* Círculo de fundo estático */}
          <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/10" />

          {/* Spinner animado em tom Champanhe/Dourado */}
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#D4AF37] animate-spin shadow-[0_0_15px_rgba(212,175,55,0.2)]" />

          {/* Ponto central pulsante */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_8px_#D4AF37]" />
          </div>
        </div>

        {/* Texto com tracking (espaçamento) editorial */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-[10px] md:text-[14px] uppercase tracking-[0.4em] text-[#D4AF37] font-bold animate-pulse">
            Verificando seu acesso
          </p>
          <div className="h-px w-8 bg-[#D4AF37]/30" />
        </div>
      </div>
    );
  }

  return null;
}
