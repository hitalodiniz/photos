'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  FileText,
  Table as TableIcon,
  FileDown,
  User,
  Mail,
  Smartphone,
  Lock,
  Calendar,
  ArrowRight,
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
import { PlanGuard } from '@/components/auth/PlanGuard';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import {
  RelatorioSelectedGallery,
  RelatorioSearchInput,
} from '@/components/ui/RelatorioBasePage';

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

  const filteredLeads = useMemo(() => {
    return leads
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
  }, [leads, searchTerm, sortConfig]);

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    const data = filteredLeads.map((l) => ({
      Nome: l.name,
      Email: l.email || '---',
      WhatsApp: l.whatsapp || '---',
      Data: new Date(l.created_at).toLocaleString('pt-BR'),
    }));
    const filename = `visitantes-${galeria.slug}`;
    if (type === 'csv') exportToCSV(data, filename);
    if (type === 'excel') exportToExcel(data, filename);
    if (type === 'pdf')
      exportToPDF(data, filename, `Relatório: ${galeria.title}`);
  };

  if (loading && canCaptureLeads)
    return <LoadingScreen message="Carregando..." />;

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
      <div className="flex h-[calc(100vh-180px)] w-full max-w-[1400px] min-w-[900px] mx-auto flex-col antialiased px-4 pb-6">
        {/* Header de Filtros (Bloco Superior) */}
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 border 
        border-slate-200 bg-white rounded-luxury shadow-sm"
        >
          <RelatorioSelectedGallery galeria={galeria} />
          <RelatorioSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            className="max-w-md w-full"
          />
        </div>

        {/* Tabela Principal (Bloco Inferior) */}
        <div className="flex-1 bg-white border mt-2 p-2 border-slate-200 border-t-0 rounded-luxury shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
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
                    <div className="text-[12px] font-medium text-petroleum tabular-nums">
                      {i.whatsapp ? normalizePhoneNumber(i.whatsapp) : '---'}
                    </div>
                  ),
                  icon: Smartphone,
                  sortKey: 'whatsapp',
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
          </div>
        </div>
      </div>
    </RelatorioBasePage>
  );
}
