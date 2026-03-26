'use client';

import { useEffect, useState } from 'react';
import BaseModal from '@/components/ui/BaseModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDateOnlyPtBrBilling } from '@/core/utils/data-helpers';

type PaymentPixModalProps = {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  onCopySuccess?: () => void;
  onCopyError?: () => void;
  onPaidConfirmed?: () => void;
};

export function PaymentPixModal({
  isOpen,
  onClose,
  requestId,
  onCopySuccess,
  onCopyError,
  onPaidConfirmed,
}: PaymentPixModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [checkingPaid, setCheckingPaid] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const pixFallbackUrl = requestId
    ? `/api/dashboard/payment-invoice-url?requestId=${encodeURIComponent(requestId)}`
    : null;

  useEffect(() => {
    if (!isOpen || !requestId) return;
    let alive = true;
    const loadPix = async () => {
      setLoading(true);
      setError(null);
      setPayload('');
      setImageBase64(null);
      setDueDate(null);
      try {
        const res = await fetch(
          `/api/dashboard/payment-pix?requestId=${encodeURIComponent(requestId)}`,
        );
        const data = await res.json();
        if (!res.ok || !data?.success) {
          const raw = String(data?.error ?? '').trim();
          throw new Error(
            raw &&
              !/erro desconhecido/i.test(raw) &&
              !/unknown error/i.test(raw)
              ? raw
              : 'Ainda estamos preparando o PIX. Tente novamente em instantes.',
          );
        }
        if (!alive) return;
        setPayload(data.payload ?? '');
        setImageBase64(data.encodedImage ?? null);
        setDueDate(data.dueDate ?? null);
      } catch (e) {
        if (!alive) return;
        setError(
          e instanceof Error ? e.message : 'Erro ao carregar pagamento PIX.',
        );
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadPix();
    return () => {
      alive = false;
    };
  }, [isOpen, requestId, retryCount]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pagamento via PIX"
      subtitle={
        dueDate
          ? `Vencimento: ${formatDateOnlyPtBrBilling(dueDate) ?? dueDate}`
          : undefined
      }
      maxWidth="md"
    >
      <div className="space-y-3">
        {loading && <LoadingSpinner size="sm" message="Gerando PIX..." variant="light" />}
        {!loading && error && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 space-y-2">
            <p className="text-[12px] text-amber-900 font-medium">{error}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary-white"
                onClick={() => setRetryCount((n) => n + 1)}
              >
                Tentar novamente
              </button>
              {pixFallbackUrl && (
                <a
                  href={pixFallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-luxury-primary"
                >
                  Abrir cobrança no Asaas
                </a>
              )}
            </div>
          </div>
        )}
        {!loading && !error && (
          <>
            {imageBase64 && (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${imageBase64}`}
                  alt="QR Code PIX"
                  className="w-52 h-52 border border-slate-200 rounded-md"
                />
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Copia e cola PIX
              </p>
              <textarea
                readOnly
                value={payload}
                className="w-full h-28 text-[11px] font-mono p-2 border border-slate-200 rounded-md text-slate-700"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-secondary-white mr-2"
                disabled={checkingPaid}
                onClick={async () => {
                  if (!requestId) return;
                  setCheckingPaid(true);
                  try {
                    const res = await fetch(
                      `/api/dashboard/payment-pix-status?requestId=${encodeURIComponent(requestId)}`,
                    );
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error ?? 'Falha ao verificar pagamento.');
                    if (data?.paid) {
                      onPaidConfirmed?.();
                      onClose();
                    }
                  } catch {
                    // silent: modal keeps open; user can retry
                  } finally {
                    setCheckingPaid(false);
                  }
                }}
              >
                {checkingPaid ? 'Verificando...' : 'Já paguei, verificar'}
              </button>
              <button
                type="button"
                className="btn-luxury-primary"
                onClick={async () => {
                  if (!payload.trim()) return;
                  try {
                    await navigator.clipboard.writeText(payload);
                    onCopySuccess?.();
                  } catch {
                    onCopyError?.();
                  }
                }}
              >
                Copiar código PIX
              </button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
}

