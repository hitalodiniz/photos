'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 🎯 Importação necessária
import { purgeAllCache } from '@/actions/revalidate.actions';
import { Trash2, X, ShieldAlert, Zap } from 'lucide-react';

export default function AdminControlModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
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
      {/* Backdrop com desfoque fixo no topo de tudo */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-red-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} />
            <h2 className="font-bold uppercase text-xs tracking-widest">
              Painel Master
            </h2>
          </div>
          <button
            onClick={onClose}
            className="hover:rotate-90 transition-transform p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 text-center">
          <div className="inline-flex p-4 bg-red-50 rounded-full text-red-600 mb-2">
            <Zap size={32} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Limpeza Total</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
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
              }
            }}
            disabled={isSyncing}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all
              ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-lg shadow-red-200'}
            `}
          >
            <Trash2 size={16} />
            {isSyncing ? 'Processando...' : 'Executar Purge Global'}
          </button>
        </div>
      </div>
    </div>,
    document.body, // 🎯 Renderiza no final do body, fora da hierarquia do dashboard
  );
}
