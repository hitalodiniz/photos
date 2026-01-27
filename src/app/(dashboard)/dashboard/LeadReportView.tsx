'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Table as TableIcon,
  FileDown,
  Search,
  ArrowUpDown,
  User,
  Mail,
  Smartphone,
  Calendar
} from 'lucide-react';
import { getGaleriaLeads } from '@/core/services/galeria.service';
import { exportToCSV, exportToExcel, exportToPDF } from '@/core/utils/export-helper';
import { Galeria } from '@/core/types/galeria';
import { useRouter } from 'next/navigation';
import { GridBasePage } from '@/components/ui';
import { normalizePhoneNumber } from '@/core/utils/masks-helpers';

interface LeadReportViewProps {
  galeria: Galeria;
}

export default function LeadReportView({
  galeria,
}: LeadReportViewProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    loadLeads();
  }, [galeria.id]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const result = await getGaleriaLeads(galeria.id);
      if (result.success) {
        setLeads(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    const dataToExport = filteredLeads.map(lead => ({
      Nome: lead.name,
      Email: lead.email || 'Não informado',
      WhatsApp: lead.whatsapp || 'Não informado',
      Data: new Date(lead.created_at).toLocaleString('pt-BR'),
    }));

    const filename = `cadastros-visitantes-${galeria.slug.replace(/\//g, '-')}`;
    const title = `Relatório de Cadastro de Visitantes - ${galeria.title}`;

    if (type === 'csv') exportToCSV(dataToExport, filename);
    if (type === 'excel') exportToExcel(dataToExport, filename);
    if (type === 'pdf') exportToPDF(dataToExport, filename, title);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredLeads = leads
    .filter(lead =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.whatsapp && lead.whatsapp.includes(searchTerm))
    )
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <GridBasePage
      actions={
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Título da Galeria */}
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-white text-sm font-semibold uppercase tracking-widest truncate">
              {galeria.title}
            </h1>
            <p className="text-white/80 text-[10px] uppercase tracking-widest font-medium">
              Relatório de Usuários
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-left gap-4 flex-1 justify-end">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-petroleum/40" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-11 bg-white border border-white/10 rounded-luxury text-sm text-petroleum outline-none focus:ring-4 focus:ring-white/10 transition-all placeholder:text-petroleum/40"
              />
            </div>

            {/* Botões de Exportação */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="btn-secondary-petroleum px-4 w-28 flex items-center gap-2 justify-center"
                title="Exportar CSV"
              >
                <FileText size={16} />
                <span className="hidden md:inline">CSV</span>
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="btn-secondary-petroleum px-4 w-28 flex items-center gap-2 justify-center"
                title="Exportar Excel"
              >
                <TableIcon size={16} />
                <span className="hidden md:inline">Excel</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="btn-luxury-primary px-4 w-28 shadow-none border-none flex items-center gap-2 justify-center"
                title="Exportar PDF"
              >
                <FileDown size={16} />
                <span className="hidden md:inline">PDF</span>
              </button>
            </div>
          </div>
        </div>
      }
      footerStatus={
        <>
          {leads.length > 0 ? `Total: ${leads.length} leads` : 'Nenhum lead'}
          {searchTerm && ` • Filtrados: ${filteredLeads.length}`}
        </>
      }
      onBack={() => router.back()}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="loading-luxury-dark w-10 h-10" />
          <p className="text-sm text-petroleum/60 uppercase tracking-widest font-semibold">Carregando leads...</p>
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="bg-white border border-petroleum/10 rounded-luxury overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-petroleum/5 border-b border-petroleum/10">
                  <th
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-petroleum/90 cursor-pointer hover:text-petroleum transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      <User size={12} /> Nome <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-petroleum/90 cursor-pointer hover:text-petroleum transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      <Mail size={12} /> E-mail <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-petroleum/90 cursor-pointer hover:text-petroleum transition-colors"
                    onClick={() => handleSort('whatsapp')}
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone size={12} /> WhatsApp <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-petroleum/90 cursor-pointer hover:text-petroleum transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar size={12} /> Capturado em <ArrowUpDown size={10} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-petroleum/5">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-100/50 odd:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-petroleum text-sm">
                        {lead.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-petroleum/70 font-medium">
                        {lead.email || <span className="text-petroleum/30 italic">---</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-petroleum/70 font-medium">
                        {lead.whatsapp ? (
                          <a
                            href={`https://wa.me/${lead.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-petroleum hover:text-gold transition-all hover:translate-x-1 inline-flex items-center gap-1.5 group"
                          >
                            {normalizePhoneNumber(lead.whatsapp)}
                            <Smartphone size={10} className="opacity-0 group-hover:opacity-100 transition-all text-gold" />
                          </a>
                        ) : (
                          <span className="text-petroleum/30 italic">---</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-xs text-petroleum/70 font-medium">
                        {formatDate(lead.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-petroleum/10 border-dashed rounded-luxury">
          <Users size={48} className="text-petroleum/10 mb-4" />
          <h3 className="text-sm font-semibold text-petroleum uppercase tracking-widest">Nenhum lead encontrado</h3>
          <p className="text-xs text-petroleum/40 mt-1 font-medium">
            {searchTerm ? 'Tente ajustar sua busca para encontrar o que procura.' : 'Leads capturados aparecerão aqui automaticamente.'}
          </p>
        </div>
      )}
    </GridBasePage>
  );
}
