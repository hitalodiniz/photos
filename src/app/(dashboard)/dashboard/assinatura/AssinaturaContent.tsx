'use client';

import { useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { RelatorioBasePage } from '@/components/ui/RelatorioBasePage';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import {
  PERMISSIONS_BY_PLAN,
  PLANS_BY_SEGMENT,
  formatPhotoCredits,
  formatStorageGB,
  getPlanBenefits,
  type PlanKey,
  type PlanBenefitItem,
} from '@/core/config/plans';
import type { AssinaturaPageData } from './page';
import type { UpgradeRequest } from '@/core/types/billing';
import {
  Calendar,
  CreditCard,
  ExternalLink,
  Package,
  TrendingUp,
  Crown,
  Clock,
  BadgeCheck,
  Banknote,
  Image,
  HardDrive,
  Target,
  LayoutGrid,
  Video,
  Sparkles,
} from 'lucide-react';

const SEGMENT = 'PHOTOGRAPHER' as const;

function planDisplayName(planKey: string): string {
  const segmentPlans = PLANS_BY_SEGMENT[SEGMENT] as Record<string, { name: string }>;
  return segmentPlans?.[planKey]?.name ?? planKey;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    approved: 'Aprovado',
    pending_cancellation: 'Cancelamento agendado',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    free: 'Plano gratuito',
    active: 'Ativo',
  };
  return map[status] ?? status;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function AssinaturaContent({ data }: { data: AssinaturaPageData }) {
  const router = useRouter();
  const { profile, history, poolStats, lastChargeAmount, subscriptionStatus } = data;
  const planKey = (profile.plan_key || 'FREE') as PlanKey;
  const permissions = PERMISSIONS_BY_PLAN[planKey];
  const photoCreditsLimit = permissions.photoCredits ?? 0;
  const storageGBLimit = permissions.storageGB ?? 0;
  const photoCreditsUsed = poolStats.totalPhotosUsed ?? 0;
  const expiresAt = profile.plan_trial_expires
    ? new Date(profile.plan_trial_expires).toLocaleDateString('pt-BR')
    : null;

  const planBenefits = useMemo(
    () => getPlanBenefits(permissions, { items: 'galerias' }),
    [permissions],
  );

  const benefitIcon = (item: PlanBenefitItem, index: number): ReactNode => {
    const label = item.label.toLowerCase();
    if (label.includes('galeria') || label.includes('galerias')) return <LayoutGrid size={16} className="text-purple-500 shrink-0" />;
    if (label.includes('capacidade') || label.includes('armazenamento') || label.includes('gb') || label.includes('tb')) return <HardDrive size={16} className="text-emerald-500 shrink-0" />;
    if (label.includes('arquivo') || label.includes('vinculado')) return <Image size={16} className="text-sky-500 shrink-0" />;
    if (label.includes('vídeo')) return <Video size={16} className="text-pink-500 shrink-0" />;
    return <Sparkles size={16} className="text-gold shrink-0" />;
  };

  const getUsageForBenefit = (item: PlanBenefitItem): string | null => {
    const label = item.label.toLowerCase();
    if (label.includes('galeria') && !label.includes('por galeria')) {
      const used = poolStats.activeGalleryCount ?? 0;
      const max = permissions.maxGalleriesHardCap ?? 0;
      return max ? `${used} / ${max}` : null;
    }
    return null;
  };

  const handleUpgrade = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('openUpgrade', planKey);
      router.push('/dashboard');
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'Tem certeza que deseja cancelar sua assinatura? Em até 7 dias o valor pode ser estornado.',
      )
    )
      return;
    try {
      const res = await fetch('/api/dashboard/cancel-subscription', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        router.refresh();
        if (json.access_ends_at) {
          alert(
            `Cancelamento agendado. Seu acesso segue até ${new Date(json.access_ends_at).toLocaleDateString('pt-BR')}.`,
          );
        } else {
          alert('Assinatura cancelada.');
        }
      } else {
        alert(json.error || 'Erro ao cancelar.');
      }
    } catch {
      alert('Erro ao cancelar assinatura.');
    }
  };

  const columns: Array<{
    header: string;
    accessor: keyof UpgradeRequest | ((item: UpgradeRequest) => React.ReactNode);
    icon?: React.ElementType;
    align?: 'left' | 'right' | 'center';
    width?: string;
  }> = [
    {
      header: 'Data',
      accessor: (item) => (
        <span className="text-[12px] text-slate-700 whitespace-nowrap">
          {new Date(item.created_at).toLocaleString('pt-BR')}
        </span>
      ),
      icon: Calendar,
    },
    {
      header: 'Plano',
      accessor: (item) => (
        <span className="font-medium text-petroleum">
          {planDisplayName(item.plan_key_requested)}
        </span>
      ),
      icon: Package,
    },
    {
      header: 'Valor total',
      accessor: (item) => (
        <span className="text-[12px] font-medium">{formatBRL(item.amount_final)}</span>
      ),
      icon: CreditCard,
      align: 'right',
    },
    {
      header: 'Forma de pagamento',
      accessor: (item) => (
        <span className="text-[11px] uppercase tracking-wide">{item.billing_type}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (item) => (
        <span className="text-[11px] font-medium">{statusLabel(item.status)}</span>
      ),
    },
    {
      header: 'Ação',
      accessor: (item) =>
        item.status === 'pending' && item.payment_url ? (
          <a
            href={item.payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Abrir pagamento
            <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-slate-400 text-[11px]">—</span>
        ),
      icon: ExternalLink,
      width: 'w-32',
    },
  ];

  return (
    <RelatorioBasePage
      title="Minha assinatura"
      onBack={() => router.push('/dashboard')}
      footerStatusText={`Plano ${planDisplayName(planKey)}`}
      headerContent={
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleUpgrade}
            className="btn-primary-petroleum inline-flex items-center gap-2"
          >
            <TrendingUp size={16} />
            Fazer upgrade
          </button>
          {planKey !== 'FREE' && (
            <button
              type="button"
              onClick={handleCancelSubscription}
              className="btn-secondary-petroleum border-red-200 text-red-700 hover:bg-red-50"
            >
              Cancelar assinatura
            </button>
          )}
        </div>
      }
    >
      <div className="max-w-[1600px] mx-auto p-2 flex flex-col lg:flex-row gap-4">
        {/* Coluna esquerda: cards */}
        <aside className="w-full lg:w-[350px] space-y-3 shrink-0">
          {/* 1. Resumo do plano (estilo EventReportView – marcos principais) */}
          <div className="p-3 bg-white rounded-luxury border border-slate-200 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
              <Crown size={16} className="text-gold shrink-0" />
              <div>
                <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                  Plano
                </p>
                <p className="text-[10px] font-semibold text-petroleum">
                  {planDisplayName(planKey)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gold shrink-0" />
              <div>
                <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                  Expira em
                </p>
                <p className="text-[10px] font-semibold text-petroleum">
                  {expiresAt ?? '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
              <BadgeCheck size={16} className="text-gold shrink-0" />
              <div>
                <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                  Status
                </p>
                <p className="text-[10px] font-semibold text-petroleum">
                  {statusLabel(subscriptionStatus)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-gold shrink-0" />
              <div>
                <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                  Última cobrança
                </p>
                <p className="text-[10px] font-semibold text-petroleum">
                  {lastChargeAmount != null ? formatBRL(lastChargeAmount) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Benefícios do plano (getPlanBenefits) + uso de créditos */}
          <div className="space-y-2">
            {/* Card de uso: créditos de fotos (não vem de getPlanBenefits) */}
            <div className="p-3 bg-white rounded-luxury border border-slate-200 flex flex-col items-center justify-center space-y-1">
              <Image size={16} className="text-purple-500 mb-1" />
              <p className="text-[8px] font-semibold text-slate-400 uppercase leading-none mb-1 text-center">
                Fotos (créditos)
              </p>
              <p className="text-lg font-semibold text-petroleum leading-none">
                {formatPhotoCredits(photoCreditsUsed)} / {formatPhotoCredits(photoCreditsLimit)}
              </p>
              <div className="w-full mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold/70 rounded-full transition-all"
                  style={{
                    width: `${photoCreditsLimit ? Math.min(100, (photoCreditsUsed / photoCreditsLimit) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            {/* Cards dos benefícios do plano (getPlanBenefits) */}
            <div className="grid grid-cols-2 gap-2">
              {planBenefits.map((item, index) => {
                const usage = getUsageForBenefit(item);
                return (
                  <div
                    key={`${item.label}-${index}`}
                    className="p-3 bg-white rounded-luxury border border-slate-200 flex flex-col items-center justify-center space-y-1"
                  >
                    {benefitIcon(item, index)}
                    <p className="text-[8px] font-semibold text-slate-400 uppercase leading-none mb-0.5 text-center">
                      {item.label}
                    </p>
                    <p className="text-[10px] font-semibold text-petroleum leading-none text-center">
                      {usage ?? item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Card escuro – Ações (estilo Funil EventReportView) */}
          <div className="p-4 rounded-luxury bg-petroleum text-white border border-petroleum shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[9px] font-semibold uppercase tracking-widest text-slate-300">
                Ações
              </h3>
              <Target size={12} className="text-gold" />
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleUpgrade}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-champagne/20 border border-champagne/40 text-champagne hover:bg-champagne/30 text-[10px] font-semibold uppercase transition-colors"
              >
                <TrendingUp size={14} />
                Fazer upgrade
              </button>
              {planKey !== 'FREE' && (
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white/90 hover:bg-red-500/20 hover:border-red-400/40 text-[10px] font-semibold uppercase transition-colors"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Coluna direita: tabela */}
        <main className="flex-1 space-y-4 min-w-0">
          <div className="bg-white rounded-luxury border border-slate-200 p-4 shadow-sm">
            <h2 className="text-[9px] font-semibold uppercase text-slate-500 tracking-tighter mb-3">
              Histórico de pagamentos
            </h2>
            <RelatorioTable<UpgradeRequest>
              data={history}
              columns={columns}
              emptyMessage="Nenhum pagamento encontrado."
              itemsPerPage={10}
            />
          </div>
        </main>
      </div>
    </RelatorioBasePage>
  );
}
