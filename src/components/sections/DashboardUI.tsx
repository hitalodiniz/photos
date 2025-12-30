'use client';

import { useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

// =========================================================================
// 1. SubmitButton (Estilo Champanhe Editorial - Unificado)
// =========================================================================

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? (
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin h-4 w-4 text-slate-900" />
          <span>Processando</span>
        </div>
      ) : (
        <>
          <Plus size={16} strokeWidth={3} className="text-slate-900" />
          <span>Criar Galeria</span>
        </>
      )}
    </button>
  );
}

// =========================================================================
// 2. Toast (Snackbar com detalhes em Dourado/Slate)
// =========================================================================

export function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] min-w-[320px] md:min-w-[550px] max-w-[90vw] 
    pointer-events-none animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div
        className={`
        flex items-center justify-between gap-4 p-5 rounded-2xl shadow-2xl border pointer-events-auto
        ${
          type === 'success'
            ? 'bg-slate-900 border-white/5 text-white'
            : 'bg-red-600 border-white/5 text-white'
        }
      `}
      >
        <div className="flex items-center gap-4">
          {type === 'success' ? (
            <CheckCircle2 size={30} className="text-[#F3E5AB]" />
          ) : (
            <AlertCircle size={30} className="text-white" />
          )}
          <span className="text-lg font-bold tracking-tight">{message}</span>
        </div>

        <button
          onClick={onClose}
          className="text-base font-bold uppercase tracking-widest text-[#F3E5AB]/70 hover:text-[#F3E5AB]"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 3. ConfirmationModal (Luxo Elevation - Ajustado)
// =========================================================================

export function ConfirmationModal({
  galeria,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: any) {
  if (!isOpen || !galeria) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white p-8 md:p-10 rounded-[32px] shadow-2xl max-w-sm w-full border border-white/20">
        {/* Cabeçalho Horizontal */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
            <Trash2 size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Excluir galeria?
          </h3>
        </div>

        {/* Texto com quebra após a interrogação */}
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          Tem certeza que deseja excluir <strong>{galeria.title}</strong>?<br />
          Esta ação removerá permanentemente todos os acessos.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onConfirm(galeria.id)}
            disabled={isDeleting}
            className="w-full py-5 text-xs font-black uppercase tracking-[0.2em] text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="animate-spin mx-auto" size={18} />
            ) : (
              'Confirmar Exclusão'
            )}
          </button>

          {/* Botão Cancelar com Borda e Estilo Padronizado */}
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-full py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:text-slate-700 rounded-2xl transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
