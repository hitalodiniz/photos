'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface OverdueBadgeProps {
  overdueSince: string | null;
}

const OVERDUE_GRACE_DAYS = 5;

export function OverdueBadge({ overdueSince }: OverdueBadgeProps) {
  if (!overdueSince) return null;

  const since = new Date(overdueSince);
  const deadline = new Date(
    since.getTime() + OVERDUE_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );
  const now = new Date();

  // Carência já esgotada — downgrade já executado ou pendente no próximo cron
  if (deadline <= now) return null;

  const deadlineFormatted = deadline.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });

  return (
    <Link
      href="/dashboard/assinatura"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all"
      title={`Pagamento em atraso. Regularize até ${deadlineFormatted} para manter seu plano.`}
    >
      <AlertTriangle size={13} className="shrink-0 animate-pulse" />
      <span className="text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
        Pagamento atrasado · até {deadlineFormatted}
      </span>
    </Link>
  );
}
