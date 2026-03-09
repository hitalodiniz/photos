'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Crown, ImageIcon, FileCheck, ExternalLink, FolderOpen } from 'lucide-react';
import { RelatorioBasePage } from '@/components/ui';
import {
  RelatorioSearchInput,
} from '@/components/ui/RelatorioBasePage';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import { listAdminUsers, type AdminUserRow } from '@/actions/admin.actions';

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [cpfFilter, setCpfFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminUsers({
      email: emailFilter.trim() || undefined,
      cpfCnpj: cpfFilter.trim() || undefined,
    });
    setLoading(false);
    if (result.success && result.data) setData(result.data);
    else setData([]);
  }, [emailFilter, cpfFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <RelatorioBasePage
      title="Admin – Usuários"
      onBack={() => router.push('/dashboard')}
      footerStatusText={
        loading ? 'Carregando...' : `${data.length} usuário(s)`
      }
      headerContent={
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <RelatorioSearchInput
            value={emailFilter}
            onChange={setEmailFilter}
            placeholder="Buscar por nome, e-mail ou usuário..."
            className="flex-1 min-w-0 max-w-md"
          />
          <RelatorioSearchInput
            value={cpfFilter}
            onChange={setCpfFilter}
            placeholder="Buscar por CPF/CNPJ..."
            className="flex-1 min-w-0 max-w-xs"
          />
        </div>
      }
    >
      <div className="bg-white border border-slate-200 rounded-luxury overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Carregando usuários...
          </div>
        ) : (
          <RelatorioTable<AdminUserRow>
            data={data}
            columns={[
              {
                header: 'Nome',
                accessor: (r) => (
                  <div className="font-medium text-petroleum">
                    {r.full_name || r.username || '—'}
                  </div>
                ),
                icon: User,
                sortKey: 'full_name',
              },
              {
                header: 'Plano atual',
                accessor: (r) => (
                  <div className="flex items-center gap-1.5">
                    <Crown size={12} className="text-gold" />
                    <span className="font-medium text-slate-700">{r.plan_key}</span>
                  </div>
                ),
                icon: Crown,
                sortKey: 'plan_key',
              },
              {
                header: 'Qtd galerias ativas',
                accessor: (r) => (
                  <div className="flex items-center gap-1.5">
                    <ImageIcon size={12} className="text-slate-400" />
                    <span>{r.gallery_count}</span>
                  </div>
                ),
                icon: ImageIcon,
                sortKey: 'gallery_count',
              },
              {
                header: 'Status da assinatura',
                accessor: (r) => (
                  <div className="flex items-center gap-1.5">
                    <FileCheck size={12} className="text-slate-400" />
                    <span className="text-slate-600">
                      {r.subscription_status || '—'}
                    </span>
                  </div>
                ),
                icon: FileCheck,
                sortKey: 'subscription_status',
              },
              {
                header: 'Ação',
                accessor: (r) => (
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={`/admin/usuarios/${r.id}/galerias`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-petroleum hover:text-petroleum/80 uppercase tracking-wide"
                    >
                      <FolderOpen size={12} />
                      Galerias
                    </a>
                    <a
                      href={`/dashboard?impersonate=${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold hover:text-gold/80 uppercase tracking-wide"
                    >
                      <ExternalLink size={12} />
                      Simular Painel
                    </a>
                  </div>
                ),
                align: 'right',
              },
            ]}
            emptyMessage="Nenhum usuário encontrado."
            itemsPerPage={15}
          />
        )}
      </div>
    </RelatorioBasePage>
  );
}
