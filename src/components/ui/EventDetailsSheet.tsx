'use client';
import { useMemo } from 'react';
import {
  X,
  Monitor,
  Smartphone,
  Globe,
  MapPin,
  History,
  MousePointer2,
  Download,
  Share2,
  UserCheck,
} from 'lucide-react';

export function EventDetailsSheet({
  event,
  allEvents = [], // 🎯 Recebe a lista completa para filtrar a jornada
  onClose,
}: {
  event: any;
  allEvents?: any[];
  onClose: () => void;
}) {
  const visitorJourney = useMemo(() => {
    if (!event || !allEvents.length) return [];
    return allEvents
      .filter((e) => e.visitor_id === event.visitor_id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [event, allEvents]);

  if (!event) return null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'view':
        return <MousePointer2 size={12} className="text-blue-500" />;
      case 'download':
        return <Download size={12} className="text-gold" />;
      case 'share':
        return <Share2 size={12} className="text-purple-500" />;
      case 'lead':
        return <UserCheck size={12} className="text-green-500" />;
      default:
        return <History size={12} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-petroleum/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-luxury text-petroleum">
              Jornada do Visitante
            </h4>
            <p className="text-[10px] text-slate-400 font-medium uppercase mt-1 font-mono">
              {event.visitor_id}
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
          {/* TIMELINE DA JORNADA */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <History size={14} className="text-gold" />
              <p className="text-[9px] font-semibold text-petroleum uppercase tracking-widest">
                Linha do Tempo
              </p>
            </div>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-[11px] before:w-[1px] before:bg-slate-100 before:h-full">
              {visitorJourney.map((step, idx) => (
                <div
                  key={idx}
                  className={`relative pl-8 flex flex-col gap-0.5 ${step.id === event.id ? 'opacity-100' : 'opacity-60'}`}
                >
                  <div
                    className={`absolute left-0 w-[24px] h-[24px] rounded-full border bg-white flex items-center justify-center z-10 ${step.id === event.id ? 'border-gold shadow-sm' : 'border-slate-100'}`}
                  >
                    {getEventIcon(step.event_type)}
                  </div>
                  <p className="text-[10px] font-bold text-petroleum uppercase">
                    {step.event_type === 'lead'
                      ? 'Cadastro Realizado'
                      : step.event_label}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">
                    {new Date(step.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* DADOS TÉCNICOS (Origem do último acesso) */}
          <section className="pt-6 border-t border-slate-100">
            <p className="text-[9px] font-semibold text-petroleum uppercase tracking-widest mb-4">
              Dispositivo Vinculado
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'SO', val: event.device_info?.os, icon: Monitor },
                {
                  label: 'Browser',
                  val: event.device_info?.browser,
                  icon: Globe,
                },
                {
                  label: 'Tipo',
                  val: event.device_info?.type,
                  icon: Smartphone,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center text-center"
                >
                  <item.icon size={12} className="text-slate-400 mb-2" />
                  <span className="text-[8px] font-bold text-slate-400 uppercase">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-bold text-petroleum truncate w-full">
                    {item.val || '---'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 italic">
            ID Único de Sessão: {event.visitor_id}
          </p>
        </div>
      </div>
    </div>
  );
}
