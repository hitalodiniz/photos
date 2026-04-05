'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TicketPercent, Power, Pencil } from 'lucide-react';
import { RelatorioBasePage } from '@/components/ui';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import BaseModal from '@/components/ui/BaseModal';
import { useToast } from '@/hooks/useToast';
import {
  listAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  toggleAdminCouponActive,
  type AdminCouponRow,
} from '@/actions/admin.actions';

type CouponFormState = {
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  apply_mode: 'once' | 'forever';
  max_uses: number | null;
  starts_at: string;
  expires_at: string | null;
  active: boolean;
};

const DEFAULT_FORM: CouponFormState = {
  code: '',
  discount_type: 'percentage',
  discount_value: 10,
  apply_mode: 'once',
  max_uses: null,
  starts_at: new Date().toISOString().slice(0, 16),
  expires_at: null,
  active: true,
};

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

export default function AdminCouponsClient() {
  const router = useRouter();
  const { showToast, ToastElement } = useToast();

  const [rows, setRows] = useState<AdminCouponRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminCouponRow | null>(null);
  const [form, setForm] = useState<CouponFormState>(DEFAULT_FORM);

  const load = useCallback(async () => {
    setLoadError(null);
    const result = await listAdminCoupons();
    if (!result.success) {
      setLoadError(result.error ?? 'Erro ao carregar cupons.');
      return;
    }
    setRows(result.data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loadError) showToast(loadError, 'error');
  }, [loadError, showToast]);

  const openCreate = () => {
    setEditRow(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  const openEdit = (row: AdminCouponRow) => {
    setEditRow(row);
    setForm({
      code: row.code,
      discount_type: row.discount_type,
      discount_value: row.discount_value,
      apply_mode: row.apply_mode,
      max_uses: row.max_uses,
      starts_at: toDateTimeLocal(row.starts_at),
      expires_at: toDateTimeLocal(row.expires_at),
      active: row.active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      apply_mode: form.apply_mode,
      max_uses: form.max_uses,
      starts_at: fromDateTimeLocal(form.starts_at),
      expires_at: form.expires_at ? fromDateTimeLocal(form.expires_at) : null,
      active: form.active,
    } as const;

    const result = editRow
      ? await updateAdminCoupon({ id: editRow.id, ...payload })
      : await createAdminCoupon(payload);
    setSaving(false);

    if (!result.success) {
      showToast(result.error ?? 'Erro ao salvar cupom.', 'error');
      return;
    }
    showToast(editRow ? 'Cupom atualizado.' : 'Cupom criado.');
    setModalOpen(false);
    await load();
  };

  const handleToggle = async (row: AdminCouponRow) => {
    const nextActive = !row.active;
    const result = await toggleAdminCouponActive({
      id: row.id,
      active: nextActive,
    });
    if (!result.success) {
      showToast(result.error ?? 'Erro ao alterar status do cupom.', 'error');
      return;
    }
    showToast(nextActive ? 'Cupom ativado.' : 'Cupom desativado.');
    await load();
  };

  const columns = useMemo(
    () => [
      {
        header: 'Código',
        accessor: (r: AdminCouponRow) => (
          <span className="font-semibold text-petroleum">{r.code}</span>
        ),
      },
      {
        header: 'Desconto',
        accessor: (r: AdminCouponRow) => (
          <span className="text-slate-700">
            {r.discount_type === 'percentage'
              ? `${r.discount_value}%`
              : `R$ ${r.discount_value.toFixed(2)}`}
          </span>
        ),
      },
      {
        header: 'Aplicação',
        accessor: (r: AdminCouponRow) => (
          <span className="text-slate-700">
            {r.apply_mode === 'forever' ? 'Recorrente' : 'Primeira cobrança'}
          </span>
        ),
      },
      {
        header: 'Uso',
        accessor: (r: AdminCouponRow) => (
          <span className="text-slate-700">
            {r.used_count} / {r.max_uses ?? '∞'}
          </span>
        ),
      },
      {
        header: 'Vigência',
        accessor: (r: AdminCouponRow) => (
          <span className="text-slate-600">
            {new Date(r.starts_at).toLocaleDateString('pt-BR')} -{' '}
            {r.expires_at
              ? new Date(r.expires_at).toLocaleDateString('pt-BR')
              : 'Sem expiração'}
          </span>
        ),
      },
      {
        header: 'Status',
        accessor: (r: AdminCouponRow) => (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              r.active
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {r.active ? 'Ativo' : 'Inativo'}
          </span>
        ),
      },
      {
        header: 'Ações',
        accessor: (r: AdminCouponRow) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-petroleum hover:text-gold"
            >
              <Pencil size={12} /> Editar
            </button>
            <button
              type="button"
              onClick={() => handleToggle(r)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-petroleum"
            >
              <Power size={12} /> {r.active ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        ),
        align: 'right' as const,
      },
    ],
    [],
  );

  return (
    <>
      <RelatorioBasePage
        title="Admin – Cupons"
        onBack={() => router.push('/admin')}
        footerStatusText={`${rows.length} cupom(ns)`}
        headerContent={
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-champagne text-petroleum text-[10px] font-bold uppercase tracking-wider hover:bg-petroleum hover:text-white transition-colors"
            >
              <Plus size={12} />
              Novo cupom
            </button>
          </div>
        }
      >
        <div className="bg-white border border-slate-200 rounded-luxury overflow-hidden shadow-sm">
          <RelatorioTable
            data={rows}
            columns={columns}
            emptyMessage="Nenhum cupom cadastrado."
            itemsPerPage={20}
          />
        </div>
      </RelatorioBasePage>

      <BaseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editRow ? 'Editar cupom' : 'Novo cupom'}
        subtitle={editRow ? editRow.code : 'Criar cupom promocional'}
        headerIcon={<TicketPercent size={18} className="text-gold" />}
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-white/30 text-white/90 hover:bg-white/10 text-xs font-semibold uppercase"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="coupon-form"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gold text-petroleum hover:bg-gold/90 disabled:opacity-50 text-xs font-semibold uppercase"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      >
        <form id="coupon-form" onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Código
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                  }))
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Tipo desconto
              </label>
              <select
                value={form.discount_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_type: e.target.value as 'fixed' | 'percentage',
                  }))
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="percentage">Percentual</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Valor
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.discount_value}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_value: Number(e.target.value),
                  }))
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Aplicação
              </label>
              <select
                value={form.apply_mode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    apply_mode: e.target.value as 'once' | 'forever',
                  }))
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="once">Somente 1ª cobrança</option>
                <option value="forever">Recorrente</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Máx. usos
              </label>
              <input
                type="number"
                min={0}
                value={form.max_uses ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    max_uses: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="Ilimitado"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Início
              </label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, starts_at: e.target.value }))
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Expiração
              </label>
              <input
                type="datetime-local"
                value={form.expires_at ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    expires_at: e.target.value || null,
                  }))
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <input
                id="coupon-active"
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, active: e.target.checked }))
                }
              />
              <label htmlFor="coupon-active" className="text-sm text-slate-700">
                Cupom ativo
              </label>
            </div>
          </div>
        </form>
      </BaseModal>

      {ToastElement}
    </>
  );
}
