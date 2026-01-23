'use client';

import { Loader2, Check } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  success: boolean;
  label?: string;
  form?: string; // Permite vincular ao formulário fora do escopo direto
  className?: string; // Permite customização adicional de classes
  disabled?: boolean; // Permite desabilitar externamente
  icon?: React.ReactNode;
}

export default function SubmitButton({
  success,
  label = 'Salvar',
  form,
  className = '',
  disabled = false,
  icon,
}: SubmitButtonProps) {
  // O hook useFormStatus funciona se o botão estiver DENTRO de um <form>
  // Como estamos usando o botão no rodapé, dependemos também da prop 'pending' externa ou do ID do form
  const { pending } = useFormStatus();
  const isPending = pending || disabled;

  return (
    <button
      type="submit"
      form={form} // Crucial para disparar o formulário que está no corpo do modal
      disabled={isPending || success}
      className={`
        group relative flex items-center justify-center gap-2
        text-[10px] md:text-[11px] font-semibold uppercase tracking-luxury transition-all duration-300
        active:scale-[0.98] overflow-hidden
        ${
          success
            ? 'bg-green-500 text-white shadow-green-200 h-10 rounded-luxury'
            : isPending
              ? 'bg-slate-200 text-slate-400 cursor-wait border border-slate-300 h-10 rounded-luxury'
              : 'bg-champagne text-black hover:bg-white hover:border-champagne border border-champagne h-10 rounded-luxury shadow-sm'
        }
        ${className}
      `}
    >
      {/* Efeito de Brilho no Hover (apenas quando não está em loading/success) */}
      {!isPending && !success && (
        <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-20deg] -translate-x-full group-hover:translate-x-full group-hover:transition-transform group-hover:duration-1000 pointer-events-none" />
      )}

      <div className="relative z-10 flex items-center gap-2">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
        ) : success ? (
          <Check className="h-3.5 w-3.5 animate-in zoom-in duration-500" strokeWidth={2.5} />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}

        <span>
          {isPending ? 'Salvando...' : success ? 'Salvo!' : label}
        </span>
      </div>
    </button>
  );
}
