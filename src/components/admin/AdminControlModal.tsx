'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { purgeAllCache } from '@/actions/revalidate.actions';
import {
  quickCleanupTokens,
  fullCleanupTokens,
} from '@/actions/token-cleanup.actions';
import {
  Trash2,
  ShieldAlert,
  Zap,
  RefreshCw,
  Database,
  Users,
  Crown,
  Clock,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';

export default function AdminControlModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCleaningTokens, setIsCleaningTokens] = useState(false);
  const [isExpiringTrials, setIsExpiringTrials] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'painel' | 'cache' | 'tokens' | 'sistema'
  >('painel');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handlePurgeCache = async () => {
    setIsSyncing(true);
    try {
      const result = await purgeAllCache();

      if (result.success) {
        // Fallback para mensagem caso result.message seja undefined
        alert(result.message || 'Cache global invalidado com sucesso!');
        window.location.reload();
        onClose();
      } else {
        alert('Falha ao limpar cache.');
      }
    } catch (error) {
      alert('Erro crítico na requisição de limpeza.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExpireTrials = async () => {
    if (
      !confirm(
        'Deseja processar a expiração de todos os trials vencidos agora?',
      )
    )
      return;

    setIsExpiringTrials(true);
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

        // 🎯 Truque para forçar o Next.js a ignorar o cache local do navegador
        window.location.href = '/dashboard?updated=' + Date.now();
      } else {
        alert(`❌ Erro: ${result.error || 'Falha na rotina'}`);
      }
    } catch (error) {
      alert('❌ Erro crítico ao conectar com a API de Cron.');
    } finally {
      setIsExpiringTrials(false);
    }
  };

  const headerIcon = <ShieldAlert size={20} strokeWidth={2.5} />;

  const tabs = (
    <div className="flex bg-petroleum border-b border-white/10">
      <button
        onClick={() => setActiveTab('painel')}
        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-luxury-widest transition-colors ${
          activeTab === 'painel'
            ? 'text-gold border-b-2 border-gold'
            : 'text-white/60 hover:text-white'
        }`}
      >
        Painel
      </button>
      <button
        onClick={() => setActiveTab('cache')}
        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-luxury-widest transition-colors ${
          activeTab === 'cache'
            ? 'text-gold border-b-2 border-gold'
            : 'text-white/60 hover:text-white'
        }`}
      >
        Cache
      </button>
      <button
        onClick={() => setActiveTab('tokens')}
        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-luxury-widest transition-colors ${
          activeTab === 'tokens'
            ? 'text-gold border-b-2 border-gold'
            : 'text-white/60 hover:text-white'
        }`}
      >
        Tokens
      </button>
      <button
        onClick={() => setActiveTab('sistema')}
        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-luxury-widest transition-colors ${
          activeTab === 'sistema'
            ? 'text-gold border-b-2 border-gold'
            : 'text-white/60 hover:text-white'
        }`}
      >
        Sistema
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Painel Master"
      subtitle="Controle de Sistema"
      headerIcon={headerIcon}
      topBanner={tabs}
      maxWidth="md"
    >
      <div className="space-y-4">
        {activeTab === 'painel' && (
          <div className="space-y-3">
            <p className="text-[10px] text-petroleum/60 font-bold uppercase tracking-luxury">
              Navegação rápida
            </p>
            <a
              href="/admin/usuarios"
              onClick={(e) => {
                e.preventDefault();
                router.push('/admin/usuarios');
                onClose();
              }}
              className="w-full h-11 rounded-luxury font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-3 bg-champagne text-petroleum hover:bg-petroleum hover:text-white active:scale-[0.98] transition-all"
            >
              <Users size={14} strokeWidth={2.5} />
              Usuários
            </a>
            <a
              href="/admin/planos"
              onClick={(e) => {
                e.preventDefault();
                router.push('/admin/planos');
                onClose();
              }}
              className="w-full h-11 rounded-luxury font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-3 bg-champagne text-petroleum hover:bg-petroleum hover:text-white active:scale-[0.98] transition-all"
            >
              <Crown size={14} strokeWidth={2.5} />
              Gestão de planos
            </a>
          </div>
        )}

        {activeTab === 'cache' && (
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 bg-petroleum/5 rounded-full text-champagneborder border-petroleum/10">
              <Zap size={24} strokeWidth={2.5} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-petroleum">
                Limpeza de Cache
              </h3>
              <p className="text-[10px] text-petroleum/40 mt-1 leading-relaxed font-bold uppercase tracking-luxury">
                Esta ação removerá o cache de todas as galerias.
              </p>
            </div>

            <button
              onClick={handlePurgeCache}
              disabled={isSyncing}
              className={`w-full h-11 rounded-luxury font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-3 transition-all
                ${
                  isSyncing
                    ? 'bg-slate-100 text-petroleum/40 cursor-not-allowed'
                    : 'bg-champagne text-petroleum hover:bg-petroleum hover:text-white active:scale-95 shadow-lg shadow-champagne/10'
                }
              `}
            >
              <Trash2 size={14} strokeWidth={2.5} />
              {isSyncing ? 'Processando...' : 'Executar Purge Global'}
            </button>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="inline-flex p-3 bg-petroleum/5 rounded-full text-champagneborder border-petroleum/10">
                <Database size={24} strokeWidth={2.5} fill="currentColor" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-petroleum">
                Tokens Google
              </h3>
              <p className="text-[10px] text-petroleum/40 mt-1 leading-relaxed font-bold uppercase tracking-luxury">
                Gerenciamento de tokens do banco de dados.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={async () => {
                  setIsCleaningTokens(true);
                  const result = await quickCleanupTokens();
                  setIsCleaningTokens(false);
                  if (result.success) {
                    alert(
                      `✅ Limpeza concluída!\n\n` +
                        `• ${result.cleaned} token(s) removido(s)\n` +
                        `• ${result.validated} token(s) validado(s)\n` +
                        `• ${result.failed} erro(s)\n\n` +
                        result.message,
                    );
                  } else {
                    alert(`❌ Erro: ${result.message}`);
                  }
                }}
                disabled={isCleaningTokens}
                className={`w-full h-10 rounded-luxury font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-3 transition-all
                  ${
                    isCleaningTokens
                      ? 'bg-slate-100 text-petroleum/40 cursor-not-allowed'
                      : 'bg-champagne text-petroleum hover:bg-petroleum hover:text-white active:scale-95'
                  }
                `}
              >
                <RefreshCw
                  size={14}
                  strokeWidth={2.5}
                  className={isCleaningTokens ? 'animate-spin' : ''}
                />
                {isCleaningTokens ? 'Processando...' : 'Limpeza Rápida'}
              </button>

              <button
                onClick={async () => {
                  if (!confirm('Deseja executar a limpeza completa?')) return;
                  setIsCleaningTokens(true);
                  const result = await fullCleanupTokens();
                  setIsCleaningTokens(false);
                  if (result.success) {
                    alert(
                      `✅ Limpeza completa concluída!\n\n` +
                        `• ${result.cleaned} token(s) removido(s)\n` +
                        `• ${result.validated} token(s) validado(s)\n` +
                        `• ${result.failed} erro(s)\n\n` +
                        result.message,
                    );
                  } else {
                    alert(`❌ Erro: ${result.message}`);
                  }
                }}
                disabled={isCleaningTokens}
                className={`w-full h-11 rounded-luxury font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-3 transition-all
                  ${
                    isCleaningTokens
                      ? 'bg-slate-100 text-petroleum/40 cursor-not-allowed'
                      : 'bg-champagne text-petroleum hover:bg-petroleum hover:text-white active:scale-95 shadow-lg shadow-champagne/10'
                  }
                `}
              >
                <RefreshCw
                  size={14}
                  strokeWidth={2.5}
                  className={isCleaningTokens ? 'animate-spin' : ''}
                />
                {isCleaningTokens ? 'Validando...' : 'Limpeza Completa'}
              </button>
            </div>
          </div>
        )}
        {activeTab === 'sistema' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="inline-flex p-3 bg-petroleum/5 rounded-full text-champagne border border-petroleum/10">
                <Clock
                  size={24}
                  strokeWidth={2.5}
                  className={isExpiringTrials ? 'animate-pulse' : ''}
                />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-petroleum">
                Manutenção de Assinaturas
              </h3>
              <p className="text-[10px] text-petroleum/40 mt-1 leading-relaxed font-bold uppercase tracking-luxury">
                Rotinas de verificação de planos e períodos de teste.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleExpireTrials}
                disabled={isExpiringTrials}
                className={`w-full h-11 rounded-luxury font-bold uppercase tracking-luxury-widest text-[10px] flex items-center justify-center gap-3 transition-all
          ${
            isExpiringTrials
              ? 'bg-slate-100 text-petroleum/40 cursor-not-allowed'
              : 'bg-gold text-petroleum hover:bg-petroleum hover:text-white active:scale-95 shadow-lg shadow-gold/10'
          }
        `}
              >
                <RefreshCw
                  size={14}
                  className={isExpiringTrials ? 'animate-spin' : ''}
                />
                {isExpiringTrials
                  ? 'Processando Downgrades...'
                  : 'Forçar Expiração de Trials'}
              </button>

              <p className="text-[9px] text-center text-petroleum/40 italic">
                * Esta ação executa a mesma rotina do Cron Job da Vercel.
              </p>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
