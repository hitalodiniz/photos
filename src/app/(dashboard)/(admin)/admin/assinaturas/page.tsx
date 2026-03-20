// src/app/(dashboard)/admin/assinaturas/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Crown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { RelatorioBasePage } from '@/components/ui';
import { RelatorioSearchInput } from '@/components/ui/RelatorioBasePage';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import { listAdminUsers, type AdminUserRow } from '@/actions/admin.actions';
import { useDebounce } from '@/hooks/useDebounce';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function billingPeriodLabel(period: string | null | undefined): string {
  if (period === 'monthly') return 'Mensal';
  if (period === 'semiannual') return 'Semestral';
  if (period === 'annual') return 'Anual';
  return '—';
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  approved: {
    label: 'Ativo',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  pending: {
    label: 'Pendente',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: Clock,
  },
  pending_cancellation: {
    label: 'Cancelamento agend.',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    icon: AlertTriangle,
  },
  pending_downgrade: {
    label: 'Downgrade agend.',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    icon: AlertTriangle,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: XCircle,
  },
  FREE: {
    label: 'Gratuito',
    color: 'text-slate-600 bg-slate-100 border-slate-200',
    icon: Crown,
  },
};

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status ?? 'FREE'] ?? STATUS_CONFIG['FREE'];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'approved' | 'pending' | 'cancelled' | 'FREE';

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'approved', label: 'Ativos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'FREE', label: 'Gratuitos (sem assinatura)' },
];

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AdminAssinaturasPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [loadError, setLoadError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 400);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await listAdminUsers({
      email: debouncedSearch.trim() || undefined,
    });
    setLoading(false);
    if (result.success && result.data) setData(result.data);
    else {
      setData([]);
      setLoadError(result.error ?? 'Erro ao carregar assinaturas.');
    }
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = data;
    if (statusFilter === 'FREE') {
      rows = rows.filter(
        (u) => !u.subscription_status || u.plan_key === 'FREE',
      );
    } else if (statusFilter !== 'all') {
      rows = rows.filter((u) => u.subscription_status === statusFilter);
    }
    return rows;
  }, [data, statusFilter]);

  // Totalizadores
  const totals = useMemo(() => {
    const active = data.filter(
      (u) => u.subscription_status === 'approved',
    ).length;
    const pending = data.filter(
      (u) => u.subscription_status === 'pending',
    ).length;
    const cancelled = data.filter(
      (u) => u.subscription_status === 'cancelled',
    ).length;
    const free = data.filter(
      (u) => !u.subscription_status || u.plan_key === 'FREE',
    ).length;
    return { active, pending, cancelled, free, total: data.length };
  }, [data]);

  const columns = [
    {
      header: 'Usuário',
      accessor: (u: AdminUserRow) => (
        <div className="py-1">
          <p className="font-semibold text-petroleum text-[12px]">
            {u.full_name || u.username || '—'}
          </p>
          <p className="text-[10px] text-slate-400">{u.email}</p>
        </div>
      ),
      sortKey: 'full_name',
      width: 'w-48',
    },
    {
      header: 'Plano',
      accessor: (u: AdminUserRow) => (
        <div className="flex items-center gap-1.5">
          <Crown size={12} className="text-gold shrink-0" />
          <span className="font-medium text-[12px] text-slate-700">
            {u.plan_key}
          </span>
          {u.is_exempt && (
            <span className="text-[9px] px-1 py-0.5 bg-violet-100 text-violet-700 rounded font-bold">
              Isento
            </span>
          )}
        </div>
      ),
      sortKey: 'plan_key',
    },
    {
      header: 'Status',
      accessor: (u: AdminUserRow) => (
        <StatusBadge status={u.subscription_status} />
      ),
      sortKey: 'subscription_status',
    },
    {
      header: 'Valor',
      accessor: (u: AdminUserRow) => (
        <span className="text-[12px] font-medium text-slate-700">
          {u.last_amount_final != null ? formatBRL(u.last_amount_final) : '—'}
        </span>
      ),
      align: 'right' as const,
      sortKey: 'last_amount_final',
    },
    {
      header: 'Ciclo',
      accessor: (u: AdminUserRow) => (
        <span className="text-[11px] text-slate-600">
          {billingPeriodLabel(u.last_billing_period)}
        </span>
      ),
    },
    {
      header: 'Pagamento',
      accessor: (u: AdminUserRow) => (
        <span className="text-[11px] text-slate-600">
          {u.last_billing_type === 'CREDIT_CARD'
            ? 'Cartão'
            : u.last_billing_type === 'PIX'
              ? 'PIX'
              : u.last_billing_type === 'BOLETO'
                ? 'Boleto'
                : '—'}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      accessor: (u: AdminUserRow) => (
        <span className="text-[11px] text-slate-600">
          {formatDate(u.subscription_expires_at)}
        </span>
      ),
      icon: Clock,
      sortKey: 'subscription_expires_at',
    },
    {
      header: 'Galerias',
      accessor: (u: AdminUserRow) => (
        <span className="text-[12px] tabular-nums font-medium text-center block">
          {u.gallery_count}
        </span>
      ),
      align: 'center' as const,
      sortKey: 'gallery_count',
    },
    {
      header: 'Ações',
      accessor: (u: AdminUserRow) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/usuarios`)}
            className="text-[10px] font-semibold text-petroleum hover:text-gold transition-colors inline-flex items-center gap-1"
          >
            <ExternalLink size={11} /> Ver
          </button>
        </div>
      ),
      align: 'right' as const,
    },
  ];

  return (
    <RelatorioBasePage
      title="Admin – Assinaturas"
      onBack={() => router.push('/admin')}
      footerStatusText={
        loading ? 'Carregando...' : `${filtered.length} registro(s)`
      }
      headerContent={
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <RelatorioSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome ou email..."
            className="flex-1 min-w-0 max-w-sm"
          />
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-[11px] outline-none appearance-none focus:border-gold/50 transition-colors"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="h-10 px-4 bg-champagne text-petroleum rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-petroleum hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Totalizadores */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: totals.total, color: 'text-petroleum' },
            {
              label: 'Ativos',
              value: totals.active,
              color: 'text-emerald-600',
            },
            {
              label: 'Pendentes',
              value: totals.pending,
              color: 'text-amber-600',
            },
            {
              label: 'Cancelados',
              value: totals.cancelled,
              color: 'text-red-600',
            },
            { label: 'Gratuitos', value: totals.free, color: 'text-slate-500' },
          ].map((t) => (
            <div
              key={t.label}
              className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm"
            >
              <p className={`text-[20px] font-bold ${t.color}`}>{t.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {t.label}
              </p>
            </div>
          ))}
        </div>

        {loadError && (
          <div className="p-3 rounded-luxury bg-red-50 border border-red-200 text-red-700 text-sm">
            {loadError}
          </div>
        )}

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Carregando assinaturas…
            </div>
          ) : (
            <RelatorioTable
              data={filtered}
              columns={columns}
              emptyMessage="Nenhum registro encontrado."
              itemsPerPage={20}
            />
          )}
        </div>
      </div>
    </RelatorioBasePage>
  );
}
