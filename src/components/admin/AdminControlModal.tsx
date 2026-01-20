'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 🎯 Importação necessária
import { purgeAllCache, revalidateUserGalerias } from '@/actions/revalidate.actions';
import { quickCleanupTokens, fullCleanupTokens } from '@/actions/token-cleanup.actions';
import { getAuthAndStudioIds } from '@/core/services/auth-context.service';
import { Trash2, X, ShieldAlert, Zap, RefreshCw, Database } from 'lucide-react';

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

  // 🎯 Garante que o Portal só seja criado no lado do cliente
  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Trava o scroll do fundo
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // 🎯 O Portal renderiza o conteúdo diretamente no <body>
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop com desfoque fixo no topo de tudo - MODAL DARK */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Card - MODAL DARK: Fundo #1E293B, bordas white/10 */}
      <div className="relative bg-[#1E293B] rounded-3xl w-full max-w-md shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-white flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} strokeWidth={2.5} className="text-[#D4AF37]" />
            <h2 className="font-semibold uppercase text-xs tracking-widest text-white">
              Painel Master
            </h2>
          </div>
          <button
            onClick={onClose}
            className="hover:rotate-90 transition-transform p-1 text-white/80 hover:text-white"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tabs - MODAL DARK */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('cache')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
              activeTab === 'cache'
                ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Cache
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
              activeTab === 'tokens'
                ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Tokens
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Cache Tab */}
          {activeTab === 'cache' && (
            <div className="text-center space-y-6">
              <div className="inline-flex p-4 bg-white/5 rounded-full text-[#D4AF37] mb-2 border border-white/10">
                <Zap size={32} strokeWidth={2.5} fill="currentColor" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Limpeza de Cache</h3>
                <p className="text-xs text-white/70 mt-2 leading-relaxed font-medium">
                  Esta ação removerá o cache de **todas as galerias** de **todos os
                  usuários**. Útil para atualizações de sistema ou correção de erros
                  de token globais.
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
                className={`w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all
                  ${isSyncing 
                    ? 'bg-white/10 text-white/40 cursor-not-allowed' 
                    : 'bg-[#F3E5AB] text-black hover:bg-[#F3E5AB]/90 active:scale-95 shadow-[0_0_15px_rgba(243,229,171,0.3)]'
                  }
                `}
              >
                <Trash2 size={16} strokeWidth={2.5} />
                {isSyncing ? 'Processando...' : 'Executar Purge Global'}
              </button>
            </div>
          )}

          {/* Tokens Tab */}
          {activeTab === 'tokens' && (
            <div className="space-y-6">
              <div className="inline-flex p-4 bg-white/5 rounded-full text-[#D4AF37] mb-2 mx-auto border border-white/10">
                <Database size={32} strokeWidth={2.5} fill="currentColor" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">Limpeza de Tokens Google</h3>
                <p className="text-xs text-white/70 mt-2 leading-relaxed font-medium">
                  Remove tokens expirados e inválidos do banco de dados. Isso permite que
                  usuários renovem seus tokens na próxima tentativa de uso.
                </p>
              </div>

              <div className="space-y-3">
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
                      if (result.errors.length > 0) {
                        console.error('Erros durante limpeza:', result.errors);
                      }
                    } else {
                      alert(`❌ Erro: ${result.message}`);
                      if (result.errors.length > 0) {
                        console.error('Erros:', result.errors);
                      }
                    }
                  }}
                  disabled={isCleaningTokens}
                  className={`w-full h-11 rounded-[0.5rem] font-semibold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all
                    ${isCleaningTokens 
                      ? 'bg-white/10 text-white/40 cursor-not-allowed' 
                      : 'bg-[#F3E5AB] text-black hover:bg-[#F3E5AB]/90 active:scale-95'
                    }
                  `}
                >
                  <RefreshCw size={14} strokeWidth={2.5} className={isCleaningTokens ? 'animate-spin' : ''} />
                  {isCleaningTokens ? 'Processando...' : 'Limpeza Rápida'}
                </button>

                <button
                  onClick={async () => {
                    if (!confirm(
                      '⚠️ Limpeza Completa\n\n' +
                      'Isso validará TODOS os refresh tokens fazendo chamadas ao Google.\n' +
                      'Pode demorar alguns minutos dependendo do número de usuários.\n\n' +
                      'Deseja continuar?'
                    )) {
                      return;
                    }

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
                      if (result.errors.length > 0) {
                        console.error('Erros durante limpeza:', result.errors);
                      }
                    } else {
                      alert(`❌ Erro: ${result.message}`);
                      if (result.errors.length > 0) {
                        console.error('Erros:', result.errors);
                      }
                    }
                  }}
                  disabled={isCleaningTokens}
                  className={`w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all
                    ${isCleaningTokens 
                      ? 'bg-white/10 text-white/40 cursor-not-allowed' 
                      : 'bg-[#F3E5AB] text-black hover:bg-[#F3E5AB]/90 active:scale-95 shadow-[0_0_15px_rgba(243,229,171,0.3)]'
                    }
                  `}
                >
                  <RefreshCw size={14} strokeWidth={2.5} className={isCleaningTokens ? 'animate-spin' : ''} />
                  {isCleaningTokens ? 'Validando...' : 'Limpeza Completa (Valida Todos)'}
                </button>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/60 text-center leading-relaxed font-medium">
                  <strong className="text-white/80">Limpeza Rápida:</strong> Remove tokens expirados sem validar (rápido)<br />
                  <strong className="text-white/80">Limpeza Completa:</strong> Valida todos os tokens ativos (mais lento, mais preciso)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body, // 🎯 Renderiza no final do body, fora da hierarquia do dashboard
  );
}
