'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Table as TableIcon,
  FileDown,
  User,
  Mail,
  Smartphone,
  MapPin,
  Monitor,
  Cpu,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import { getGaleriaLeads } from '@/core/services/galeria.service';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
} from '@/core/utils/export-helper';
import { Galeria } from '@/core/types/galeria';
import { useRouter } from 'next/navigation';
import { LoadingScreen, RelatorioBasePage } from '@/components/ui';
import { usePlan } from '@/core/context/PlanContext';
import { normalizePhoneNumber } from '@/core/utils/masks-helpers';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import {
  RelatorioSelectedGallery,
  RelatorioSearchInput,
} from '@/components/ui/RelatorioBasePage';
import { div } from 'framer-motion/client';

interface LeadReportViewProps {
  galeria: Galeria;
}

export default function LeadReportView({ galeria }: LeadReportViewProps) {
  const router = useRouter();
  const { permissions } = usePlan();
  const { canCaptureLeads } = permissions;

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [daysRange, setDaysRange] = useState(7);

  useEffect(() => {
    if (canCaptureLeads) loadLeads();
    else setLoading(false);
  }, [galeria.id, canCaptureLeads]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const result = await getGaleriaLeads(galeria.id);
      if (result.success) setLeads(result.data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodLeads = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysRange);
    return leads.filter((lead) => new Date(lead.created_at) >= cutoff);
  }, [leads, daysRange]);

  const filteredLeads = useMemo(() => {
    return periodLeads
      .filter((lead) => {
        const term = searchTerm.toLowerCase();
        const searchNumber = searchTerm.replace(/\D/g, '');
        const name = (lead.name || lead.full_name || '').toLowerCase();
        const email = (lead.email || '').toLowerCase();
        const whatsapp = String(lead.whatsapp || lead.phone || '').replace(
          /\D/g,
          '',
        );
        return (
          name.includes(term) ||
          email.includes(term) ||
          (searchNumber !== '' && whatsapp.includes(searchNumber))
        );
      })
      .sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const valA = a[key] || '';
        const valB = b[key] || '';
        return (valA < valB ? -1 : 1) * (direction === 'asc' ? 1 : -1);
      });
  }, [periodLeads, searchTerm, sortConfig]);

  const leadStats = useMemo(() => {
    const total = periodLeads.length;
    const withLocation = periodLeads.filter(
      (l) => !!l.metadata?.location && l.metadata.location !== 'N/A',
    ).length;
    const mobileCount = periodLeads.filter(
      (l) => l.metadata?.device_info?.type === 'mobile',
    ).length;
    const desktopCount = periodLeads.filter(
      (l) =>
        !l.metadata?.device_info?.type ||
        l.metadata?.device_info?.type === 'desktop',
    ).length;
    const otherCount = Math.max(total - mobileCount - desktopCount, 0);

    const osMap = periodLeads.reduce(
      (acc, lead) => {
        const os = lead.metadata?.device_info?.os || 'Desconhecido';
        acc[os] = (acc[os] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const osList: Array<[string, number]> = Object.entries(
      osMap as Record<string, number>,
    )
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5)
      .map(([os, count]) => [os, Number(count)]);

    return {
      total,
      withLocation,
      mobileCount,
      desktopCount,
      otherCount,
      osList,
    };
  }, [periodLeads]);

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    const data = filteredLeads.map((l) => ({
      Nome: l.name,
      Email: l.email || '---',
      WhatsApp: l.whatsapp || '---',
      Localizacao: l.metadata?.location || 'N/A',
      Dispositivo: l.metadata?.device_info?.type || 'desktop',
      Sistema: l.metadata?.device_info?.os || 'Desconhecido',
      Data: new Date(l.created_at).toLocaleString('pt-BR'),
    }));
    const filename = `visitantes-${galeria.slug}`;
    if (type === 'csv') exportToCSV(data, filename);
    if (type === 'excel') exportToExcel(data, filename);
    if (type === 'pdf')
      exportToPDF(data, filename, `Relatório: ${galeria.title}`);
  };

  if (loading && canCaptureLeads)
    return <LoadingScreen message="Carregando cadastros de visitantes..." />;

  return (
    <RelatorioBasePage
      title={`Relatório - ${galeria.title}`}
      onBack={() => router.back()}
      footerStatusText={`Resultados: ${filteredLeads.length}`}
      exportButtons={
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="btn-secondary-petroleum px-4 flex items-center gap-2 text-[12px] font-semibold"
          >
            <FileText size={14} /> CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="btn-secondary-petroleum px-4 flex items-center gap-2 text-[12px] font-semibold"
          >
            <TableIcon size={14} /> EXCEL
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="btn-luxury-primary px-4 flex items-center gap-2 text-[12px] font-semibold"
          >
            <FileDown size={14} /> PDF
          </button>
        </div>
      }
    >
      {/* Container Principal com largura e altura controladas */}
      <div className="max-w-[1600px] mx-auto p-2 flex flex-col lg:flex-row gap-4">
        <aside className="w-full lg:w-[320px] space-y-3 shrink-0">
          <div className="p-3 bg-slate-50/50 rounded-luxury border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={14} className="text-gold" />
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

          <div className="p-3 bg-white rounded-luxury border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Monitor size={14} className="text-gold" />
              <h3 className="text-[9px] font-semibold uppercase text-slate-500 tracking-tighter">
                Dispositivo
              </h3>
            </div>
            {[
              {
                label: 'Mobile',
                value: leadStats.mobileCount,
                color: 'bg-gold',
              },
              {
                label: 'Desktop',
                value: leadStats.desktopCount,
                color: 'bg-petroleum',
              },
              {
                label: 'Outros',
                value: leadStats.otherCount,
                color: 'bg-slate-400',
              },
            ].map((row) => {
              const pct =
                leadStats.total > 0
                  ? Math.round((row.value / leadStats.total) * 100)
                  : 0;
              return (
                <div key={row.label} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-1">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${row.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-white rounded-luxury border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={14} className="text-gold" />
              <h3 className="text-[9px] font-semibold uppercase text-slate-500 tracking-tighter">
                Sistema Operacional
              </h3>
            </div>
            <div className="space-y-2">
              {leadStats.osList.length === 0 ? (
                <p className="text-[10px] text-slate-400">Sem dados</p>
              ) : (
                leadStats.osList.map(([os, count]) => (
                  <div
                    key={os}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <span className="text-slate-600 truncate pr-2">{os}</span>
                    <span className="font-semibold text-petroleum">
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-white rounded-luxury border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[8px] font-semibold text-slate-400 uppercase leading-none mb-1">
                Com Localização
              </p>
              <p className="text-lg font-semibold text-petroleum leading-none px-1">
                {leadStats.withLocation}
              </p>
            </div>
            <MapPin size={18} className="text-emerald opacity-25" />
          </div>
        </aside>

        <main className="flex-1 space-y-4">
          <div className="bg-white rounded-luxury border p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
            <RelatorioSelectedGallery galeria={galeria} />
            <RelatorioSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nome, e-mail ou WhatsApp..."
              className="max-w-md w-full"
            />
          </div>

          <RelatorioTable
            data={filteredLeads}
            onSort={(key) =>
              setSortConfig({
                key,
                direction:
                  sortConfig?.key === key && sortConfig.direction === 'asc'
                    ? 'desc'
                    : 'asc',
              })
            }
            columns={[
              {
                header: 'Nome',
                accessor: (i) => (
                  <div className="text-[12px] font-medium text-petroleum">
                    {i.name}
                  </div>
                ),
                icon: User,
                sortKey: 'name',
              },
              {
                header: 'E-mail',
                accessor: (i) => (
                  <div className="text-[12px] text-slate-500 font-medium">
                    {i.email || '---'}
                  </div>
                ),
                icon: Mail,
                sortKey: 'email',
              },
              {
                header: 'WhatsApp',
                accessor: (i) => (
                  <div className="text-[12px] font-medium text-petroleum traking-[0.5em]">
                    {i.whatsapp ? normalizePhoneNumber(i.whatsapp) : '---'}
                  </div>
                ),
                icon: Smartphone,
                sortKey: 'whatsapp',
              },
              {
                header: 'Localização',
                accessor: (i) => (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                    <MapPin size={10} className="text-gold" />
                    {i.metadata?.location || 'N/A'}
                  </div>
                ),
                icon: MapPin,
              },
              {
                header: 'Dispositivo',
                accessor: (i) => (
                  <div className="text-[11px] text-slate-600 font-medium uppercase">
                    {i.metadata?.device_info?.type || 'desktop'}
                  </div>
                ),
                icon: Monitor,
              },
              {
                header: 'Sistema',
                accessor: (i) => (
                  <div className="text-[11px] text-slate-600 font-medium">
                    {i.metadata?.device_info?.os || 'Desconhecido'}
                  </div>
                ),
                icon: Cpu,
              },
              {
                header: 'Capturado em',
                accessor: (i) => (
                  <div className="text-[12px] text-slate-800 font-medium whitespace-nowrap">
                    {new Date(i.created_at).toLocaleString('pt-BR')}
                  </div>
                ),
                icon: Calendar,
                align: 'right',
                sortKey: 'created_at',
              },
            ]}
          />
        </main>
      </div>
    </RelatorioBasePage>
  );
}
