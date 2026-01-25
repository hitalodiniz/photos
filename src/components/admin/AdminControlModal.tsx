'use client';

import { useState, useEffect } from 'react';
import { purgeAllCache } from '@/actions/revalidate.actions';
import { quickCleanupTokens, fullCleanupTokens } from '@/actions/token-cleanup.actions';
import { Trash2, ShieldAlert, Zap, RefreshCw, Database } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'cache' | 'tokens'>('cache');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const headerIcon = <ShieldAlert size={20} strokeWidth={2.5} />;

  const tabs = (
    <div className="flex bg-petroleum border-b border-white/10">
      <button
        onClick={() => setActiveTab('cache')}
        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          activeTab === 'cache'
            ? 'text-champagneborder-b-2 border-[#D4AF37]'
            : 'text-white/60 hover:text-white'
        }`}
      >
        Cache
      </button>
      <button
        onClick={() => setActiveTab('tokens')}
        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          activeTab === 'tokens'
            ? 'text-champagneborder-b-2 border-[#D4AF37]'
            : 'text-white/60 hover:text-white'
        }`}
      >
        Tokens
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
        {/* Cache Tab */}
        {activeTab === 'cache' && (
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 bg-petroleum/5 rounded-full text-champagneborder border-petroleum/10">
              <Zap size={24} strokeWidth={2.5} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-petroleum">Limpeza de Cache</h3>
              <p className="text-[10px] text-petroleum/40 mt-1 leading-relaxed font-bold uppercase tracking-luxury">
                Esta ação removerá o cache de todas as galerias.
              </p>
            </div>

            <button
              onClick={async () => {
                setIsSyncing(true);
                const result = await purgeAllCache();
                setIsSyncing(false);
                if (result.success) {
                  alert(result.message);
                  onClose();
                  window.location.reload();
                } else {
                  alert(`Erro: ${result.error || 'Falha ao limpar cache'}`);
                }
              }}
              disabled={isSyncing}
              className={`w-full h-11 rounded-luxury font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all
                ${isSyncing 
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

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="inline-flex p-3 bg-petroleum/5 rounded-full text-champagneborder border-petroleum/10">
                <Database size={24} strokeWidth={2.5} fill="currentColor" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-petroleum">Tokens Google</h3>
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
                      result.message
                    );
                  } else {
                    alert(`❌ Erro: ${result.message}`);
                  }
                }}
                disabled={isCleaningTokens}
                className={`w-full h-10 rounded-luxury font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all
                  ${isCleaningTokens 
                    ? 'bg-slate-100 text-petroleum/40 cursor-not-allowed' 
                    : 'bg-champagne text-petroleum hover:bg-petroleum hover:text-white active:scale-95'
                  }
                `}
              >
                <RefreshCw size={14} strokeWidth={2.5} className={isCleaningTokens ? 'animate-spin' : ''} />
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
                      result.message
                    );
                  } else {
                    alert(`❌ Erro: ${result.message}`);
                  }
                }}
                disabled={isCleaningTokens}
                className={`w-full h-11 rounded-luxury font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all
                  ${isCleaningTokens 
                    ? 'bg-slate-100 text-petroleum/40 cursor-not-allowed' 
                    : 'bg-champagne text-petroleum hover:bg-petroleum hover:text-white active:scale-95 shadow-lg shadow-champagne/10'
                  }
                `}
              >
                <RefreshCw size={14} strokeWidth={2.5} className={isCleaningTokens ? 'animate-spin' : ''} />
                {isCleaningTokens ? 'Validando...' : 'Limpeza Completa'}
              </button>
            </div>

            <div className="pt-3 border-t border-petroleum/10">
              <p className="text-[8px] text-petroleum/30 text-center leading-relaxed font-bold uppercase tracking-luxury">
                <strong className="text-petroleum/40">Rápida:</strong> Veloz • <strong className="text-petroleum/40">Completa:</strong> Lento
              </p>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
