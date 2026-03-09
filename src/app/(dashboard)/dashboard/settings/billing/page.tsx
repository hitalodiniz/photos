'use client';
import { CreditCard, History, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getUpgradeHistory } from '@/core/services/billing.service';
import type { UpgradeRequest } from '@/core/types/billing';

const ACTIVE_STATUSES = ['approved', 'pending_cancellation'] as const;

export default function BillingPage() {
  const [history, setHistory] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    success: boolean;
    type?: string;
    access_ends_at?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    getUpgradeHistory().then((data) => {
      setHistory(data ?? []);
      setLoading(false);
    });
  }, []);

  const hasActiveSubscription = history.some((r) =>
    ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number]),
  );

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return;
    setCancelLoading(true);
    setCancelResult(null);
    try {
      const res = await fetch('/api/dashboard/cancel-subscription', {
        method: 'POST',
      });
      const data = await res.json();
      setCancelResult({
        success: data.success,
        type: data.type,
        access_ends_at: data.access_ends_at,
        error: data.error,
      });
      if (data.success) {
        const next = await getUpgradeHistory();
        setHistory(next ?? []);
      }
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto">
      <h1 className="text-3xl italic text-white mb-8">
        Assinatura e Faturamento
      </h1>

      <div className="grid grid-cols-1 gap-8">
        {hasActiveSubscription && (
          <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
            <h4 className="text-white font-semibold text-sm mb-2">
              Cancelar assinatura
            </h4>
            <p className="text-white/90 text-xs mb-4">
              Cancele a qualquer momento. Se fizer em até 7 dias, o valor é
              estornado e o plano volta ao Free na hora.
            </p>
            <button
              type="button"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50 text-sm"
            >
              {cancelLoading ? (
                <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
              ) : null}
              Cancelar assinatura
            </button>
            {cancelResult && (
              <div className="mt-4 p-3 rounded-xl bg-white/5 text-sm">
                {cancelResult.success ? (
                  <>
                    {cancelResult.type === 'refund_immediate' && (
                      <p className="text-green-300">
                        Assinatura cancelada. O estorno foi solicitado e seu
                        plano foi rebaixado para Free.
                      </p>
                    )}
                    {cancelResult.type === 'scheduled_cancellation' &&
                      cancelResult.access_ends_at && (
                        <p className="text-white/90">
                          Cancelamento agendado. Você continua com acesso até{' '}
                          {new Date(
                            cancelResult.access_ends_at,
                          ).toLocaleDateString('pt-BR')}
                          .
                        </p>
                      )}
                  </>
                ) : (
                  <p className="text-red-300">{cancelResult.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all group">
            <CreditCard className="text-champagne mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-semibold text-sm">
              Método de Pagamento
            </h4>
            <p className="text-white/90 text-xs mt-1">Visa final 4242</p>
          </button>

          <button className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all group">
            <History className="text-champagne mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-semibold text-sm">
              Histórico de Faturas
            </h4>
            <p className="text-white/90 text-xs mt-1">
              {loading
                ? 'Carregando…'
                : `${history.length} solicitações no histórico`}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
