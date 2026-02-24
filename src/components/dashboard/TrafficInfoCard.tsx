import { ShieldCheck, Info } from 'lucide-react';

export function TrafficInfoCard({
  variant = 'full',
  tooltipPosition = 'top', // 'top' ou 'bottom'
}: {
  variant?: 'minimal' | 'full';
  tooltipPosition?: 'top' | 'bottom';
}) {
  const isTop = tooltipPosition === 'top';

  // Componente de Tooltip reutilizável para manter o padrão
  const Tooltip = () => (
    <div
      className={`absolute left-1/2 -translate-x-1/2 w-64 p-3 bg-petroleum text-white text-[11px] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none border border-white/10
      ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'}`}
    >
      <div className="flex gap-2 mb-1.5">
        <Info size={14} className="text-champagne shrink-0" />
        <span className="font-semibold uppercase text-[10px] text-champagne">
          Como funciona?
        </span>
      </div>
      <p className="leading-relaxed text-white/90 font-medium text-start">
        Seus acessos neste navegador não geram estatísticas para não poluir seus
        dados.
      </p>
      <p className="mt-2 text-white italic text-[11px] border-t border-white/10 pt-1.5 text-start">
        Testes em abas anônimas ou em outros navegadores e dispositivos só serão
        filtrados após você realizar login.
      </p>
      {/* Setinha dinâmica baseada na posição */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent 
        ${isTop ? 'top-full border-t-petroleum' : 'bottom-full border-b-petroleum'}`}
      />
    </div>
  );

  if (variant === 'minimal') {
    return (
      <div className="group relative flex items-center gap-2 bg-green-50/80 border border-green-100 px-2 py-1 rounded-md cursor-help transition-all hover:bg-green-100">
        <ShieldCheck size={12} className="text-green-600" />
        <span className="text-[9px] font-semibold text-green-700 uppercase tracking-tighter">
          Filtro de Tráfego Interno
        </span>
        <Tooltip />
      </div>
    );
  }

  return (
    <div className="group relative p-3 bg-white border border-slate-200 rounded-lg border-l-4 border-l-green-500 shadow-sm cursor-help hover:border-green-200 transition-all">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-green-600" />
          <span className="text-[10px] font-semibold uppercase text-petroleum">
            Filtro de Tráfego Interno
          </span>
        </div>
        <Info
          size={14}
          className="text-slate-300 group-hover:text-green-600 transition-colors"
        />
      </div>
      <p className="text-[11px] text-slate-600 leading-tight">
        Seus acessos neste navegador não geram estatísticas para não poluir seus
        dados.
      </p>

      <Tooltip />
    </div>
  );
}
