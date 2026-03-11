'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FormPageBase from '@/components/ui/FormPageBase';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import {
  listAdminUsers,
  updateUserPlanAdmin,
  adminRevalidateUserCache,
  type AdminUserRow,
} from '@/actions/admin.actions';
import { planOrder, type PlanKey } from '@/core/config/plans';
import {
  Search,
  RefreshCcw,
  User,
  Calendar,
  ShieldCheck,
  Mail,
} from 'lucide-react';

export default function AdminPlanosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados do Formulário
  const [userId, setUserId] = useState('');
  const [planKey, setPlanKey] = useState<PlanKey>('FREE');
  const [expiresAt, setExpiresAt] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const res = await listAdminUsers();
    if (res.success && res.data) setUsers(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtro de busca para a tabela
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [users, searchTerm]);

  // Função para revalidar cache via botão na tabela
  const handleManualRevalidate = async (id: string) => {
    setLoading(true);
    const res = await adminRevalidateUserCache(id);
    setLoading(false);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return setError('Selecione um usuário.');

    setError(null);
    setLoading(true);

    const result = await updateUserPlanAdmin({
      userId,
      plan_key: planKey,
      plan_trial_expires: expiresAt.trim() || null,
    });

    setLoading(false);
    if (result.success) {
      setSuccess(true);
      loadData(); // Recarrega a lista para ver a alteração na tabela
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error ?? 'Erro ao atualizar plano.');
    }
  };

  return (
    <FormPageBase
      title="Admin – Gestão de planos"
      onClose={() => router.push('/dashboard')}
      onSubmit={handleSubmit}
      loading={loading}
      isSuccess={success}
      isShowButtons={true}
      submitLabel="SALVAR ALTERAÇÃO"
      id="admin-plan-form"
      footerStatusText={
        error
          ? error
          : success
            ? 'Sucesso! Cache revalidado.'
            : 'Alteração manual de plano.'
      }
    >
      <div className="space-y-8 py-6">
        {/* Seção 1: Formulário de Edição */}
        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="text-gold" size={20} />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-petroleum">
              Alterar plano manualmente (Override)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">
                Usuário
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[12px] bg-slate-50 outline-none focus:border-gold/50"
              >
                <option value="">Selecione um fotógrafo...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email || u.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">
                Novo Plano
              </label>
              <select
                value={planKey}
                onChange={(e) => setPlanKey(e.target.value as PlanKey)}
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[12px] bg-white outline-none focus:border-gold/50"
              >
                {planOrder.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">
                Expiração (Trial/Manual)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-[12px] bg-white outline-none"
              />
            </div>
          </div>
        </section>

        {/* Seção 2: Tabela de Auditoria e Cache */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-petroleum">
                Lista de Usuários e Status
              </h2>
            </div>

            <div className="relative w-64">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={12}
              />
              <input
                placeholder="Filtrar por nome ou email..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:border-gold/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <RelatorioTable<AdminUserRow>
              data={filteredUsers}
              emptyMessage="Nenhum usuário encontrado."
              itemsPerPage={15}
              columns={[
                {
                  header: 'Usuário',
                  accessor: (u) => (
                    <div className="flex flex-col py-1">
                      <span className="font-bold text-petroleum text-[11px]">
                        {u.full_name || u.username}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Mail size={10} /> {u.email}
                      </span>
                    </div>
                  ),
                  width: 'w-64',
                },
                {
                  header: 'Plano',
                  accessor: (u) => (
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        u.plan_key === 'FREE'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-gold/10 text-gold'
                      }`}
                    >
                      {u.plan_key}
                    </span>
                  ),
                },
                {
                  header: 'Galerias',
                  accessor: (u) => (
                    <span className="text-[11px] tabular-nums font-medium">
                      {u.gallery_count}
                    </span>
                  ),
                  align: 'center',
                },
                {
                  header: 'Expiração',
                  accessor: (u) => (
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {u.plan_trial_expires
                        ? new Date(u.plan_trial_expires).toLocaleDateString(
                            'pt-BR',
                          )
                        : '—'}
                    </span>
                  ),
                  icon: Calendar,
                },
                {
                  header: 'Ação Cache',
                  align: 'right',
                  accessor: (u) => (
                    <button
                      onClick={() => handleManualRevalidate(u.id)}
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-300 hover:text-emerald-500 transition-colors"
                      title="Forçar Revalidação de Cache (revalidateTag)"
                    >
                      <RefreshCcw
                        size={14}
                        className={loading ? 'animate-spin' : ''}
                      />
                    </button>
                  ),
                },
              ]}
            />
          </div>
        </section>
      </div>
    </FormPageBase>
  );
}
