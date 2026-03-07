'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.client';

/**
 * Página de callback do cliente quando o Supabase redireciona com tokens no hash
 * (ex.: para Site URL quando redirect_to não está na lista de Redirect URLs).
 * Define a sessão no cliente e redireciona para o API callback para persistir tokens no perfil.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash?.replace(/^#/, '').trim();
    if (!hash) {
      setError('Nenhum token na URL.');
      return;
    }
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) {
      setError('Tokens incompletos na URL.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (cancelled) return;
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        const base = window.location.origin;
        window.location.href = `${base}/api/auth/callback?from_client=1`;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao definir sessão.');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/auth/login" className="text-gold underline">Voltar ao login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="loading-luxury w-10 h-10" />
    </div>
  );
}
