'use client';

import { AlertTriangle } from 'lucide-react';

interface OverdueBadgeProps {
  overdueSince: string | null;
  /** URL do Asaas (PIX/boleto) ou rota interna que redireciona para a fatura */
  paymentHref?: string | null;
}

const OVERDUE_GRACE_DAYS = 5;

export function OverdueBadge({ overdueSince, paymentHref }: OverdueBadgeProps) {
  if (!overdueSince) return null;

  const since = new Date(overdueSince);
  const deadline = new Date(
    since.getTime() + OVERDUE_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );
  const now = new Date();

  if (deadline <= now) return null;

  const deadlineFormatted = deadline.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const href =
    paymentHref && paymentHref.trim().length > 0
      ? paymentHref.trim()
      : '/dashboard/assinatura';
  const openNewTab = href.startsWith('http') || href.startsWith('/api/');

  return (
    <div className="flex max-w-[min(100vw-8rem,20rem)] items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 py-1 pl-1.5 pr-1">
      <AlertTriangle
        size={12}
        className="shrink-0 self-center text-red-400 animate-pulse"
        aria-hidden
      />
      <div className="min-w-0 flex flex-col gap-0 leading-snug">
        <span className="text-[9px] font-medium uppercase tracking-wide text-red-200">
          Pagamento pendente
        </span>
        <span className="text-[9px] font-medium normal-case text-red-100/90">
          Migração para o plano Free em {deadlineFormatted}
        </span>
      </div>
      <a
        href={href}
        target={openNewTab ? '_blank' : '_self'}
        rel={openNewTab ? 'noopener noreferrer' : undefined}
        className="shrink-0 rounded border border-red-400/40 bg-red-600/30 px-1.5 py-1 text-[9px] font-medium uppercase tracking-wide text-red-50 hover:bg-red-600/45 transition-colors"
        title="Abrir cobrança no Asaas (PIX, boleto ou fatura)"
      >
        Pagar agora
      </a>
    </div>
  );
}
