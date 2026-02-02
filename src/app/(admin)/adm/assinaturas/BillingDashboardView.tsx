'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  CreditCard,
  ArrowUpRight,
  DollarSign,
  Search,
  Lock,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { GridBasePage } from '@/components/ui';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@photos/core-auth';
import { useRouter } from 'next/router';

// Simulação de busca no Supabase para as 3 aplicações
const getConsolidatedBilling = async () => {
  // Aqui você faria um fetch na 'tb_subscricao' sem filtro de origin_app
  // para ter a visão de "Dono da Holding"
  return { success: true, data: [] };
};

export default function BillingDashboardView() {
  const { user } = useAuth(); // Seu hook de autenticação
  const router = useRouter();

  // 🛡️ Trava de Segurança: Apenas seu UID ou role 'ADMIN'
  const isAdmin =
    user?.email === 'seu-email@dominio.com' || user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Lock className="text-petroleum/20 w-16 h-16 mb-4" />
        <h2 className="text-xl font-bold uppercase tracking-widest">
          Acesso Restrito
        </h2>
        <button
          onClick={() => router.back()}
          className="mt-4 btn-luxury-primary px-8"
        >
          Voltar
        </button>
      </div>
    );
  }
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterApp, setFilterApp] = useState<
    'all' | 'sua-galeria' | 'na-selfie' | 'em-campanha'
  >('all');

  useEffect(() => {
    loadData();
  }, [filterApp]);

  const loadData = async () => {
    setLoading(true);
    const result = await getConsolidatedBilling();
    if (result.success) setSubscriptions(result.data);
    setLoading(false);
  };

  // Métricas Rápidas
  const stats = [
    {
      label: 'MRR (Mensal)',
      value: 'R$ 12.450',
      icon: DollarSign,
      color: 'text-emerald-500',
    },
    {
      label: 'Assinaturas Ativas',
      value: '208',
      icon: CheckCircle2,
      color: 'text-blue-500',
    },
    {
      label: 'Pendentes/Atraso',
      value: '12',
      icon: Clock,
      color: 'text-amber-500',
    },
  ];

  return (
    <GridBasePage
      actions={
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-white text-sm font-semibold uppercase tracking-luxury-widest">
              Financial Hub
            </h1>
            <p className="text-white/60 text-[10px] uppercase tracking-luxury-widest">
              Gestão Consolidada de Assinaturas
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              onChange={(e) => setFilterApp(e.target.value as any)}
              className="bg-white/10 border border-white/20 rounded-luxury text-[10px] font-bold uppercase tracking-luxury px-4 h-10 text-white outline-none"
            >
              <option value="all">Todos os Apps</option>
              <option value="sua-galeria">Sua Galeria</option>
              <option value="na-selfie">Na Selfie</option>
              <option value="em-campanha">Em Campanha</option>
            </select>
            <button className="btn-luxury-primary px-6 h-10 flex items-center gap-2">
              <Download size={14} />{' '}
              <span className="text-[10px]">Exportar</span>
            </button>
          </div>
        </div>
      }
    >
      {/* 📊 Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-petroleum/10 rounded-luxury p-5 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-slate-50 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded">
                +12%
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-luxury-widest text-petroleum/50 font-bold">
              {stat.label}
            </p>
            <h3 className="text-2xl font-bold text-petroleum mt-1">
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      {/* 📋 Tabela de Transações */}
      <div className="bg-white border border-petroleum/10 rounded-luxury overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-petroleum/10">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-luxury text-petroleum/70">
                App/Origem
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-luxury text-petroleum/70">
                Cliente
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-luxury text-petroleum/70">
                Status
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-luxury text-petroleum/70 text-right">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-petroleum/5">
            {/* O mapeamento de assinaturas entraria aqui seguindo o padrão da sua LeadView */}
          </tbody>
        </table>
      </div>
    </GridBasePage>
  );
}
