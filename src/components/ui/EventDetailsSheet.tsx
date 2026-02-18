'use client';
import {
  X,
  Monitor,
  Smartphone,
  Globe,
  MapPin,
  CalendarDays,
} from 'lucide-react';

export function EventDetailsSheet({
  event,
  onClose,
}: {
  event: any;
  onClose: () => void;
}) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-petroleum/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-luxury text-petroleum">
              Detalhes do Evento
            </h4>
            <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
              {event.event_label || 'Atividade Registrada'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-petroleum" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <p className="text-[9px] font-semibold text-gold uppercase tracking-widest mb-4">
              Informações de Acesso
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-luxury border border-slate-100">
                <p className="text-[8px] text-slate-400 font-semibold uppercase mb-1">
                  Data/Hora
                </p>
                <p className="text-[11px] font-semibold text-petroleum">
                  {new Date(event.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-luxury border border-slate-100">
                <p className="text-[8px] text-slate-400 font-semibold uppercase mb-1">
                  Endereço IP
                </p>
                <p className="text-[11px] font-semibold text-petroleum font-mono">
                  {event.visitor_id}
                </p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[9px] font-semibold text-gold uppercase tracking-widest mb-4">
              Dispositivo e Navegador
            </p>
            <div className="space-y-2">
              {[
                { label: 'Tipo', val: event.device_info?.type, icon: Monitor },
                {
                  label: 'Sistema',
                  val: event.device_info?.os,
                  icon: Smartphone,
                },
                {
                  label: 'Browser',
                  val: event.device_info?.browser,
                  icon: Globe,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border-b border-slate-50"
                >
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {item.label}
                  </span>
                  <span className="text-[11px] font-semibold text-petroleum uppercase flex items-center gap-2">
                    <item.icon size={12} className="text-gold" />{' '}
                    {item.val || '---'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {event.metadata && (
            <section>
              <p className="text-[9px] font-semibold text-gold uppercase tracking-widest mb-4">
                Metadados Brutos (Logs)
              </p>
              <div className="p-4 bg-petroleum rounded-luxury text-champagne font-mono text-[10px] overflow-x-auto whitespace-pre">
                {JSON.stringify(event.metadata, null, 2)}
              </div>
            </section>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 italic">
            Capturado via inteligência de rastreio
          </p>
        </div>
      </div>
    </div>
  );
}
