'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  Download,
  Share2,
  Users,
  Search,
  Smartphone,
  Monitor,
  Globe,
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
// 🎯 Importamos o utilitário de URL que o Card usa
import { getPublicGalleryUrl } from '@/core/utils/url-helper';

export default function EventReportView({ galeria }: any) {
  const router = useRouter();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // 🎯 Extraímos a lógica de link do Card para cá
  const publicUrl = useMemo(() => {
    return (
      galeria?.url || getPublicGalleryUrl(galeria?.photographer, galeria?.slug)
    );
  }, [galeria]);

  const showVisitorData = galeria.leads_enabled === true;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await getGaleriaEventReport(galeria.id);
        setReportData(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [galeria.id]);

  const events = reportData?.rawEvents || [];

  const stats = useMemo(() => {
    const viewsEvents = events.filter((e: any) => e.event_type === 'view');
    const downloadsEvents = events.filter(
      (e: any) => e.event_type === 'download',
    );
    const leads = events.filter((e: any) => e.event_type === 'lead').length;
    const shares = events.filter((e: any) => e.event_type === 'share').length;

    const mobile = events.filter(
      (e: any) => e.device_info?.type === 'mobile',
    ).length;
    const desktop = events.length - mobile;

    const firstAccess =
      viewsEvents.length > 0
        ? viewsEvents[viewsEvents.length - 1].created_at
        : null;
    const firstDownload =
      downloadsEvents.length > 0
        ? downloadsEvents[downloadsEvents.length - 1].created_at
        : null;

    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const mobileOffset =
      circumference - (mobile / (events.length || 1)) * circumference;

    return {
      views: viewsEvents.length,
      leads,
      downloads: downloadsEvents.length,
      shares,
      mobileCount: mobile,
      mobilePct:
        events.length > 0 ? Math.round((mobile / events.length) * 100) : 0,
      desktopCount: desktop,
      desktopPct:
        events.length > 0 ? Math.round((desktop / events.length) * 100) : 0,
      convRate:
        viewsEvents.length > 0
          ? ((leads / viewsEvents.length) * 100).toFixed(1)
          : '0',
      firstAccess,
      firstDownload,
      circumference,
      mobileOffset,
    };
  }, [events]);

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
      <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-700 relative">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* COLUNA DA ESQUERDA */}
          <div className="w-full lg:w-[350px] shrink-0 space-y-4">
            {/* MARCOS DA GALERIA */}
            <div className="p-5 rounded-luxury bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gold mb-2">
                Marcos da Galeria
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                    <CalendarDays size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-semibold text-slate-400">
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
                    <p className="text-[9px] uppercase font-semibold text-slate-400">
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
                    Funil de Conversão
                  </h3>
                  <Target size={14} className="text-gold" />
                </div>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Visualizações',
                      val: stats.views,
                      pct: 100,
                      color: 'bg-blue-500',
                    },
                    {
                      label: 'Cadastros (Leads)',
                      val: stats.leads,
                      pct: (stats.leads / (stats.views || 1)) * 100,
                      color: 'bg-green-500',
                    },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-tighter">
                        <span className="text-slate-400">{item.label}</span>
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
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Taxa de Eficiência
                    </span>
                    <span className="text-lg font-bold text-gold">
                      {stats.convRate}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {!showVisitorData && (
                <div className="p-4 rounded-luxury bg-white border border-slate-200 shadow-sm">
                  <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-widest mb-1">
                    Visualizações
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
                <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-widest mb-1">
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
                <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-widest mb-1">
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

            <div className="p-5 rounded-luxury bg-white border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
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

          {/* COLUNA DA DIREITA */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-luxury border border-slate-200 overflow-hidden shadow-sm h-full flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm rounded-luxury mb-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gold mb-1 block">
                    Galeria selecionada
                  </span>
                  <h2
                    className="text-[15px] font-semibold text-petroleum leading-tight tracking-luxury-tight truncate"
                    title={galeria.title}
                  >
                    {/* 🎯 Implementação do Link conforme solicitado */}
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gold transition-colors flex items-center gap-2"
                    >
                      {galeria.title}
                      <ExternalLink size={14} className="shrink-0 opacity-50" />
                    </a>
                  </h2>
                </div>
                <div className="flex-1 max-w-md w-full">
                  <div className="relative group">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={14}
                    />
                    <input
                      type="text"
                      placeholder="Filtrar por IP, Cidade ou Evento..."
                      className="w-full !pl-8 h-9 text-xs rounded-luxury border border-slate-200 outline-none focus:border-gold transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] uppercase tracking-widest text-slate-400 font-semibold border-b border-slate-100">
                      <th className="px-4 py-4 w-32">Data/Hora</th>
                      <th className="px-4 py-4 w-40">Evento</th>
                      <th className="px-4 py-4 w-48">Localização</th>
                      <th className="px-4 py-4 w-auto">Tecnologia</th>
                      <th className="px-4 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {events
                      .filter(
                        (e: any) =>
                          (e.location || '')
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          (e.event_label || '')
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          (e.visitor_id || '')
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()),
                      )
                      .map((event: any) => (
                        <tr
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-4 text-[10px] font-medium text-slate-400 whitespace-nowrap">
                            {new Date(event.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[8px] font-semibold uppercase border ${
                                event.event_type === 'lead'
                                  ? 'bg-green-50 border-green-200 text-green-700'
                                  : event.event_type === 'download'
                                    ? 'bg-gold/10 border-gold/20 text-gold-700'
                                    : event.event_type === 'share'
                                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                                      : 'bg-blue-50 border-blue-200 text-blue-700'
                              }`}
                            >
                              {event.event_type === 'lead'
                                ? 'Visitante'
                                : event.event_label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-petroleum truncate">
                              <MapPin
                                size={10}
                                className="text-gold shrink-0"
                              />
                              {event.location || '---'}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-500 uppercase truncate">
                              {event.device_info?.type === 'mobile' ? (
                                <Smartphone size={10} />
                              ) : (
                                <Monitor size={10} />
                              )}
                              {event.device_info?.os} •{' '}
                              {event.device_info?.browser}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <ChevronRight
                              size={14}
                              className="text-slate-200 group-hover:text-gold transition-colors"
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <EventDetailsSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      </div>
    </RelatorioBasePage>
  );
}
