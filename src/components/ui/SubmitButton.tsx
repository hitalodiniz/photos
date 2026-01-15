'use client';

import { Loader2, Check, Save } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  success: boolean;
  label?: string;
  form?: string; // Permite vincular ao formulário fora do escopo direto
}

export default function SubmitButton({
  success,
  label = 'Salvar',
  form,
}: SubmitButtonProps) {
  // O hook useFormStatus funciona se o botão estiver DENTRO de um <form>
  // Como estamos usando o botão no rodapé, dependemos também da prop 'pending' externa ou do ID do form
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      form={form} // Crucial para disparar o formulário que está no corpo do modal
      disabled={pending || success}
      className={`
        w-full group relative flex items-center justify-center gap-3 rounded-[0.5rem] h-10 py-4 
        text-[10px] font-semibold uppercase tracking-wider transition-all duration-500
        active:scale-[0.97] shadow-2xl overflow-hidden
        ${
          success
            ? 'bg-green-500 text-white shadow-green-200'
            : pending
              ? 'bg-slate-50 text-slate-300 cursor-wait border border-slate-100'
              : 'bg-champagne-dark text-slate-900 hover:bg-slate-900 hover:text-white shadow-[#D4AF37]/20'
        }
      `}
    >
      {/* Efeito de Brilho no Hover (Luxo) */}
      <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-20deg] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
        ) : success ? (
          <Check className="h-4 w-4 animate-in zoom-in duration-500" />
        ) : (
          <Save className="h-4 w-4 opacity-40 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300" />
        )}

        <span className="font-barlow">
          {pending ? 'Processando...' : success ? 'Salvo com Sucesso' : label}
        </span>
      </div>
    </button>
  );
}
