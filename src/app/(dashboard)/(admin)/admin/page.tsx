// src/app/(dashboard)/admin/page.tsx
import { redirect } from 'next/navigation';
import { getProfileDataFresh } from '@/core/services/profile.service';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Settings,
  ArrowRight,
} from 'lucide-react';

const cards = [
  {
    href: '/admin/usuarios',
    icon: Users,
    title: 'Usuários',
    description: 'Gerencie contas, planos e cache de usuários.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    href: '/admin/assinaturas',
    icon: CreditCard,
    title: 'Assinaturas',
    description: 'Visão geral de todas as assinaturas e status de pagamento.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    href: '/admin/sistema',
    icon: Settings,
    title: 'Sistema',
    description: 'Cache, tokens, crons, Asaas sandbox e ferramentas de teste.',
    color: 'text-petroleum',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
];

export default async function AdminDashboardPage() {
  const result = await getProfileDataFresh();
  if (!result.success || !result.profile) redirect('/');

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-[16px] font-bold uppercase tracking-wider text-petroleum">
          Painel Administrativo
        </h1>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Logado como <strong>{result.profile.username}</strong>
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group flex items-start gap-4 p-5 bg-white rounded-xl border ${card.border} hover:shadow-md transition-all`}
            >
              <div className={`p-2.5 rounded-lg ${card.bg} shrink-0`}>
                <card.icon size={20} className={card.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-petroleum">
                  {card.title}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {card.description}
                </p>
              </div>
              <ArrowRight
                size={16}
                className="text-slate-300 group-hover:text-petroleum transition-colors shrink-0 mt-1"
              />
            </Link>
          ))}
      </div>
    </div>
  );
}
