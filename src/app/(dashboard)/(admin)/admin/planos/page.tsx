'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FormPageBase from '@/components/ui/FormPageBase';
import { listAdminUsers, updateUserPlanAdmin } from '@/actions/admin.actions';
import { planOrder, type PlanKey } from '@/core/config/plans';

export default function AdminPlanosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<{ id: string; label: string }[]>([]);
  const [userId, setUserId] = useState('');
  const [planKey, setPlanKey] = useState<PlanKey>('FREE');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminUsers().then((res) => {
      if (res.success && res.data) {
        setUsers(
          res.data.map((u) => ({
            id: u.id,
            label: [u.full_name, u.email, u.username].filter(Boolean).join(' · ') || u.id,
          })),
        );
        if (res.data.length > 0 && !userId) setUserId(res.data[0].id);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) {
      setError('Selecione um usuário.');
      return;
    }
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
      hasUnsavedChanges={!!userId}
      footerStatusText={
        error
          ? error
          : success
            ? 'Plano atualizado. Cache do usuário revalidado.'
            : 'Alteração manual (ignora Asaas).'
      }
      submitLabel="SALVAR PLANO"
      id="admin-plan-form"
    >
      <div className="space-y-6 py-6">
        <h1
          id="form-page-title"
          className="text-2xl font-bold text-petroleum uppercase tracking-wide"
        >
          Alterar plano manualmente
        </h1>
        <p className="text-sm text-slate-600 max-w-xl">
          Use para casos de suporte. A alteração atualiza apenas{' '}
          <code className="bg-slate-100 px-1 rounded">plan_key</code> e{' '}
          <code className="bg-slate-100 px-1 rounded">plan_trial_expires</code>{' '}
          em <code className="bg-slate-100 px-1 rounded">tb_profiles</code>,
          sem passar pelo Asaas. O cache do usuário é revalidado ao salvar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <div>
            <label
              htmlFor="admin-user"
              className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2"
            >
              Usuário
            </label>
            <select
              id="admin-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full h-10 px-4 border border-slate-200 rounded-luxury text-sm text-petroleum bg-white focus:border-gold/40 focus:ring-1 focus:ring-gold/10 outline-none"
            >
              <option value="">Selecione...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="admin-plan"
              className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2"
            >
              Plano
            </label>
            <select
              id="admin-plan"
              value={planKey}
              onChange={(e) => setPlanKey(e.target.value as PlanKey)}
              className="w-full h-10 px-4 border border-slate-200 rounded-luxury text-sm text-petroleum bg-white focus:border-gold/40 focus:ring-1 focus:ring-gold/10 outline-none"
            >
              {planOrder.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="admin-expires"
              className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2"
            >
              Data de expiração (opcional)
            </label>
            <input
              id="admin-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full max-w-xs h-10 px-4 border border-slate-200 rounded-luxury text-sm text-petroleum bg-white focus:border-gold/40 focus:ring-1 focus:ring-gold/10 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Deixe em branco para sem data de expiração (trial/assinatura).
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-luxury bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    </FormPageBase>
  );
}
