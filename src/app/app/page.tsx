'use client';

import useAuthStatus from '@/hooks/useAuthStatus';
import { supabase } from '@/lib/supabase.client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Profile {
  full_name: string | null;
  mini_bio: string | null;
  username: string | null;
  use_subdomain: boolean; // Adicionado para controle
}

export default function AppClientGuard() {
  const { session, loading: authLoading } = useAuthStatus();
  const [profileLoading, setProfileLoading] = useState(true);
  const router = useRouter();
  const isSyncingRef = useRef(false);

  // 1. Sincronização de Sessão (Mantido)
  // No arquivo da imagem 3d2479
  useEffect(() => {
    // 🎯 Ajuste: Busca a chave dinâmica em vez da fixa 'bdgqiy...'
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
      : '';
    const storageKey = `sb-${projectId}-auth-token`;

    const hasTokenInStorage = !!localStorage.getItem(storageKey);

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

  // 2. Busca o perfil e gerencia subdomínios
  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      router.replace('/');
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('tb_profiles')
        .select('full_name, username, mini_bio, use_subdomain')
        .eq('id', session.user.id)
        .single();

      const profile = data as Profile;

      // Validação de Onboarding
      const isComplete =
        profile?.full_name && profile?.username && profile?.mini_bio;

      if (!isComplete) {
        router.replace('/onboarding');
        setProfileLoading(false);
        return;
      }

      // --- LÓGICA DE SINCRONIZAÇÃO DE SUBDOMÍNIO ---
      const host = window.location.hostname;
      const isLocal = host.includes('localhost');
      const chunks = host.split('.');

      // Identifica o subdomínio atual na URL
      const currentSubdomain = isLocal
        ? chunks.length > 1 && chunks[chunks.length - 1] === 'localhost'
          ? chunks[0]
          : ''
        : chunks.length > 2
          ? chunks[0]
          : '';

      // Se o fotógrafo deve usar subdomínio e está no domínio principal (ou subdomínio errado)
      if (
        profile.use_subdomain &&
        profile.username !== currentSubdomain &&
        currentSubdomain !== 'www'
      ) {
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        const domainBase = isLocal ? 'localhost' : 'suagaleria.com.br';

        // Redirecionamento forçado (Cross-domain exige window.location.href)
        window.location.href = `${protocol}//${profile.username}.${domainBase}${port}/dashboard`;
        return;
      }

      // Se já estiver no domínio/subdomínio correto
      router.replace('/dashboard');
      setProfileLoading(false);
    };

    fetchProfile();
  }, [session, authLoading, router]);

  return null;
}
