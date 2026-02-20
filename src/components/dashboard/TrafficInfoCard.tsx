// components/dashboard/TrafficInfoCard.tsx
import { ShieldCheck, Info } from 'lucide-react';

export function TrafficInfoCard({
  variant = 'full',
}: {
  variant?: 'minimal' | 'full';
}) {
  if (variant === 'minimal') {
    return (
      <div className="group relative flex items-center gap-2 bg-green-50/80 border border-green-100 px-2 py-1 rounded-md cursor-help transition-all hover:bg-green-100">
        <ShieldCheck size={12} className="text-green-600" />
        <span className="text-[9px] font-semibold text-green-700 uppercase tracking-tighter">
          Filtro de Inteligência de Tráfego Interno Ativo
        </span>

        {/* Balão de Informação (Tooltip via CSS puro para baixo custo) */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-petroleum text-white text-[11px] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
          <div className="flex gap-2 mb-1.5">
            <Info size={14} className="text-champagne shrink-0" />
            <span className="font-semibold uppercase text-[10px] text-champagne">
              Como funciona?
            </span>
          </div>
          <p className="leading-relaxed text-white/90 font-medium text-start">
            Seus acessos neste navegador não geram estatísticas para não poluir
            seus dados.
          </p>
          <p className="mt-2 text-white/ italic text-[10px] border-t border-white/10 pt-1.5 text-start">
            Testes em abas anônimas ou em outros navegadores e dispositivos só
            serão filtrados após você realizar login no dashboard por eles.{' '}
          </p>
          {/* Setinha do balão */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-petroleum"></div>
        </div>
      </div>
    );
  }

  // Versão Full para relatórios (se desejar manter)
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg border-l-4 border-l-green-500">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={14} className="text-green-600" />
        <span className="text-[10px] font-semibold uppercase text-petroleum">
          Filtro de Tráfego Interno
        </span>
      </div>
      <p className="text-[11px] text-slate-600 leading-tight">
        Seus acessos não são contabilizados neste navegador para garantir a
        precisão do BI.
      </p>
    </div>
  );
}
