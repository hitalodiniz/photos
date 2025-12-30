'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.client';
import { Session } from '@supabase/supabase-js';

interface AuthStatus {
  session: Session;
  loading: boolean;
  handleLogout: () => void;
}

const DESTINATION_PATH = '/dashboard';

export default function useAuthStatus(): AuthStatus {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  useEffect(() => {
    let initialLoad = true;

    // Listener de mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      const currentPath = window.location.pathname;

      if (
        event === 'SIGNED_OUT' &&
        (currentPath === DESTINATION_PATH || currentPath === '/onboarding')
      ) {
        router.replace('/');
      }

      if (!initialLoad) {
        setLoading(false);
      }
    });

    // Carrega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      initialLoad = false;
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return { session, loading, handleLogout };
}
