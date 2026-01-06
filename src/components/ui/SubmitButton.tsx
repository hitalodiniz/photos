// components/DashboardUI/SubmitButton.tsx
'use client';

import { Loader2, Check, Save } from 'lucide-react';
import { useFormStatus } from 'react-dom';

export default function SubmitButton({ success, label = 'Salvar' }) {
  // O React gerencia o 'pending' automaticamente aqui
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || success}
      className={`w-full flex items-center justify-center gap-3 rounded-2xl py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl ${
        success
          ? 'bg-green-600 text-white'
          : pending
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/20'
      }`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
      ) : success ? (
        <Check className="h-5 w-5 animate-in zoom-in duration-300" />
      ) : (
        <Save className="h-4 w-4 text-[#D4AF37]/50" />
      )}
      <span className="font-barlow">
        {pending ? 'Processando...' : success ? 'Concluído' : label}
      </span>
    </button>
  );
}
