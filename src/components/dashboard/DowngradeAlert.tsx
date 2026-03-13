'use client';

import { useTransition } from 'react';
import { AlertTriangle, Archive } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import type { Galeria } from '@/core/types/galeria';
import { acknowledgeDowngradeAlert } from '@/actions/downgrade.actions';

interface DowngradeAlertProps {
  profile: {
    id: string;
    full_name: string;
    metadata?: { last_downgrade_alert_viewed?: boolean } | null;
  } | null;
  galerias: Galeria[];
}

export function DowngradeAlert({ profile, galerias }: DowngradeAlertProps) {
  const [isPending, startTransition] = useTransition();

  if (!profile) return null;

  const metadata = profile.metadata as
    | { last_downgrade_alert_viewed?: boolean }
    | null
    | undefined;
  const shouldShow =
    metadata?.last_downgrade_alert_viewed === false;

  const autoArchived = galerias.filter(
    (g) => g.auto_archived === true && g.is_archived === false && g.is_deleted === false,
  );

  if (!shouldShow || autoArchived.length === 0) return null;

  const total = autoArchived.length;

  const handleConfirm = () => {
    startTransition(async () => {
      await acknowledgeDowngradeAlert();
    });
  };

  return (
    <BaseModal
      isOpen
      onClose={handleConfirm}
      title="Notificação de Plano"
      subtitle="Downgrade automático de galerias excedentes"
      maxWidth="lg"
      headerIcon={<AlertTriangle size={18} />}
      showCloseButton={!isPending}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="btn-luxury-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Entendi
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-petroleum">
        <p className="text-[13px] leading-relaxed">
          <strong>Notificação de Plano.</strong> Sua assinatura foi alterada e{' '}
          <strong>{total}</strong> galeria{total > 1 ? 's' : ''} foi
          {total > 1 ? 'ram' : ' '} arquivada{total > 1 ? 's' : ''} para cumprir
          o novo limite de plano.
        </p>

        <p className="text-[12px] text-petroleum/80">
          Essas galerias foram movidas para a seção{' '}
          <strong>&quot;Arquivadas&quot;</strong> no menu à esquerda do seu
          Espaço de Galerias. Você pode reativá-las assinando um plano superior.
        </p>

        <div className="mt-3 border border-slate-200 rounded-luxury bg-slate-50/50 p-3 max-h-56 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Archive size={14} className="text-gold shrink-0" />
            <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Galerias arquivadas automaticamente
            </p>
          </div>
          <ul className="space-y-1.5 text-[12px] text-slate-800">
            {autoArchived.map((g) => (
              <li key={g.id} className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className="font-medium truncate"
                    title={g.title}
                  >
                    {g.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {g.location ?? 'Local não informado'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {g.date && (
                    <p className="text-[11px] text-slate-500">
                      {new Date(g.date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-slate-500 mt-2">
          Este aviso é exibido apenas uma vez para sua conta após um downgrade.
        </p>
      </div>
    </BaseModal>
  );
}

