'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ImageIcon, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { RelatorioBasePage } from '@/components/ui';
import { RelatorioTable } from '@/components/ui/RelatorioTable';
import {
  getGaleriasForAdmin,
  adminGallerySetVisibility,
  type AdminGaleriaRow,
} from '@/actions/admin.actions';

export default function AdminUsuariosGaleriasPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [data, setData] = useState<AdminGaleriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const result = await getGaleriasForAdmin(userId);
    setLoading(false);
    if (result.success && result.data) setData(result.data);
    else {
      setData([]);
      if (result.error) setError(result.error);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVisibility = async (
    galeriaId: string,
    action: 'reactivate' | 'hide',
  ) => {
    setActionLoadingId(galeriaId);
    const result = await adminGallerySetVisibility(galeriaId, userId, action);
    setActionLoadingId(null);
    if (result.success) await load();
    else setError(result.error ?? 'Erro na ação.');
  };

  if (!userId) {
    return (
      <RelatorioBasePage
        title="Admin – Galerias do usuário"
        onBack={() => router.push('/admin/usuarios')}
      >
        <p className="text-slate-500">ID do usuário não informado.</p>
      </RelatorioBasePage>
    );
  }

  return (
    <RelatorioBasePage
      title="Admin – Galerias do usuário"
      onBack={() => router.push('/admin/usuarios')}
      footerStatusText={
        loading ? 'Carregando...' : `${data.length} galeria(s) · userId: ${userId}`
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-luxury bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-luxury overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Carregando galerias...
            </div>
          ) : (
            <RelatorioTable<AdminGaleriaRow>
              data={data}
              columns={[
                {
                  header: 'Título',
                  accessor: (r) => (
                    <div className="font-medium text-petroleum">{r.title}</div>
                  ),
                  icon: ImageIcon,
                  sortKey: 'title',
                },
                {
                  header: 'Slug',
                  accessor: (r) => (
                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {r.slug}
                    </div>
                  ),
                  sortKey: 'slug',
                },
                {
                  header: 'Data',
                  accessor: (r) => (
                    <span className="text-slate-600">
                      {r.date ? r.date.slice(0, 10) : '—'}
                    </span>
                  ),
                  sortKey: 'date',
                },
                {
                  header: 'Pública',
                  accessor: (r) => (
                    <span
                      className={
                        r.is_public
                          ? 'text-emerald-600 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      {r.is_public ? 'Sim' : 'Não'}
                    </span>
                  ),
                  sortKey: 'is_public',
                },
                {
                  header: 'Auto-oculta',
                  accessor: (r) => (
                    <span
                      className={
                        r.auto_archived
                          ? 'text-amber-600 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      {r.auto_archived ? 'Sim' : 'Não'}
                    </span>
                  ),
                  sortKey: 'auto_archived',
                },
                {
                  header: 'Arquivada',
                  accessor: (r) => (
                    <span className={r.is_archived ? 'text-slate-600' : 'text-slate-400'}>
                      {r.is_archived ? 'Sim' : 'Não'}
                    </span>
                  ),
                  sortKey: 'is_archived',
                },
                {
                  header: 'Ações',
                  accessor: (r) => (
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.is_deleted ? (
                        <span className="text-[10px] text-slate-400">Excluída</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVisibility(r.id, 'reactivate');
                            }}
                            disabled={actionLoadingId === r.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                          >
                            {actionLoadingId === r.id ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : (
                              <Eye size={10} />
                            )}
                            Forçar reativação
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVisibility(r.id, 'hide');
                            }}
                            disabled={actionLoadingId === r.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                          >
                            {actionLoadingId === r.id ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : (
                              <EyeOff size={10} />
                            )}
                            Ocultar manualmente
                          </button>
                        </>
                      )}
                    </div>
                  ),
                  align: 'right',
                },
              ]}
              emptyMessage="Nenhuma galeria encontrada."
              itemsPerPage={15}
            />
          )}
        </div>
      </div>
    </RelatorioBasePage>
  );
}
