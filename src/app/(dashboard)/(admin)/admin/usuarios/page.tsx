'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Crown,
  ImageIcon,
  FileCheck,
  ExternalLink,
  FolderOpen,
  ShieldCheck,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import { RelatorioBasePage } from '@/components/ui';
import { RelatorioSearchInput } from '@/components/ui/RelatorioBasePage';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import BaseModal from '@/components/ui/BaseModal';
import {
  listAdminUsers,
  updateUserPlanAdmin,
  adminRevalidateUserCache,
  type AdminUserRow,
} from '@/actions/admin.actions';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { planOrder, type PlanKey } from '@/core/config/plans';

// ─── Badge de status (cores conforme especificação) ─────────────────────────

const STATUS_BADGE = {
  active: {
    bg: '#DCFCE7',
    text: '#166534',
    label: 'Ativo',
    title: 'Pagamento em dia',
  },
  pending: {
    bg: '#FEF9C3',
    text: '#854D0E',
    label: 'Pendente',
    title: 'Aguardando expiração',
  },
  exempt: {
    bg: '#F3E8FF',
    text: '#6B21A8',
    label: 'Isento',
    title: 'Benefício manual (VIP)',
  },
  expired: {
    bg: '#FEE2E2',
    text: '#991B1B',
    label: 'Expirado',
    title: 'Downgrade para Free',
  },
} as const;

type StatusKey = keyof typeof STATUS_BADGE;

function SubscriptionStatusBadge({
  isExempt,
  subscriptionStatus,
}: {
  isExempt: boolean;
  subscriptionStatus: string | null;
}) {
  const status: StatusKey = isExempt
    ? 'exempt'
    : subscriptionStatus === 'approved'
      ? 'active'
      : subscriptionStatus === 'pending_cancellation'
        ? 'pending'
        : 'expired';
  const config = STATUS_BADGE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: config.bg, color: config.text }}
      title={config.title}
    >
      <FileCheck size={10} />
      {config.label}
    </span>
  );
}

// ─── Modal Editar usuário (plan_key + is_exempt) ──────────────────────────

function EditUserModal({
  isOpen,
  onClose,
  row,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: AdminUserRow | null;
  onSaved: () => void;
}) {
  const [planKey, setPlanKey] = useState<PlanKey>('FREE');
  const [isExempt, setIsExempt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (row) {
      setPlanKey((row.plan_key as PlanKey) || 'FREE');
      setIsExempt(Boolean(row.is_exempt));
      setError(null);
    }
  }, [row]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;
    setSaving(true);
    setError(null);
    const result = await updateUserPlanAdmin({
      userId: row.id,
      plan_key: planKey,
      plan_trial_expires: row.plan_trial_expires,
      is_exempt: isExempt,
    });
    setSaving(false);
    if (result.success) {
      showToast('Usuário atualizado com sucesso.');
      onSaved();
      onClose();
    } else {
      setError(result.error ?? 'Erro ao salvar.');
    }
  };

  if (!row) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar usuário"
      subtitle={row.full_name || row.username || row.email || row.id}
      maxWidth="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/30 text-white/90 hover:bg-white/10 text-xs font-semibold uppercase"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-user-form"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gold text-petroleum hover:bg-gold/90 disabled:opacity-50 text-xs font-semibold uppercase"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
            Plano
          </label>
          <select
            value={planKey}
            onChange={(e) => setPlanKey(e.target.value as PlanKey)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-petroleum focus:ring-1 focus:ring-petroleum"
          >
            {planOrder.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-is-exempt"
            checked={isExempt}
            onChange={(e) => setIsExempt(e.target.checked)}
            className="rounded border-slate-300 text-petroleum focus:ring-petroleum"
          />
          <label htmlFor="edit-is-exempt" className="text-sm font-medium text-slate-700">
            Usuário isento (benefício vitalício)
          </label>
        </div>
      </form>
    </BaseModal>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [cpfFilter, setCpfFilter] = useState('');
  const [revalidatingId, setRevalidatingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AdminUserRow | null>(null);
  const { showToast, ToastElement } = useToast();

  const debouncedEmail = useDebounce(emailFilter, 500);
  const debouncedCpf = useDebounce(cpfFilter, 500);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminUsers({
      email: debouncedEmail.trim() || undefined,
      cpfCnpj: debouncedCpf.trim() || undefined,
    });
    setLoading(false);
    if (result.success && result.data) setData(result.data);
    else setData([]);
  }, [debouncedEmail, debouncedCpf]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevalidate = useCallback(
    async (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setRevalidatingId(userId);
      const result = await adminRevalidateUserCache(userId);
      setRevalidatingId(null);
      if (result.success) {
        showToast('Cache revalidado com sucesso.');
      } else {
        showToast(result.error ?? 'Erro ao revalidar.', 'error');
      }
    },
    [showToast],
  );

  const columns = useMemo(
    () => [
      {
        header: 'Nome',
        accessor: (r: AdminUserRow) => (
          <div className="font-medium text-petroleum">
            {r.full_name || r.username || '—'}
          </div>
        ),
        icon: User,
        sortKey: 'full_name',
      },
      {
        header: 'Plano atual',
        accessor: (r: AdminUserRow) => (
          <div className="flex items-center gap-1.5">
            <Crown size={12} className="text-gold" />
            <span className="font-medium text-slate-700">{r.plan_key}</span>
          </div>
        ),
        icon: Crown,
        sortKey: 'plan_key',
      },
      {
        header: 'Isenção',
        accessor: (r: AdminUserRow) =>
          r.is_exempt ? (
            <div className="flex items-center gap-1.5" title="Usuário isento">
              <ShieldCheck size={14} className="text-violet-600" />
              <span className="text-[10px] font-semibold text-violet-700">Isento</span>
            </div>
          ) : (
            <span className="text-slate-400 text-[10px]">—</span>
          ),
      },
      {
        header: 'Qtd galerias ativas',
        accessor: (r: AdminUserRow) => (
          <div className="flex items-center gap-1.5">
            <ImageIcon size={12} className="text-slate-400" />
            <span>{r.gallery_count}</span>
          </div>
        ),
        icon: ImageIcon,
        sortKey: 'gallery_count',
      },
      {
        header: 'Status da assinatura',
        accessor: (r: AdminUserRow) => (
          <SubscriptionStatusBadge
            isExempt={r.is_exempt}
            subscriptionStatus={r.subscription_status}
          />
        ),
        icon: FileCheck,
        sortKey: 'subscription_status',
      },
      {
        header: 'Ação',
        accessor: (r: AdminUserRow) => (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setEditRow(r)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-petroleum hover:text-petroleum/80 uppercase tracking-wide"
            >
              <Pencil size={12} />
              Editar
            </button>
            <button
              type="button"
              onClick={(e: React.MouseEvent) => handleRevalidate(r.id, e)}
              disabled={revalidatingId === r.id}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-petroleum uppercase tracking-wide disabled:opacity-50"
              title="Revalidar cache do usuário"
            >
              <RefreshCw
                size={12}
                className={revalidatingId === r.id ? 'animate-spin' : ''}
              />
              Revalidar
            </button>
            <a
              href={`/admin/usuarios/${r.id}/galerias`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-petroleum hover:text-petroleum/80 uppercase tracking-wide"
            >
              <FolderOpen size={12} />
              Galerias
            </a>
            <a
              href={`/dashboard?impersonate=${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold hover:text-gold/80 uppercase tracking-wide"
            >
              <ExternalLink size={12} />
              Simular Painel
            </a>
          </div>
        ),
        align: 'right' as const,
      },
    ],
    [handleRevalidate, revalidatingId],
  );

  return (
    <>
      <RelatorioBasePage
        title="Admin – Usuários"
        onBack={() => router.push('/admin')}
        footerStatusText={
          loading ? 'Carregando...' : `${data.length} usuário(s)`
        }
        headerContent={
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <RelatorioSearchInput
              value={emailFilter}
              onChange={setEmailFilter}
              placeholder="Buscar por nome, e-mail ou usuário..."
              className="flex-1 min-w-0 max-w-md"
            />
            <RelatorioSearchInput
              value={cpfFilter}
              onChange={setCpfFilter}
              placeholder="Buscar por CPF/CNPJ..."
              className="flex-1 min-w-0 max-w-xs"
            />
          </div>
        }
      >
        <div className="bg-white border border-slate-200 rounded-luxury overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Carregando usuários...
            </div>
          ) : (
            <RelatorioTable
              data={data}
              columns={columns}
              emptyMessage="Nenhum usuário encontrado."
              itemsPerPage={15}
            />
          )}
        </div>
      </RelatorioBasePage>

      <EditUserModal
        isOpen={!!editRow}
        onClose={() => setEditRow(null)}
        row={editRow}
        onSaved={load}
      />

      {ToastElement}
    </>
  );
}
