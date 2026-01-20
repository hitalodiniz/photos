'use client';

import { Loader2, Check, Save } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  success: boolean;
  label?: string;
  form?: string; // Permite vincular ao formulário fora do escopo direto
  className?: string; // Permite customização adicional de classes
}

export default function SubmitButton({
  success,
  label = 'Salvar',
  form,
  className = '',
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
        w-full group relative flex items-center justify-center gap-3
        text-xs font-bold uppercase tracking-widest transition-all duration-300
        active:scale-95 overflow-hidden
        ${
          success
            ? 'bg-green-500 text-white shadow-green-200 h-11 rounded-[0.5rem]'
            : pending
              ? 'bg-white/10 text-white/40 cursor-wait border border-white/10 h-11 rounded-[0.5rem]'
              : 'bg-[#F3E5AB] text-black hover:bg-[#F3E5AB]/90 h-12 rounded-xl shadow-[0_0_15px_rgba(243,229,171,0.3)]'
        }
        ${className}
      `}
    >
      {/* Efeito de Brilho no Hover (Luxo) */}
      <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-20deg] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-black" strokeWidth={2.5} />
        ) : success ? (
          <Check className="h-4 w-4 animate-in zoom-in duration-500" strokeWidth={2.5} />
        ) : (
          <Save className="h-4 w-4 opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300" strokeWidth={2.5} />
        )}

        <span>
          {pending ? 'Processando...' : success ? 'Salvo com Sucesso' : label}
        </span>
      </div>
    </button>
  );
}
