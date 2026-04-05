// src/components/ui/EventDetailsSheet.tsx
'use client';

import { Monitor, Smartphone, Globe, MapPin, Activity } from 'lucide-react';
import { Sheet, SheetSection, SheetFooter } from '@/components/ui/Sheet';

export function EventDetailsSheet({
  event,
  onClose,
}: {
  event: any;
  onClose: () => void;
}) {
  return (
    <Sheet
      isOpen={!!event}
      onClose={onClose}
      title="Detalhes do Evento"
      subtitle={event?.event_label || 'Atividade Registrada'}
      icon={<Activity size={18} strokeWidth={2.5} />}
      headerClassName="bg-petroleum"
      maxWidth="md"
      position="right"
      footer={
        <SheetFooter className="bg-slate-50 border-t border-slate-100">
          <p className="text-[9px] text-slate-400 italic">
            Capturado via inteligência de rastreio
          </p>
        </SheetFooter>
      }
    >
      {event && (
        <>
          {/* Informações de Acesso */}
          <SheetSection title="Informações de Acesso">
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
                  Localização
                </p>
                <p className="text-[11px] font-semibold text-petroleum flex items-center gap-1.5">
                  <MapPin size={10} className="text-gold" />
                  {event.location || 'Não rastreado'}
                </p>
              </div>
            </div>
          </SheetSection>

          {/* Dispositivo e Navegador */}
          <SheetSection title="Dispositivo e Navegador">
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
                  <span className="text-[10px] font-semibold text-slate-900 uppercase">
                    {item.label}
                  </span>
                  <span className="text-[11px] font-semibold text-petroleum uppercase flex items-center gap-2">
                    <item.icon size={12} className="text-petroleum" />{' '}
                    {item.val || '---'}
                  </span>
                </div>
              ))}
            </div>
          </SheetSection>

          {/* Metadados */}
          {event.metadata && (
            <SheetSection title="Metadados Brutos (Logs)">
              <div className="p-4 bg-petroleum rounded-luxury text-champagne font-mono text-[10px] overflow-x-auto whitespace-pre">
                {JSON.stringify(event.metadata, null, 2)}
              </div>
            </SheetSection>
          )}
        </>
      )}
    </Sheet>
  );
}
