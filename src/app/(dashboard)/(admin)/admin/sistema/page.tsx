// src/app/(dashboard)/admin/sistema/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { purgeAllCache } from '@/actions/revalidate.actions';
import {
  quickCleanupTokens,
  fullCleanupTokens,
} from '@/actions/token-cleanup.actions';
import {
  Settings,
  Zap,
  RefreshCw,
  Database,
  Clock,
  FlaskConical,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { planOrder, PLANS_BY_SEGMENT } from '@/core/config/plans';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ResetAction =
  | 'clean_billing'
  | 'clean_asaas'
  | 'clean_asaas_payments'
  | 'set_plan'
  | 'simulate_expired'
  | 'simulate_trial'
  | 'restore_galerias'
  | 'simulate_overdue'
  | 'revalidate_users';

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

async function callDevReset(
  action: ResetAction,
  params?: { username?: string; plan_key?: string },
): Promise<ActionResult> {
  const res = await fetch('/api/admin/dev-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
  danger,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
        danger ? 'border-red-200' : 'border-slate-200'
      }`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-3 border-b ${
          danger ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <Icon size={16} className={danger ? 'text-red-500' : 'text-gold'} />
        <p
          className={`text-[10px] font-bold uppercase tracking-wider ${
            danger ? 'text-red-700' : 'text-petroleum/70'
          }`}
        >
          {title}
        </p>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function ResultBadge({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <div
      className={`flex items-start gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium leading-snug ${
        result.success
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          : 'bg-red-50 border border-red-200 text-red-800'
      }`}
    >
      {result.success ? (
        <CheckCircle2 size={12} className="shrink-0 mt-0.5 text-emerald-600" />
      ) : (
        <XCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
      )}
      {result.success ? result.message : result.error}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-petroleum outline-none focus:border-gold/60 transition-colors"
      />
    </div>
  );
}

function PlanSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = ['FREE', ...planOrder.filter((p) => p !== 'FREE')];
  const segmentPlans = PLANS_BY_SEGMENT['PHOTOGRAPHER'] as Record<
    string,
    { name: string }
  >;
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
        Plano
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-petroleum outline-none focus:border-gold/60 appearance-none"
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {key === 'FREE' ? 'FREE' : (segmentPlans?.[key]?.name ?? key)}
          </option>
        ))}
      </select>
    </div>
  );
}

function Btn({
  label,
  loading,
  loadingLabel,
  onClick,
  variant = 'default',
}: {
  label: string;
  loading: boolean;
  loadingLabel?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-full h-9 rounded-lg font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
        variant === 'danger'
          ? 'bg-red-100 text-red-700 hover:bg-red-600 hover:text-white'
          : 'bg-champagne text-petroleum hover:bg-petroleum hover:text-white'
      }`}
    >
      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
      {loading ? (loadingLabel ?? 'Processando…') : label}
    </button>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'sistema' | 'testes';

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminSistemaPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('sistema');

  const isDev = process.env.NODE_ENV !== 'production';

  // ── Loadings do sistema ───────────────────────────────────────────────────
  const [loadingCache, setLoadingCache] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingTrials, setLoadingTrials] = useState(false);
  const [loadingDowngrades, setLoadingDowngrades] = useState(false);
  const [loadingExpiredPending, setLoadingExpiredPending] = useState(false);

  // ── Suporte: revalidar usuário ────────────────────────────────────────────
  const [supportUsername, setSupportUsername] = useState('');
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [supportResult, setSupportResult] = useState<ActionResult | null>(null);

  // ── Testes ───────────────────────────────────────────────────────────────
  const [loadingDev, setLoadingDev] = useState<ResetAction | null>(null);
  const [results, setResults] = useState<
    Partial<Record<ResetAction, ActionResult>>
  >({});
  const [setPlanUsername, setSetPlanUsername] = useState('hitalodiniz');
  const [setPlanKey, setSetPlanKey] = useState('PRO');
  const [expiredUsername, setExpiredUsername] = useState('hitalodiniz');
  const [trialUsername, setTrialUsername] = useState('hitalodiniz');
  const [trialPlan, setTrialPlan] = useState('PRO');
  const [restoreUsername, setRestoreUsername] = useState('');
  const [overdueUsername, setOverdueUsername] = useState('hitalodiniz');
  const [overduePlan, setOverduePlan] = useState('PRO');

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  async function run(
    action: ResetAction,
    params?: { username?: string; plan_key?: string },
  ) {
    setLoadingDev(action);
    const result = await callDevReset(action, params);
    setResults((prev) => ({ ...prev, [action]: result }));
    setLoadingDev(null);
  }

  async function handlePurgeCache() {
    setLoadingCache(true);
    try {
      const result = await purgeAllCache();
      alert(
        result.success
          ? '✅ Cache global invalidado!'
          : '❌ Falha ao limpar cache.',
      );
      if (result.success) window.location.reload();
    } finally {
      setLoadingCache(false);
    }
  }

  async function handleCron(path: string, setLoading: (v: boolean) => void) {
    if (!confirm(`Executar ${path}?`)) return;
    setLoading(true);
    try {
      const response = await fetch(path, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`,
        },
      });
      const result = await response.json();
      if (result.success || result.ok) {
        alert(`✅ Executado!\n${JSON.stringify(result, null, 2)}`);
      } else {
        alert(`❌ Erro: ${result.error || 'Falha na rotina'}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevalidateUser() {
    const usernames = supportUsername
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    if (!usernames.length) return;
    setLoadingSupport(true);
    setSupportResult(null);
    try {
      const res = await fetch('/api/admin/revalidate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames }),
      });
      setSupportResult(await res.json());
    } catch {
      setSupportResult({ success: false, error: 'Erro ao conectar.' });
    } finally {
      setLoadingSupport(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-petroleum text-white px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <Settings size={18} className="text-gold" />
          <div>
            <h1 className="text-[15px] font-bold uppercase tracking-wider">
              Sistema
            </h1>
            <p className="text-[10px] text-white/50">
              Ferramentas de operação e teste
            </p>
          </div>

          {/* Abas */}
          <div className="ml-auto flex gap-1">
            {(
              [
                ['sistema', 'Sistema'],
                ...(isDev ? [['testes', '🧪 Testes']] : []),
              ] as [Tab, string][]
            ).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? tab === 'testes'
                      ? 'bg-amber-400 text-petroleum'
                      : 'bg-gold text-petroleum'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* ══ ABA SISTEMA ══════════════════════════════════════════════════ */}
        {activeTab === 'sistema' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cache */}
            <SectionCard title="Cache Global" icon={Zap}>
              <p className="text-[11px] text-slate-500">
                Remove o cache de todas as galerias e perfis.
              </p>
              <Btn
                label="Executar Purge Global"
                loading={loadingCache}
                loadingLabel="Limpando…"
                onClick={handlePurgeCache}
              />
            </SectionCard>

            {/* Tokens Google */}
            <SectionCard title="Tokens Google" icon={Database}>
              <p className="text-[11px] text-slate-500">
                Valida e remove tokens Google expirados ou inválidos.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Btn
                  label="Limpeza Rápida"
                  loading={loadingTokens}
                  onClick={async () => {
                    setLoadingTokens(true);
                    const r = await quickCleanupTokens();
                    setLoadingTokens(false);
                    alert(r.success ? `✅ ${r.message}` : `❌ ${r.message}`);
                  }}
                />
                <Btn
                  label="Limpeza Completa"
                  loading={loadingTokens}
                  onClick={async () => {
                    if (!confirm('Executar limpeza completa?')) return;
                    setLoadingTokens(true);
                    const r = await fullCleanupTokens();
                    setLoadingTokens(false);
                    alert(r.success ? `✅ ${r.message}` : `❌ ${r.message}`);
                  }}
                />
              </div>
            </SectionCard>

            {/* Crons */}
            <SectionCard title="Rotinas de Assinatura" icon={Clock}>
              <p className="text-[11px] text-slate-500">
                Executa as mesmas rotinas do Cron Job da Vercel manualmente.
              </p>
              <div className="space-y-2">
                <Btn
                  label="Forçar expiração de Trials"
                  loading={loadingTrials}
                  loadingLabel="Processando…"
                  onClick={() =>
                    handleCron('/api/cron/expire-trials', setLoadingTrials)
                  }
                />
                <Btn
                  label="Aplicar Downgrades agendados"
                  loading={loadingDowngrades}
                  loadingLabel="Aplicando…"
                  onClick={() =>
                    handleCron(
                      '/api/cron/apply-downgrades',
                      setLoadingDowngrades,
                    )
                  }
                />
                <Btn
                  label="Cancelar pendentes expirados"
                  loading={loadingExpiredPending}
                  loadingLabel="Cancelando…"
                  onClick={() =>
                    handleCron(
                      '/api/cron/cancel-expired-pending-upgrades',
                      setLoadingExpiredPending,
                    )
                  }
                />
              </div>
            </SectionCard>

            {/* Suporte: revalidar cache */}
            <SectionCard title="Suporte — Revalidar Cache" icon={RefreshCw}>
              <p className="text-[11px] text-slate-500">
                Invalida todas as tags de cache de usuários específicos.
                Usernames separados por vírgula.
              </p>
              <InputField
                label="Username(s)"
                value={supportUsername}
                onChange={setSupportUsername}
                placeholder="hitalodiniz, hitalodiniz80"
              />
              <Btn
                label="Revalidar cache"
                loading={loadingSupport}
                loadingLabel="Revalidando…"
                onClick={handleRevalidateUser}
              />
              <ResultBadge result={supportResult} />
            </SectionCard>
          </div>
        )}

        {/* ══ ABA TESTES (só em dev) ═══════════════════════════════════════ */}
        {activeTab === 'testes' && isDev && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Ambiente de testes — operações irreversíveis — indisponível em
                produção
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Limpar billing + Asaas */}
              <SectionCard
                title="Limpar billing + Asaas sandbox"
                icon={FlaskConical}
                danger
              >
                <p className="text-[11px] text-slate-500 leading-snug">
                  Cancela assinaturas/cobranças no Asaas (3 fontes:
                  billing_profiles, upgrade_requests, busca por email) e apaga
                  todas as tabelas de billing.
                </p>
                <Btn
                  label="Executar limpeza completa"
                  loading={loadingDev === 'clean_billing'}
                  variant="danger"
                  onClick={() => {
                    if (
                      !confirm(
                        'Limpar Asaas sandbox E todas as tabelas de billing? Irreversível.',
                      )
                    )
                      return;
                    run('clean_billing');
                  }}
                />
                <ResultBadge result={results['clean_billing'] ?? null} />
              </SectionCard>

              {/* Limpar Asaas sandbox */}
              <SectionCard
                title="Limpar Asaas sandbox"
                icon={FlaskConical}
                danger
              >
                <p className="text-[11px] text-slate-500 leading-snug">
                  Cancela assinaturas e cobranças dos usuários de teste no
                  Asaas. Não altera o banco.
                </p>
                <Btn
                  label="Limpar Asaas sandbox"
                  loading={loadingDev === 'clean_asaas'}
                  variant="danger"
                  onClick={() => {
                    if (
                      !confirm(
                        'Cancelar assinaturas e cobranças no Asaas sandbox?',
                      )
                    )
                      return;
                    run('clean_asaas');
                  }}
                />
                <ResultBadge result={results['clean_asaas'] ?? null} />
              </SectionCard>

              {/* Remover cobranças soltas */}
              <SectionCard
                title="Remover cobranças soltas"
                icon={FlaskConical}
                danger
              >
                <p className="text-[11px] text-slate-500 leading-snug">
                  Remove <strong>todas</strong> as cobranças do Asaas sandbox
                  sem depender do banco. Útil para cobranças órfãs de testes
                  anteriores.
                </p>
                <Btn
                  label="Remover cobranças soltas"
                  loading={loadingDev === 'clean_asaas_payments'}
                  variant="danger"
                  onClick={() => {
                    if (
                      !confirm('Remover TODAS as cobranças do Asaas sandbox?')
                    )
                      return;
                    run('clean_asaas_payments');
                  }}
                />
                <ResultBadge result={results['clean_asaas_payments'] ?? null} />
              </SectionCard>

              {/* Definir plano */}
              <SectionCard title="Definir plano de usuário" icon={FlaskConical}>
                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    label="Username"
                    value={setPlanUsername}
                    onChange={setSetPlanUsername}
                    placeholder="hitalodiniz"
                  />
                  <PlanSelect value={setPlanKey} onChange={setSetPlanKey} />
                </div>
                <Btn
                  label="Aplicar plano"
                  loading={loadingDev === 'set_plan'}
                  onClick={() =>
                    run('set_plan', {
                      username: setPlanUsername,
                      plan_key: setPlanKey,
                    })
                  }
                />
                <ResultBadge result={results['set_plan'] ?? null} />
              </SectionCard>

              {/* Simular expirado >7 dias */}
              <SectionCard
                title="Simular fora da janela de arrependimento"
                icon={FlaskConical}
              >
                <p className="text-[11px] text-slate-500 leading-snug">
                  Retrodata processed_at e created_at do upgrade_request para
                  2026-02-10 (fora dos 7 dias).
                </p>
                <InputField
                  label="Username"
                  value={expiredUsername}
                  onChange={setExpiredUsername}
                  placeholder="hitalodiniz"
                />
                <Btn
                  label="Simular expirado"
                  loading={loadingDev === 'simulate_expired'}
                  onClick={() =>
                    run('simulate_expired', { username: expiredUsername })
                  }
                />
                <ResultBadge result={results['simulate_expired'] ?? null} />
              </SectionCard>

              {/* Simular trial vencido */}
              <SectionCard
                title="Simular trial vencido há 1 hora"
                icon={FlaskConical}
              >
                <p className="text-[11px] text-slate-500 leading-snug">
                  Define is_trial=true e plan_trial_expires = agora − 1h.
                  Restaura galerias auto_archived.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    label="Username"
                    value={trialUsername}
                    onChange={setTrialUsername}
                    placeholder="hitalodiniz"
                  />
                  <PlanSelect value={trialPlan} onChange={setTrialPlan} />
                </div>
                <Btn
                  label="Simular trial vencido"
                  loading={loadingDev === 'simulate_trial'}
                  onClick={() =>
                    run('simulate_trial', {
                      username: trialUsername,
                      plan_key: trialPlan,
                    })
                  }
                />
                <ResultBadge result={results['simulate_trial'] ?? null} />
              </SectionCard>

              {/* Restaurar galerias */}
              <SectionCard
                title="Restaurar galerias auto_archived"
                icon={FlaskConical}
              >
                <p className="text-[11px] text-slate-500 leading-snug">
                  Define auto_archived=false. Deixe username em branco para
                  todos os usuários.
                </p>
                <InputField
                  label="Username (opcional)"
                  value={restoreUsername}
                  onChange={setRestoreUsername}
                  placeholder="deixe vazio para todos"
                />
                <Btn
                  label="Restaurar galerias"
                  loading={loadingDev === 'restore_galerias'}
                  onClick={() =>
                    run('restore_galerias', {
                      username: restoreUsername || undefined,
                    })
                  }
                />
                <ResultBadge result={results['restore_galerias'] ?? null} />
              </SectionCard>

              {/* Simular overdue */}
              <SectionCard
                title="Simular atraso de pagamento (overdue)"
                icon={FlaskConical}
              >
                <p className="text-[11px] text-slate-500 leading-snug">
                  Define overdue_since = agora − 5 dias e status=pending. Perfil
                  em trial com vencimento +1 dia.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    label="Username"
                    value={overdueUsername}
                    onChange={setOverdueUsername}
                    placeholder="hitalodiniz"
                  />
                  <PlanSelect value={overduePlan} onChange={setOverduePlan} />
                </div>
                <Btn
                  label="Simular overdue"
                  loading={loadingDev === 'simulate_overdue'}
                  onClick={() =>
                    run('simulate_overdue', {
                      username: overdueUsername,
                      plan_key: overduePlan,
                    })
                  }
                />
                <ResultBadge result={results['simulate_overdue'] ?? null} />
              </SectionCard>

              {/* Revalidar cache dos usuários de teste */}
              <SectionCard
                title="Revalidar cache dos usuários de teste"
                icon={FlaskConical}
              >
                <p className="text-[11px] text-slate-500 leading-snug">
                  Invalida todas as tags de cache dos usuários de teste buscados
                  da tb_profiles.
                </p>
                <Btn
                  label="Revalidar cache"
                  loading={loadingDev === 'revalidate_users'}
                  onClick={() => run('revalidate_users')}
                />
                <ResultBadge result={results['revalidate_users'] ?? null} />
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
