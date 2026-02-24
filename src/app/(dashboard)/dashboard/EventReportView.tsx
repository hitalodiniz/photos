'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Share2,
  Smartphone,
  Monitor,
  FileText,
  FileDown,
  MapPin,
  Target,
  CalendarDays,
  Zap,
  TableIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RelatorioBasePage, LoadingScreen } from '@/components/ui';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
} from '@/core/utils/export-helper';
import { getGaleriaEventReport } from '@/core/services/galeria-stats.service';
import { EventDetailsSheet } from '@/components/ui/EventDetailsSheet';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import {
  RelatorioSearchInput,
  RelatorioSelectedGallery,
} from '@/components/ui/RelatorioBasePage';
import InteractiveChart from '@/components/ui/InteractiveChart';
import { TrafficInfoCard } from '@/components/dashboard/TrafficInfoCard';

// --- VIEW PRINCIPAL ---
export default function EventReportView({ galeria }: any) {
  const router = useRouter();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [daysRange, setDaysRange] = useState(7);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await getGaleriaEventReport(galeria.id);
        setReportData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [galeria.id]);

  const rawEvents = reportData?.rawEvents || [];
  const events = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysRange);
    return rawEvents.filter((e: any) => new Date(e.created_at) >= cutoff);
  }, [rawEvents, daysRange]);

  const stats = useMemo(() => {
    const views = events.filter((e: any) => e.event_type === 'view');
    const leads = events.filter((e: any) => e.event_type === 'lead');
    const downloads = events.filter((e: any) => e.event_type === 'download');

    const mobileEvents = events.filter(
      (e: any) => e.device_info?.type === 'mobile',
    );
    const totalEvents = events.length || 1;
    const mobileCount = mobileEvents.length;

    const uniqueVisitors = new Set(views.map((v) => v.visitor_id)).size;
    const uniqueLeads = new Set(leads.map((l) => l.visitor_id)).size;

    return {
      uniqueVisitors,
      uniqueLeads,
      downloads: downloads.length,
      shares: events.filter((e: any) => e.event_type === 'share').length,
      mobileCount,
      desktopCount: totalEvents - mobileCount,
      mobilePct: Math.round((mobileCount / totalEvents) * 100),
      desktopPct: Math.round(((totalEvents - mobileCount) / totalEvents) * 100),
      firstAcc: views.length > 0 ? views[views.length - 1].created_at : null,
      firstDown:
        downloads.length > 0
          ? downloads[downloads.length - 1].created_at
          : null,
      circumference: 2 * Math.PI * 35,
      mobileOffset:
        2 * Math.PI * 35 - (mobileCount / totalEvents) * (2 * Math.PI * 35),
    };
  }, [events]);

  const timelineData = useMemo(() => {
    const days = [];
    const now = new Date();

    // Gera o array para o intervalo selecionado (ex: 7, 15 ou 30 dias)
    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });

      // Filtra todos os eventos deste dia específico
      const dayEvents = events.filter(
        (e) =>
          new Date(e.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }) === dateStr,
      );

      days.push({
        date: dateStr,
        // Métricas baseadas no event_type do seu banco/API
        views: new Set(
          dayEvents
            .filter((e) => e.event_type === 'view')
            .map((e) => e.visitor_id),
        ).size, // Visitantes únicos
        downloads: dayEvents.filter((e) => e.event_type === 'download').length,
        shares: dayEvents.filter((e) => e.event_type === 'share').length,
      });
    }
    return days;
  }, [events, daysRange]);

  if (loading)
    return <LoadingScreen message="Gerando estatísticas da galeria..." />;

  return (
    <RelatorioBasePage
      title={`Estatísticas - ${galeria.title}`}
      onBack={() => router.back()}
      exportButtons={
        <div className="flex gap-2">
          <button
            onClick={() =>
              exportToCSV(events, 'Estatísticas - ' + galeria.title)
            }
            className="btn-secondary-petroleum px-4 flex items-center gap-2 text-[12px] font-semibold"
          >
            <FileText size={14} /> CSV
          </button>
          <button
            onClick={() =>
              exportToExcel(events, 'Estatísticas - ' + galeria.title)
            }
            className="btn-secondary-petroleum px-4 flex items-center gap-2 text-[12px] font-semibold"
          >
            <TableIcon size={14} /> EXCEL
          </button>
          <button
            onClick={() =>
              exportToPDF(
                events,
                'Estatísticas - ' + galeria.title,
                'Relatório - ' + galeria.title,
              )
            }
            className="btn-luxury-primary px-4 flex items-center gap-2 text-[12px] font-semibold"
          >
            <FileDown size={14} /> PDF
          </button>
        </div>
      }
    >
      <div className="max-w-[1600px] mx-auto p-2 flex flex-col lg:flex-row gap-4">
        <aside className="w-full lg:w-[350px] space-y-3 shrink-0">
          {/* VERSÃO AMPLA: Educativa e explicativa */}
          <TrafficInfoCard variant="full" tooltipPosition="bottom" />
          {/* 1. MARCOS PRINCIPAIS (Compacto) */}
          <div className="p-3 bg-white rounded-luxury border border-slate-200 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 border-r border-slate-100">
              <CalendarDays size={16} className="text-gold shrink-0" />
              <div>
                <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                  1º Acesso
                </p>
                <p className="text-[10px] font-semibold text-petroleum">
                  {stats.firstAcc
                    ? new Date(stats.firstAcc).toLocaleDateString('pt-BR')
                    : '---'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-gold shrink-0" />
              <div>
                <p className="text-[8px] uppercase font-semibold text-slate-400 leading-tight">
                  1º Download
                </p>
                <p className="text-[10px] font-semibold text-petroleum">
                  {stats.firstDown
                    ? new Date(stats.firstDown).toLocaleDateString('pt-BR')
                    : '---'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. FILTRO E GRÁFICO (Unificados) */}
          <div className="space-y-2">
            <div className="p-3 bg-slate-50/50 rounded-luxury border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[9px] font-semibold uppercase text-slate-500 tracking-tighter">
                  Período de Análise
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysRange(d)}
                    className={`py-1 rounded text-[9px] font-semibold transition-all ${
                      daysRange === d
                        ? 'bg-petroleum text-white shadow-sm'
                        : 'bg-white text-slate-400 border border-slate-100'
                    }`}
                  >
                    {d} DIAS
                  </button>
                ))}
              </div>
            </div>
            <InteractiveChart timelineData={timelineData} />
          </div>

          {/* 3. METRICAS RÁPIDAS (Downloads e Shares Subiram) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-white rounded-luxury border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-semibold text-slate-400 uppercase leading-none mb-1">
                  Downloads
                </p>
                <p className="text-lg font-semibold text-petroleum leading-none px-1">
                  {stats.downloads}
                </p>
              </div>
              <Download size={18} className="text-blue opacity-20" />
            </div>
            <div className="p-3 bg-white rounded-luxury border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-semibold text-slate-400 uppercase leading-none mb-1">
                  Compartilhamentos
                </p>
                <p className="text-lg font-semibold text-petroleum leading-none px-1">
                  {stats.shares}
                </p>
              </div>
              <Share2 size={18} className="text-emerald opacity-20" />
            </div>
          </div>

          {/* 4. DISPOSITIVOS (Layout Horizontal) */}
          <div className="p-4 bg-white rounded-luxury border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="12"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#D4AF37"
                    strokeWidth="12"
                    strokeDasharray={stats.circumference}
                    strokeDashoffset={stats.mobileOffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-petroleum">
                  {stats.mobilePct}%
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded">
                  <span className="text-[8px] font-semibold text-slate-400 uppercase">
                    Mobile
                  </span>
                  <span className="text-[10px] font-semibold text-petroleum">
                    {stats.mobileCount}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded">
                  <span className="text-[8px] font-semibold text-slate-400 uppercase">
                    Desktop
                  </span>
                  <span className="text-[10px] font-semibold text-petroleum">
                    {stats.desktopCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. FUNIL DE CONVERSÃO (Base do Painel) */}
          <div className="p-4 rounded-luxury bg-petroleum text-white border border-petroleum shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[9px] font-semibold uppercase tracking-widest text-slate-300">
                Taxa de Conversão
              </h3>
              <Target size={12} className="text-gold" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] font-semibold mb-1 uppercase">
                  <span className="text-slate-400">Visitantes</span>
                  <span>{stats.uniqueVisitors}</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 w-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-semibold mb-1 uppercase text-gold">
                  <span>Cadastro de visitantes</span>
                  <span>{stats.uniqueLeads}</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]"
                    style={{
                      width: `${(stats.uniqueLeads / (stats.uniqueVisitors || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-4">
          <div className="bg-white rounded-luxury border p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
            <RelatorioSelectedGallery galeria={galeria} />
            <RelatorioSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              className="max-w-xs w-full"
            />
          </div>
          <RelatorioTable
            data={events.filter((e) =>
              (e.location || '')
                .toLowerCase()
                .includes(searchTerm.toLowerCase()),
            )}
            onRowClick={setSelectedEvent}
            columns={[
              {
                header: 'Data',
                accessor: (e) => (
                  <span className="text-[10px] text-slate-500">
                    {new Date(e.created_at).toLocaleString('pt-BR')}
                  </span>
                ),
                width: 'w-[180px]',
              },
              {
                header: 'Evento',
                accessor: (e) => (
                  <span className="px-2 py-0.5 rounded text-[8px] font-semibold uppercase bg-slate-50 border text-slate-500">
                    {e.event_label}
                  </span>
                ),
                width: 'w-[180px]',
              },
              {
                header: 'Localização',
                accessor: (e) => (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                    <MapPin size={10} className="text-gold" />
                    {e.location || 'N/A'}
                  </div>
                ),
              },
              {
                header: 'Dispositivo',
                accessor: (e) => (
                  <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase font-semibold">
                    {e.device_info?.type === 'mobile' ? (
                      <Smartphone size={10} />
                    ) : (
                      <Monitor size={10} />
                    )}
                    {e.device_info?.os}
                  </div>
                ),
                width: 'w-[180px]',
              },
            ]}
          />
        </main>
      </div>
      <EventDetailsSheet
        event={selectedEvent}
        allEvents={events}
        onClose={() => setSelectedEvent(null)}
      />
    </RelatorioBasePage>
  );
}
