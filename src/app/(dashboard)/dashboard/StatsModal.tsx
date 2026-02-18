'use client';

import { useState } from 'react';
import BaseModal from '@/components/ui/BaseModal';
import {
  Eye,
  Users,
  Download,
  Share2,
  TrendingUp,
  Monitor,
  Smartphone,
  Globe,
  Cpu,
  Target,
} from 'lucide-react';

export default function StatsModal({
  isOpen,
  onClose,
  data,
  title,
  leadsEnabled,
}: any) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tech'>('overview');
  const { summary, chartData, analytics } = data;

  const hasData = chartData.some((d: any) => d.value > 0);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Analytics da Galeria"
      subtitle={title}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Tabs Estilo Minimalista */}
        <div className="flex gap-8 border-b border-slate-100">
          {['overview', 'tech'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-4 text-[10px] uppercase tracking-[0.2em] font-extrabold transition-all relative ${
                activeTab === tab ? 'text-petroleum' : 'text-slate-400'
              }`}
            >
              {tab === 'overview' ? 'Visão Geral' : 'Tecnologia'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' ? (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gráfico Principal */}
              <div className="md:col-span-2 p-6 rounded-luxury border border-slate-100 bg-white">
                <div className="flex justify-between items-start mb-6">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    Acessos/Dia
                  </p>
                  <TrendingUp size={14} className="text-blue-500" />
                </div>
                <div className="h-32 w-full">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible"
                  >
                    <path
                      d={`M 0,100 L ${this?.points} L 100,100 Z`}
                      fill="rgba(212,175,55,0.1)"
                    />
                    <polyline
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="2.5"
                      points={this?.points}
                    />
                  </svg>
                </div>
              </div>

              {/* Card de Conversão */}
              <div className="p-6 rounded-luxury bg-petroleum text-white flex flex-col justify-center items-center text-center">
                <Target size={24} className="text-gold mb-3" />
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                  Taxa de Conversão
                </p>
                <p className="text-3xl font-light my-1">
                  {summary.conversionRate}%
                </p>
                <p className="text-[9px] opacity-40 uppercase">
                  Views vs Leads
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Views',
                  val: summary.views,
                  ic: Eye,
                  c: 'text-blue-500',
                },
                {
                  label: 'Leads',
                  val: summary.leads,
                  ic: Users,
                  c: 'text-green-500',
                },
                {
                  label: 'Downloads',
                  val: summary.downloads,
                  ic: Download,
                  c: 'text-gold',
                },
                {
                  label: 'Shares',
                  val: summary.shares,
                  ic: Share2,
                  c: 'text-purple-500',
                },
              ].map((i) => (
                <div
                  key={i.label}
                  className="p-4 rounded-luxury border border-slate-100 bg-white shadow-sm"
                >
                  <i.ic size={16} className={`${i.c} mb-2`} />
                  <p className="text-2xl font-bold text-petroleum leading-none">
                    {i.val}
                  </p>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mt-1">
                    {i.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-500 space-y-6">
            {/* Device Distribution */}
            <div className="p-6 rounded-luxury border border-slate-100 bg-white">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-6">
                Distribuição de Dispositivos
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-2">
                      <Smartphone size={14} /> Mobile
                    </span>
                    <span>{analytics.mobilePct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{ width: `${analytics.mobilePct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-2">
                      <Monitor size={14} /> Desktop
                    </span>
                    <span>{analytics.desktopPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-petroleum transition-all"
                      style={{ width: `${analytics.desktopPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-luxury border border-slate-100 bg-white flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <Cpu size={20} className="text-gold" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Sistema Operacional
                  </p>
                  <p className="text-sm font-bold text-petroleum">
                    {analytics.os}
                  </p>
                </div>
              </div>
              <div className="p-5 rounded-luxury border border-slate-100 bg-white flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <Globe size={20} className="text-gold" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Navegador
                  </p>
                  <p className="text-sm font-bold text-petroleum">
                    {analytics.browser}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
