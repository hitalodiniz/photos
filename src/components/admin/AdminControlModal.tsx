'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { purgeAllCache } from '@/actions/revalidate.actions';
import {
  quickCleanupTokens,
  fullCleanupTokens,
} from '@/actions/token-cleanup.actions';
import {
  ShieldAlert,
  Zap,
  RefreshCw,
  Database,
  Users,
  Crown,
  Clock,
  FlaskConical,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
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

type Tab = 'sistema' | 'testes';

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// ─── Helper: chamada à rota de dev ───────────────────────────────────────────

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

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
      <Icon size={13} className="text-gold shrink-0" />
      <p className="text-[9px] font-bold uppercase tracking-luxury text-petroleum/60">
        {label}
      </p>
    </div>
  );
}

function ResultBadge({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <div
      className={`flex items-start gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium leading-snug ${
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
      <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-petroleum outline-none focus:border-gold/60 transition-colors"
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
      <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        Plano
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-petroleum outline-none focus:border-gold/60 appearance-none"
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

function ActionButton({
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
      className={`w-full h-9 rounded-lg font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === 'danger'
          ? 'bg-red-100 text-red-700 hover:bg-red-600 hover:text-white'
          : 'bg-champagne text-petroleum hover:bg-petroleum hover:text-white active:scale-[0.98]'
      }`}
    >
      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
      {loading ? (loadingLabel ?? 'Processando…') : label}
    </button>
  );
}

// ─── Abas ─────────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
  showTestes,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  showTestes: boolean;
}) {
  return (
    <div className="flex bg-petroleum border-b border-white/10">
      <button
        onClick={() => onChange('sistema')}
        className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-luxury-widest transition-colors ${
          active === 'sistema'
            ? 'text-gold border-b-2 border-gold'
            : 'text-white/50 hover:text-white'
        }`}
      >
        Sistema
      </button>
      {showTestes && (
        <button
          onClick={() => onChange('testes')}
          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-luxury-widest transition-colors ${
            active === 'testes'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-white/50 hover:text-white'
          }`}
        >
          🧪 Testes
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminControlModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('sistema');

  const isDev = process.env.NODE_ENV !== 'production';

  // ── Estados de loading ────────────────────────────────────────────────────
  const [loadingCache, setLoadingCache] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingTrials, setLoadingTrials] = useState(false);
  const [loadingDowngrades, setLoadingDowngrades] = useState(false);
  const [loadingDev, setLoadingDev] = useState<ResetAction | null>(null);

  // ── Campos dos forms de teste ─────────────────────────────────────────────
  const [setPlanUsername, setSetPlanUsername] = useState('hitalodiniz');
  const [setPlanKey, setSetPlanKey] = useState('PRO');
  const [expiredUsername, setExpiredUsername] = useState('hitalodiniz');
  const [trialUsername, setTrialUsername] = useState('hitalodiniz');
  const [trialPlan, setTrialPlan] = useState('PRO');
  const [restoreUsername, setRestoreUsername] = useState('');
  const [overdueUsername, setOverdueUsername] = useState('hitalodiniz');
  const [overduePlan, setOverduePlan] = useState('PRO');

  // ── Suporte: revalidar usuário em produção ────────────────────────────────
  const [supportUsername, setSupportUsername] = useState('');
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [supportResult, setSupportResult] = useState<ActionResult | null>(null);

  // ── Resultados das actions de teste ──────────────────────────────────────
  const [results, setResults] = useState<
    Partial<Record<ResetAction, ActionResult>>
  >({});

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!isOpen || !mounted) return null;

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
      if (result.success) {
        alert('Cache global invalidado com sucesso!');
        window.location.reload();
        onClose();
      } else {
        alert('Falha ao limpar cache.');
      }
    } finally {
      setLoadingCache(false);
    }
  }

  async function handleExpireTrials() {
    if (
      !confirm(
        'Deseja processar a expiração de todos os trials vencidos agora?',
      )
    )
      return;
    setLoadingTrials(true);
    try {
      const response = await fetch('/api/cron/expire-trials', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ Sucesso!\nTrials processados: ${result.processedCount || 0}`);
        window.location.href = '/dashboard?updated=' + Date.now();
      } else {
        alert(`❌ Erro: ${result.error || 'Falha na rotina'}`);
      }
    } finally {
      setLoadingTrials(false);
    }
  }

  async function handleApplyDowngrades() {
    if (
      !confirm(
        'Deseja aplicar manualmente os downgrades agendados e por inadimplência agora?',
      )
    )
      return;
    setLoadingDowngrades(true);
    try {
      const response = await fetch('/api/cron/apply-downgrades', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`,
        },
      });
      const result = await response.json();
      if (response.ok && result?.ok) {
        alert(
          `✅ Rotina executada!\n` +
            `Processados: ${result.processed || 0}\n` +
            `Ignorados: ${result.skipped || 0}\n` +
            `Ajustes de cota: ${result.quota_adjusted || 0}\n` +
            `Erros: ${result.errors?.length || 0}`,
        );
        window.location.href = '/dashboard?updated=' + Date.now();
      } else {
        alert(`❌ Erro: ${result?.error || 'Falha na rotina de downgrades'}`);
      }
    } finally {
      setLoadingDowngrades(false);
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
      const result = await res.json();
      setSupportResult(result);
    } catch {
      setSupportResult({
        success: false,
        error: 'Erro ao conectar com a API.',
      });
    } finally {
      setLoadingSupport(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Painel Master"
      subtitle="Controle de Sistema"
      headerIcon={<ShieldAlert size={20} strokeWidth={2.5} />}
      topBanner={
        <TabBar active={activeTab} onChange={setActiveTab} showTestes={isDev} />
      }
      maxWidth="2xl"
    >
      {/* ══ ABA SISTEMA ════════════════════════════════════════════════════ */}
      {activeTab === 'sistema' && (
        <div className="space-y-5 pb-2">
          {/* Navegação rápida */}
          <section className="space-y-2">
            <SectionTitle icon={Crown} label="Navegação rápida" />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  router.push('/admin/usuarios');
                  onClose();
                }}
                className="h-10 rounded-lg font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-2 bg-champagne text-petroleum hover:bg-petroleum hover:text-white transition-all"
              >
                <Users size={13} /> Usuários
              </button>
              <button
                onClick={() => {
                  router.push('/admin/planos');
                  onClose();
                }}
                className="h-10 rounded-lg font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-2 bg-champagne text-petroleum hover:bg-petroleum hover:text-white transition-all"
              >
                <Crown size={13} /> Gestão de planos
              </button>
            </div>
          </section>

          {/* Cache */}
          <section className="space-y-2">
            <SectionTitle icon={Zap} label="Cache" />
            <ActionButton
              label="Executar Purge Global"
              loading={loadingCache}
              loadingLabel="Limpando…"
              onClick={handlePurgeCache}
            />
          </section>

          {/* Tokens Google */}
          <section className="space-y-2">
            <SectionTitle icon={Database} label="Tokens Google" />
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                label="Limpeza Rápida"
                loading={loadingTokens}
                onClick={async () => {
                  setLoadingTokens(true);
                  const result = await quickCleanupTokens();
                  setLoadingTokens(false);
                  alert(
                    result.success
                      ? `✅ ${result.message}`
                      : `❌ ${result.message}`,
                  );
                }}
              />
              <ActionButton
                label="Limpeza Completa"
                loading={loadingTokens}
                onClick={async () => {
                  if (!confirm('Executar limpeza completa?')) return;
                  setLoadingTokens(true);
                  const result = await fullCleanupTokens();
                  setLoadingTokens(false);
                  alert(
                    result.success
                      ? `✅ ${result.message}`
                      : `❌ ${result.message}`,
                  );
                }}
              />
            </div>
          </section>

          {/* Manutenção de assinaturas */}
          <section className="space-y-2">
            <SectionTitle icon={Clock} label="Manutenção de Assinaturas" />
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                label="Forçar Expiração de Trials"
                loading={loadingTrials}
                loadingLabel="Processando…"
                onClick={handleExpireTrials}
              />
              <ActionButton
                label="Aplicar Downgrades"
                loading={loadingDowngrades}
                loadingLabel="Aplicando…"
                onClick={handleApplyDowngrades}
              />
            </div>
            <p className="text-[9px] text-center text-petroleum/40 italic">
              * Executa a mesma rotina do Cron Job da Vercel.
            </p>
          </section>

          {/* Suporte: revalidar cache de usuário (disponível em produção) */}
          <section className="space-y-2">
            <SectionTitle
              icon={RefreshCw}
              label="Suporte — Revalidar cache de usuário"
            />
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Invalida todas as tags de cache de um ou mais usuários buscados da
              tb_profiles. Informe usernames separados por vírgula.
            </p>
            <InputField
              label="Username(s)"
              value={supportUsername}
              onChange={setSupportUsername}
              placeholder="hitalodiniz, hitalodiniz80"
            />
            <ActionButton
              label="Revalidar cache"
              loading={loadingSupport}
              loadingLabel="Revalidando…"
              onClick={handleRevalidateUser}
            />
            {supportResult && (
              <div
                className={`flex items-start gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium leading-snug ${
                  supportResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {supportResult.success ? (
                  <CheckCircle2
                    size={12}
                    className="shrink-0 mt-0.5 text-emerald-600"
                  />
                ) : (
                  <XCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                )}
                {supportResult.success
                  ? supportResult.message
                  : supportResult.error}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ══ ABA TESTES (só em dev) ══════════════════════════════════════════ */}
      {activeTab === 'testes' && isDev && (
        <div className="space-y-3 pb-2">
          <div className="flex items-center gap-2 py-1">
            <FlaskConical size={12} className="text-amber-500 shrink-0" />
            <p className="text-[9px] font-bold uppercase tracking-luxury text-amber-600">
              Apenas em desenvolvimento — não disponível em produção
            </p>
          </div>

          {/* Limpar billing + Asaas */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Limpar billing + Asaas sandbox
            </p>
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Cancela assinaturas e cobranças no Asaas (via 3 fontes:
              billing_profiles, upgrade_requests e busca por email), depois
              apaga tb_plan_sync_logs, tb_billing_profiles, tb_upgrade_requests
              e tb_webhook_logs.
            </p>
            <ActionButton
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
          </div>

          {/* Limpar Asaas sandbox (só por customer_id) */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Limpar Asaas sandbox (por customer_id)
            </p>
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Cancela assinaturas e cobranças dos usuários de teste via
              billing_profiles + upgrade_requests + busca por email no Asaas.
              Não altera o banco.
            </p>
            <ActionButton
              label="Limpar Asaas sandbox"
              loading={loadingDev === 'clean_asaas'}
              variant="danger"
              onClick={() => {
                if (
                  !confirm(
                    'Cancelar assinaturas e cobranças dos usuários de teste no Asaas sandbox?',
                  )
                )
                  return;
                run('clean_asaas');
              }}
            />
            <ResultBadge result={results['clean_asaas'] ?? null} />
          </div>

          {/* Remover cobranças soltas (sem depender do banco) */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Remover todas as cobranças do sandbox
            </p>
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Busca e remove <strong>todas</strong> as cobranças diretamente no
              Asaas sandbox, sem depender do banco. Útil para cobranças órfãs de
              testes anteriores.
            </p>
            <ActionButton
              label="Remover cobranças soltas"
              loading={loadingDev === 'clean_asaas_payments'}
              variant="danger"
              onClick={() => {
                if (
                  !confirm(
                    'Remover TODAS as cobranças do Asaas sandbox? Inclui cobranças de todos os clientes.',
                  )
                )
                  return;
                run('clean_asaas_payments');
              }}
            />
            <ResultBadge result={results['clean_asaas_payments'] ?? null} />
          </div>

          {/* Definir plano */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Definir plano de usuário
            </p>
            <div className="grid grid-cols-2 gap-2">
              <InputField
                label="Username"
                value={setPlanUsername}
                onChange={setSetPlanUsername}
                placeholder="hitalodiniz"
              />
              <PlanSelect value={setPlanKey} onChange={setSetPlanKey} />
            </div>
            <ActionButton
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
          </div>

          {/* Simular expirado >7 dias */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Simular assinatura fora da janela de arrependimento
            </p>
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Retrodata processed_at e created_at do upgrade_request para
              2026-02-10 (fora dos 7 dias).
            </p>
            <InputField
              label="Username"
              value={expiredUsername}
              onChange={setExpiredUsername}
              placeholder="hitalodiniz"
            />
            <ActionButton
              label="Simular expirado"
              loading={loadingDev === 'simulate_expired'}
              onClick={() =>
                run('simulate_expired', { username: expiredUsername })
              }
            />
            <ResultBadge result={results['simulate_expired'] ?? null} />
          </div>

          {/* Simular trial vencido */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Simular trial vencido há 1 hora
            </p>
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Define is_trial=true e plan_trial_expires = agora − 1h. Restaura
              galerias auto_archived do usuário.
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
            <ActionButton
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
          </div>

          {/* Restaurar galerias */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Restaurar galerias arquivadas automaticamente
            </p>
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Define auto_archived=false. Deixe username em branco para todos.
            </p>
            <InputField
              label="Username (opcional)"
              value={restoreUsername}
              onChange={setRestoreUsername}
              placeholder="deixe vazio para todos"
            />
            <ActionButton
              label="Restaurar galerias"
              loading={loadingDev === 'restore_galerias'}
              onClick={() =>
                run('restore_galerias', {
                  username: restoreUsername || undefined,
                })
              }
            />
            <ResultBadge result={results['restore_galerias'] ?? null} />
          </div>

          {/* Simular overdue */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Simular atraso de pagamento (overdue)
            </p>
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Define overdue_since = agora − 5 dias e status=pending. Perfil em
              trial ativo com vencimento em +1 dia.
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
            <ActionButton
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
          </div>

          {/* Revalidar cache dos usuários de teste */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] font-semibold text-petroleum">
              Revalidar cache dos usuários de teste
            </p>
            <p className="text-[10px] text-petroleum/50 leading-snug">
              Invalida todas as tags de cache (perfil público, privado, galerias
              e categorias) dos usuários de teste buscados da tb_profiles.
            </p>
            <ActionButton
              label="Revalidar cache"
              loading={loadingDev === 'revalidate_users'}
              onClick={() => run('revalidate_users')}
            />
            <ResultBadge result={results['revalidate_users'] ?? null} />
          </div>
        </div>
      )}
    </BaseModal>
  );
}
