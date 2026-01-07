'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // 🎯 Captura o erro específico que lançamos no Service
    if (error.message === 'AUTH_RECONNECT_REQUIRED') {
      router.push('/auth/reconnect');
    }

    // Log para monitoramento (Vercel Logs)
    console.error('Erro capturado pelo Boundary:', error);
  }, [error, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F8F9FA]">
      <h2 className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-tight">
        Algo não saiu como esperado
      </h2>
      <p className="text-slate-500 mb-6 text-sm">
        Ocorreu um erro técnico ao processar sua solicitação.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
      >
        Tentar novamente
      </button>
    </div>
  );
}
