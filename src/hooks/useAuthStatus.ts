'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@photos/core-auth';
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
    await authService.signOut();
    router.replace('/');
  };

  useEffect(() => {
    let initialLoad = true;

    // Listener de mudanças de autenticação
    const subscription = authService.onAuthStateChange((event, newSession) => {
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
    authService.getSession().then((session) => {
      setSession(session);
      setLoading(false);
      initialLoad = false;
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return { session, loading, handleLogout };
}
