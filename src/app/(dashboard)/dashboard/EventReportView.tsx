'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  Download,
  Share2,
  Search,
  Smartphone,
  Monitor,
  FileText,
  FileDown,
  MapPin,
  Target,
  ChevronRight,
  CalendarDays,
  Zap,
  ExternalLink,
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
import { button } from 'framer-motion/client';

export default function EventReportView({ galeria }: any) {
  const router = useRouter();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const showVisitorData = galeria.leads_enabled === true;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await getGaleriaEventReport(galeria.id);
        setReportData(result);
      } catch (error) {
        console.error('Erro ao carregar relatório:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [galeria.id]);

  const events = reportData?.rawEvents || [];

  const stats = useMemo(() => {
    // 🎯 ESTATÍSTICAS BASEADAS EM VISITANTES ÚNICOS (FUNIL REAL)
    const uniqueVisitors = new Set(
      events
        .filter((e: any) => e.event_type === 'view')
        .map((e: any) => e.visitor_id),
    );
    const uniqueLeads = new Set(
      events
        .filter((e: any) => e.event_type === 'lead')
        .map((e: any) => e.visitor_id),
    );

    const viewsCount = uniqueVisitors.size;
    const leadsCount = uniqueLeads.size;

    // Eventos brutos para outros cards
    const totalDownloads = events.filter(
      (e: any) => e.event_type === 'download',
    ).length;
    const totalShares = events.filter(
      (e: any) => e.event_type === 'share',
    ).length;

    // Dispositivos (Baseado no total de interações para amostragem técnica)
    const mobileCount = events.filter(
      (e: any) => e.device_info?.type === 'mobile',
    ).length;
    const totalWithDevice = events.length || 1;

    // Marcos temporais
    const viewsEvents = events.filter((e: any) => e.event_type === 'view');
    const downloadsEvents = events.filter(
      (e: any) => e.event_type === 'download',
    );

    const firstAccess =
      viewsEvents.length > 0
        ? viewsEvents[viewsEvents.length - 1].created_at
        : null;
    const firstDownload =
      downloadsEvents.length > 0
        ? downloadsEvents[downloadsEvents.length - 1].created_at
        : null;

    return {
      views: viewsCount, // Visitantes únicos
      leads: leadsCount, // Leads únicos
      downloads: totalDownloads,
      shares: totalShares,
      mobileCount,
      mobilePct: Math.round((mobileCount / totalWithDevice) * 100),
      desktopPct: Math.round(
        ((totalWithDevice - mobileCount) / totalWithDevice) * 100,
      ),
      // 🎯 Taxa de conversão real: Visitantes que viraram Leads
      convRate:
        viewsCount > 0 ? ((leadsCount / viewsCount) * 100).toFixed(1) : '0',
      firstAccess,
      firstDownload,
      circumference: 2 * Math.PI * 35,
      mobileOffset:
        2 * Math.PI * 35 - (mobileCount / totalWithDevice) * (2 * Math.PI * 35),
    };
  }, [events]);

  const timelineData = useMemo(() => {
    const dailyGroups: Record<
      string,
      { date: string; views: Set<string>; leads: Set<string> }
    > = {};

    // Ordenamos para garantir a cronologia correta
    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    sortedEvents.forEach((e: any) => {
      const date = new Date(e.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      if (!dailyGroups[date]) {
        dailyGroups[date] = { date, views: new Set(), leads: new Set() };
      }
      if (e.event_type === 'view') dailyGroups[date].views.add(e.visitor_id);
      if (e.event_type === 'lead') dailyGroups[date].leads.add(e.visitor_id);
    });

    return Object.values(dailyGroups).slice(-7); // Últimos 7 dias ativos
  }, [events]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return events;

    return events.filter((e: any) => {
      // Formata a data para permitir busca por texto (ex: "19/02")
      const dateStr = new Date(e.created_at)
        .toLocaleString('pt-BR')
        .toLowerCase();

      return (
        // Busca na Localização
        (e.location || '').toLowerCase().includes(term) ||
        // Busca no Rótulo do Evento (View, Download, etc)
        (e.event_label || '').toLowerCase().includes(term) ||
        // Busca no IP/Visitor ID
        (e.visitor_id || '').toLowerCase().includes(term) ||
        // Busca no Sistema Operacional
        (e.device_info?.os || '').toLowerCase().includes(term) ||
        // Busca no Navegador
        (e.device_info?.browser || '').toLowerCase().includes(term) ||
        // Busca no Tipo de Dispositivo (mobile/desktop)
        (e.device_info?.type || '').toLowerCase().includes(term) ||
        // Busca na Data formatada
        dateStr.includes(term)
      );
    });
  }, [events, searchTerm]);

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    const dataToExport = events.map((e: any) => ({
      Data: new Date(e.created_at).toLocaleString('pt-BR'),
      Evento: e.event_type === 'lead' ? 'Cadastro de Visitante' : e.event_label,
      Localizacao: e.location || 'Não rastreado',
      IP: e.visitor_id,
      SO: e.device_info?.os || '---',
      Navegador: e.device_info?.browser || '---',
      Tipo: e.device_info?.type || 'desktop',
    }));

    const filename = `performance-${galeria.slug.replace(/\//g, '-')}`;
    if (type === 'csv') exportToCSV(dataToExport, filename);
    if (type === 'excel') exportToExcel(dataToExport, filename);
    if (type === 'pdf')
      exportToPDF(dataToExport, filename, `BI & Performance: ${galeria.title}`);
  };

  if (loading)
    return <LoadingScreen message="Gerando estatísticas da galeria..." />;

  return (
    <RelatorioBasePage
      title={`BI & Performance - ${galeria.title}`}
      onBack={() => router.back()}
      exportButtons={
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="btn-secondary-petroleum px-4 flex items-center gap-2 text-[11px] font-semibold"
          >
            <FileText size={14} /> CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="btn-secondary-petroleum px-4 flex items-center gap-2 text-[11px] font-semibold"
          >
            <TableIcon size={14} /> EXCEL
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="btn-luxury-primary px-4 flex items-center gap-2 text-[11px] font-semibold"
          >
            <FileDown size={14} /> PDF
          </button>
        </div>
      }
    >
      <div className="max-w-[1600px] mx-auto p-2 animate-in fade-in duration-700 relative">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* SIDEBAR DE ESTATÍSTICAS */}
          <div className="w-full lg:w-[350px] shrink-0 space-y-3">
            {/* MARCOS */}
            <div className="p-5 rounded-luxury bg-white border border-slate-200 shadow-sm space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gold mb-2">
                Marcos da Galeria
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                    <CalendarDays size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-petroleum/90">
                      Primeiro Acesso
                    </p>
                    <p className="text-[11px] font-semibold text-petroleum">
                      {stats.firstAccess
                        ? new Date(stats.firstAccess).toLocaleString('pt-BR')
                        : 'Aguardando...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gold/10 rounded-lg text-gold">
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-petroleum/90">
                      Primeiro Download
                    </p>
                    <p className="text-[11px] font-semibold text-petroleum">
                      {stats.firstDownload
                        ? new Date(stats.firstDownload).toLocaleString('pt-BR')
                        : 'Aguardando...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FUNIL DE CONVERSÃO */}
            {showVisitorData && (
              <div className="p-5 rounded-luxury bg-white border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                    Funil de Conversão (Único)
                  </h3>
                  <Target size={14} className="text-gold" />
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: 'Visitantes Únicos',
                      val: stats.views,
                      pct: 100,
                      color: 'bg-blue-500',
                    },
                    {
                      label: 'Leads Capturados',
                      val: stats.leads,
                      pct: (stats.leads / (stats.views || 1)) * 100,
                      color: 'bg-green-500',
                    },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-[10px] font-semibold mb-1 uppercase">
                        <span className="text-petroleum/90">{item.label}</span>
                        <span className="text-petroleum">{item.val}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-1000`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 mt-2 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-petroleum/90 uppercase">
                        Taxa de Conversão
                      </span>
                      <span className="text-[8px] text-slate-400 uppercase">
                        Acesso → Cadastro
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-gold">
                      {stats.convRate}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* GRÁFICO DE EVOLUÇÃO TEMPORAL */}
            <div className="p-5 rounded-luxury bg-white border border-slate-200 shadow-sm mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                  Tendência de Tráfego
                </h3>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-[8px] font-bold text-slate-400">
                      VIEWS
                    </span>
                  </div>
                  {showVisitorData && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-gold" />
                      <span className="text-[8px] font-bold text-slate-400">
                        LEADS
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-24 flex items-end justify-between gap-3 px-1">
                {timelineData.length > 0 ? (
                  timelineData.map((day, i) => {
                    const maxVal = Math.max(
                      ...timelineData.map((d) => d.views.size),
                      1,
                    );
                    const viewHeight = (day.views.size / maxVal) * 100;
                    const leadHeight = (day.leads.size / maxVal) * 100;

                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-2 group relative"
                      >
                        {/* Tooltip Simples */}
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-petroleum text-white text-[9px] py-1 px-2 rounded z-10 pointer-events-none whitespace-nowrap">
                          {day.views.size} v{' '}
                          {showVisitorData ? `| ${day.leads.size} l` : ''}
                        </div>

                        <div className="relative w-full h-full flex items-end justify-center gap-0.5">
                          {/* Barra de Views */}
                          <div
                            className="w-full max-w-[12px] bg-blue-500/20 rounded-t-sm transition-all duration-700 group-hover:bg-blue-500/40"
                            style={{ height: `${viewHeight}%` }}
                          />
                          {/* Barra de Leads (Sobreposta ou ao lado) */}
                          {showVisitorData && (
                            <div
                              className="w-full max-w-[12px] bg-gold rounded-t-sm transition-all duration-1000"
                              style={{ height: `${leadHeight}%` }}
                            />
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">
                          {day.date}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-300 uppercase tracking-tighter">
                      Sem dados no período
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* GRID DE CARDS RÁPIDOS */}
            <div className="grid grid-cols-2 gap-3">
              {!showVisitorData && (
                <div className="p-4 rounded-luxury bg-white border border-slate-200 shadow-sm">
                  <p className="text-[10px] uppercase font-semibold text-petroleum/90 tracking-widest mb-1">
                    Views
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-semibold text-petroleum">
                      {stats.views}
                    </p>
                    <Eye size={16} className="text-blue-500" />
                  </div>
                </div>
              )}
              <div className="p-4 rounded-luxury bg-white border border-slate-200 shadow-sm">
                <p className="text-[10px] uppercase font-semibold text-petroleum/90 tracking-widest mb-1">
                  Downloads
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-semibold text-petroleum">
                    {stats.downloads}
                  </p>
                  <Download size={16} className="text-gold" />
                </div>
              </div>
              <div className="p-4 rounded-luxury bg-white border border-slate-200 shadow-sm">
                <p className="text-[10px] uppercase font-semibold text-petroleum/90 tracking-widest mb-1">
                  Shares
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-semibold text-petroleum">
                    {stats.shares}
                  </p>
                  <Share2 size={16} className="text-purple-500" />
                </div>
              </div>
            </div>

            {/* DISTRIBUIÇÃO TÉCNICA (GRÁFICO) */}
            <div className="p-5 rounded-luxury bg-white border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-petroleum/90 mb-4">
                Distribuição Técnica
              </h3>
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-28 h-28">
                  <svg
                    className="w-full h-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="12"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="transparent"
                      stroke="#D4AF37"
                      strokeWidth="12"
                      strokeDasharray={stats.circumference}
                      strokeDashoffset={stats.mobileOffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-semibold text-petroleum text-sm">
                    {events.length}
                  </div>
                </div>
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gold" /> MOBILE
                    </span>
                    <span>
                      {stats.mobileCount} ({stats.mobilePct}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-petroleum" />{' '}
                      DESKTOP
                    </span>
                    <span>
                      {stats.desktopCount} ({stats.desktopPct}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ÁREA DA TABELA (CONTEÚDO PRINCIPAL) */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="bg-white rounded-luxury border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <RelatorioSelectedGallery galeria={galeria} />
              <RelatorioSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Filtrar por evento, localização, data ..."
                className="max-w-lg w-full"
              />
            </div>

            <RelatorioTable
              data={filteredEvents}
              onRowClick={(e) => setSelectedEvent(e)}
              columns={[
                {
                  header: 'Data/Hora',
                  accessor: (e) => (
                    <span className="text-[10px] text-petroleum font-medium">
                      {new Date(e.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  ),
                  width: 'w-40',
                },
                {
                  header: 'Evento',
                  accessor: (e) => (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[8px] font-semibold uppercase border ${
                        e.event_type === 'view'
                          ? 'bg-blue-50 border-blue-100 text-blue-600'
                          : e.event_type === 'download'
                            ? 'bg-gold/10 border-gold/20 text-gold-700'
                            : e.event_type === 'share'
                              ? 'bg-purple-50 border-purple-100 text-purple-600'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {e.event_type === 'lead' ? 'Visitante' : e.event_label}
                    </span>
                  ),
                  width: 'w-44',
                },
                {
                  header: 'Localização',
                  accessor: (e) => (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-petroleum truncate">
                      <MapPin size={12} className="text-gold shrink-0" />
                      {e.location || 'Não rastreado'}
                    </div>
                  ),
                },
                {
                  header: 'Dispositivo',
                  accessor: (e) => (
                    <div className="flex items-center gap-2 text-[10px] text-petroleum font-medium uppercase truncate">
                      {e.device_info?.type === 'mobile' ? (
                        <Smartphone size={12} />
                      ) : (
                        <Monitor size={12} />
                      )}
                      {e.device_info?.os || 'OS'} •{' '}
                      {e.device_info?.browser || 'Browser'}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>

        <EventDetailsSheet
          event={selectedEvent}
          allEvents={events}
          onClose={() => setSelectedEvent(null)}
        />
      </div>
    </RelatorioBasePage>
  );
}
