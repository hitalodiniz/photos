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
  Lock,
  Calendar,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { getGaleriaLeads } from '@/core/services/galeria.service';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
} from '@/core/utils/export-helper';
import { Galeria } from '@/core/types/galeria';
import { useRouter } from 'next/navigation';
import {
  FormPageBase,
  LoadingScreen,
  RelatorioBasePage,
} from '@/components/ui'; // Import RelatorioBasePage
import { usePlan } from '@/core/context/PlanContext';
import { normalizePhoneNumber } from '@/core/utils/masks-helpers';
import { PlanGuard } from '@/components/auth/PlanGuard';
interface LeadReportViewProps {
  galeria: Galeria;
}

export default function LeadReportView({ galeria }: LeadReportViewProps) {
  const router = useRouter();
  const { permissions } = usePlan(); // 🛡️ Verificação de Plano
  const { canCaptureLeads } = permissions; // Ajuste para buscar a permissão diretamente
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);
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
    if (!canCaptureLeads) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getGaleriaLeads(galeria.id);

      if (result.success) {
        setLeads(result.data || []);
      } else if (result.error === 'UPGRADE_REQUIRED') {
        // 🎯 Se o servidor negar por plano, forçamos o estado de bloqueio na UI
        setUpsellFeature('Acesso ao Relatório de Leads');
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    const dataToExport = filteredLeads.map((lead) => ({
      Nome: lead.name,
      Email: lead.email || 'Não informado',
      WhatsApp: lead.whatsapp || 'Não informado',
      Data: new Date(lead.created_at).toLocaleString('pt-BR'),
    }));

    const filename = `cadastros-visitantes-${galeria.slug.replace(/\//g, '-')}`;
    const title = `Relatório de Cadastro de Visitantes\n${galeria.title}`;

    if (type === 'csv') exportToCSV(dataToExport, filename);
    if (type === 'excel') exportToExcel(dataToExport, filename);
    if (type === 'pdf') exportToPDF(dataToExport, filename, title);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredLeads = leads
    .filter((lead) => {
      const term = searchTerm.toLowerCase();

      // 🎯 Normalização do termo de busca para números (remove parênteses, espaços e traços)
      const searchNumber = searchTerm.replace(/\D/g, '');

      // 🎯 Normalização dos dados do lead (garantindo que sejam strings)
      const name = (lead.name || lead.full_name || '').toLowerCase();
      const email = (lead.email || '').toLowerCase();

      // Convertemos o whatsapp para string e removemos caracteres não numéricos para comparar
      const whatsapp = String(lead.whatsapp || lead.phone || '').replace(
        /\D/g,
        '',
      );

      return (
        name.includes(term) ||
        email.includes(term) ||
        (searchNumber !== '' && whatsapp.includes(searchNumber)) || // Busca por números limpos
        (lead.whatsapp && String(lead.whatsapp).includes(searchTerm)) // Busca literal caso o usuário digite igual ao banco
      );
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      const valA = a[key] || '';
      const valB = b[key] || '';
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportButtons = (
    <PlanGuard
      feature="canExportLeads"
      label="Exportar Leads"
      scenarioType="feature"
    >
      <div className="flex items-center gap-2">
        {[
          { type: 'csv', icon: FileText, label: 'CSV' },
          { type: 'excel', icon: TableIcon, label: 'Excel' },
          { type: 'pdf', icon: FileDown, label: 'PDF' },
        ].map((btn) => (
          <button
            key={btn.type}
            onClick={() => handleExport(btn.type as any)}
            className={`${btn.type === 'pdf' ? 'btn-luxury-primary' : 'btn-secondary-petroleum'} px-4 w-28 flex items-center gap-2 justify-center relative group`}
          >
            <btn.icon size={16} />
            <span className="hidden md:inline">{btn.label}</span>
          </button>
        ))}
      </div>
    </PlanGuard>
  );

  // 1. Tela de Carregamento Inicial
  if (loading && canCaptureLeads) {
    return <LoadingScreen message="Carregando cadastro de visitantes..." />;
  }

  // 2. 🛡️ Bloqueio Total (Visualização e Cópia)
  if (!canCaptureLeads) {
    return (
      <RelatorioBasePage title="Dados Protegidos" onBack={() => router.back()}>
        <div className="flex flex-col items-center justify-center py-20 px-6 max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-gold/10 rounded-luxury flex items-center justify-center mb-6 shadow-xl shadow-gold/5">
            <Lock size={40} className="text-petroleum" />
          </div>

          <h2 className="text-xl font-bold text-petroleum uppercase tracking-luxury-widest mb-4">
            Dados Protegidos
          </h2>

          <p className="text-[13px] text-petroleum/70 leading-relaxed mb-8 font-medium">
            Identificamos{' '}
            <span className="text-petroleum font-bold">
              {galeria.leads_count || 0} visitantes
            </span>{' '}
            nesta galeria. Devido ao seu plano atual, o acesso aos dados de
            contato, visualização da lista e exportação está{' '}
            <span className="font-bold">desativado</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              onClick={() => window.open('/dashboard/planos', '_blank')}
              className="flex-1 h-12 bg-petroleum text-champagne font-bold uppercase text-[10px] tracking-luxury rounded-luxury flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
            >
              Liberar Relatório <ArrowRight size={14} />
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 h-12 border border-petroleum/20 text-petroleum/60 font-bold uppercase text-[10px] tracking-luxury rounded-luxury hover:bg-slate-50 transition-all"
            >
              Voltar
            </button>
          </div>

          <div className="mt-12 p-4 bg-slate-50 border border-petroleum/5 rounded-luxury">
            <p className="text-[9px] font-bold text-petroleum/70 uppercase tracking-luxury italic">
              Seus dados estão seguros e serão liberados instantaneamente após o
              upgrade de plano.
            </p>
          </div>
        </div>
      </RelatorioBasePage>
    );
  }
  return (
    <RelatorioBasePage
      title={`Relatório de Visitantes - ${galeria.title}`}
      onBack={() => router.back()}
      footerStatusText={
        leads.length > 0
          ? `Total: ${leads.length} cadastro de visitante${
              searchTerm ? ` • Filtrados: ${filteredLeads.length}` : ''
            }`
          : 'Nenhum cadastro de visitante'
      }
      exportButtons={exportButtons}
    >
      <div className="flex h-[calc(100vh-140px)] overflow-hidden w-[calc(70%+3rem)] gap-3 items-center justify-center mx-auto">
        {/* GRID DE LEADS - ÁREA PRINCIPAL */}
        <main className="flex-1 relative flex flex-col min-w-0 h-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm rounded-luxury mb-2">
            {/* ESQUERDA: Título da Galeria */}
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold mb-1 block">
                Galeria selecionada
              </span>
              <h2
                className="text-[15px] font-semibold text-petroleum leading-tight tracking-luxury-tight truncate"
                title={galeria.title}
              >
                {galeria.title}
              </h2>
            </div>

            {/* DIREITA: Filtro de Busca */}
            <div className="flex-1 max-w-md w-full">
              <div className="relative group">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-petroleum/40 group-focus-within:text-gold transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full !pl-8 pr-4 h-11 bg-white border border-slate-200 rounded-luxury text-sm text-petroleum outline-none focus:ring-4 focus:ring-gold/5 focus:border-gold/30 transition-all placeholder:text-petroleum/30"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-white border-t border-slate-200 rounded-luxury">
            <div className="max-w-full">
              {loading ? (
                <LoadingScreen message="Carregando cadastro de visitantes..." />
              ) : filteredLeads.length > 0 ? (
                <div className="bg-white border border-petroleum/10 rounded-luxury overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-petroleum/5 border-b border-petroleum/10">
                          <th
                            className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxury-widest text-petroleum/90 cursor-pointer hover:text-petroleum transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center gap-2">
                              <User size={12} /> Nome <ArrowUpDown size={10} />
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxury-widest text-petroleum/90 cursor-pointer hover:text-petroleum transition-colors"
                            onClick={() => handleSort('email')}
                          >
                            <div className="flex items-center gap-2">
                              <Mail size={12} /> E-mail{' '}
                              <ArrowUpDown size={10} />
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxury-widest text-petroleum/90 cursor-pointer hover:text-petroleum transition-colors"
                            onClick={() => handleSort('whatsapp')}
                          >
                            <div className="flex items-center gap-2">
                              <Smartphone size={12} /> WhatsApp{' '}
                              <ArrowUpDown size={10} />
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxury-widest text-petroleum/90 cursor-pointer hover:text-petroleum transition-colors"
                            onClick={() => handleSort('created_at')}
                          >
                            <div className="flex items-center gap-2 justify-end">
                              <Calendar size={12} /> Capturado em{' '}
                              <ArrowUpDown size={10} />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-petroleum/5">
                        {filteredLeads.map((lead) => (
                          <tr
                            key={lead.id}
                            className="hover:bg-slate-100/50 odd:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="font-semibold text-petroleum text-sm">
                                {lead.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-petroleum/70 font-medium">
                                {lead.email || (
                                  <span className="text-petroleum/30 italic">
                                    ---
                                  </span>
                                )}
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
                                    <Smartphone
                                      size={10}
                                      className="opacity-0 group-hover:opacity-100 transition-all text-gold"
                                    />
                                  </a>
                                ) : (
                                  <span className="text-petroleum/30 italic">
                                    ---
                                  </span>
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
                  <h3 className="text-sm font-semibold text-petroleum uppercase tracking-luxury-widest">
                    Nenhum cadastro de visitante encontrado
                  </h3>
                  <p className="text-xs text-petroleum/40 mt-1 font-medium">
                    {searchTerm
                      ? 'Tente ajustar sua busca para encontrar o que procura.'
                      : 'Cadastros de visitante aparecerão aqui automaticamente.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </RelatorioBasePage>
  );
}
