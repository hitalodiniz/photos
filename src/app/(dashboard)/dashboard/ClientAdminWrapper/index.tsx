'use client';

import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Filter, Plus, Search, ChevronDown } from 'lucide-react';
import { getGalerias, deleteGaleria } from '@/core/services/galeria.service';

import type { Galeria } from '@/core/types/galeria';
import CreateGaleriaForm from './CreateGaleriaForm';
import EditGaleriaModal from './EditGaleriaModal';
import Filters from './Filters';
import GaleriaList from './GaleriaList';
import { ConfirmationModal, Toast } from '@/components/ui';

const CARDS_PER_PAGE = 6;

function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface ClientAdminWrapperProps {
  initialGalerias: Galeria[];
}

export default function ClientAdminWrapper({
  initialGalerias,
}: ClientAdminWrapperProps) {
  const [galerias, setGalerias] = useState<Galeria[]>(initialGalerias ?? []);
  const [cardsToShow, setCardsToShow] = useState(CARDS_PER_PAGE);
  const [filterName, setFilterName] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');

  const [toastConfig, setToastConfig] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [galeriaToDelete, setGaleriaToDelete] = useState<Galeria | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [galeriaToEdit, setGaleriaToEdit] = useState<Galeria | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      setGalerias(initialGalerias ?? []);
    });
  }, [initialGalerias]);

  // No ClientAdminWrapper (index)
  const handleUpdate = (success: boolean, data: any) => {
    if (success && typeof data === 'object') {
      // Caso de sucesso: atualiza a lista
      setGalerias((prev) => prev.map((g) => (g.id === data.id ? data : g)));
      setToastConfig({
        message: 'Galeria atualizada com sucesso!',
        type: 'success',
      });
      setGaleriaToEdit(null);
    } else {
      // Caso de erro (recebido do Edit ou do Create)
      setToastConfig({
        message: typeof data === 'string' ? data : 'Erro na operação',
        type: 'error',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!galeriaToDelete) return;

    setIsDeleting(true);
    const result = await deleteGaleria(galeriaToDelete.id);

    if (result.success) {
      // 1. Remove a galeria da lista local
      setGalerias((prev) => prev.filter((g) => g.id !== galeriaToDelete.id));

      // 2. Feedback de sucesso no novo Toast
      setToastConfig({
        message: result.message || 'Galeria excluída com sucesso.',
        type: 'success',
      });
    } else {
      // 3. Feedback de erro no novo Toast
      setToastConfig({
        message: result.error || 'Não foi possível excluir a galeria.',
        type: 'error',
      });
    }

    // 4. Limpa estados de exclusão
    setIsDeleting(false);
    setGaleriaToDelete(null);
  };
  const filteredGalerias = useMemo(() => {
    if (!Array.isArray(galerias)) return [];

    const nameLower = normalizeString(filterName);
    const locationLower = normalizeString(filterLocation);

    return galerias.filter((g) => {
      const titleNorm = normalizeString(g.title || '');
      const clientNorm = normalizeString(g.client_name || '');
      const locNorm = normalizeString(g.location || '');
      const galeriaDate = g.date?.substring(0, 10) || '';

      // Lógica para Nome, Local e Data
      const matchesBasic =
        (!nameLower ||
          titleNorm.includes(nameLower) ||
          clientNorm.includes(nameLower)) &&
        (!locationLower || locNorm.includes(locationLower)) &&
        (!filterDate || galeriaDate === filterDate);

      // Nova lógica: Categoria (ex: 'esporte', 'casamento')
      const matchesCategory = !filterCategory || g.category === filterCategory;

      // Nova lógica: Modelo de Negócio (Contrato vs Venda Direta)
      // Convertemos o booleano do banco para string para bater com o valor do select ('true'/'false')
      const matchesType =
        !filterType || String(g.has_contracting_client) === filterType;

      return matchesBasic && matchesCategory && matchesType;
    });
  }, [
    galerias,
    filterName,
    filterLocation,
    filterDate,
    filterCategory,
    filterType,
  ]);

  const visibleGalerias = useMemo(
    () => filteredGalerias.slice(0, cardsToShow),
    [filteredGalerias, cardsToShow],
  );

  const resetFilters = () => {
    setFilterName('');
    setFilterLocation('');
    setFilterDate('');
    setCardsToShow(CARDS_PER_PAGE);
    setFilterCategory(''); // Limpa categoria
    setFilterType(''); // Limpa tipo
  };

  const handleCreateResult = async (ok: boolean, message: string) => {
    setToastConfig({
      message: message,
      type: ok ? 'success' : 'error',
    });

    if (ok) {
      const result = await getGalerias();
      if (result.success) setGalerias(result.data);
    }
  };

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[340px_1fr] px-2 md:px-4 py-4 bg-[#F8F9FA] min-h-screen font-sans">
      {/* COLUNA ESQUERDA: FORMULÁRIO */}
      <aside className="order-2 lg:order-1">
        <div className="lg:sticky lg:top-16 h-fit rounded-[24px] border border-[#E0E3E7] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#D4AF37]/5 text-[#D4AF37] border border-gold/10">
              <Plus size={24} />
            </div>
            <h2 className="text-base font-bold text-[#3C4043] tracking-tight">
              Nova galeria
            </h2>
          </div>
          <CreateGaleriaForm onSuccess={handleCreateResult} />
        </div>
      </aside>

      {/* COLUNA DIREITA: CONTEÚDO */}
      <main className="order-1 lg:order-2 space-y-4">
        {/* PÍLULA MESTRE: TÍTULO + FILTROS + STATUS */}
        <header className="w-full mb-2">
          <div className="flex flex-col md:flex-row items-center border border-gold/30 shadow-sm rounded-[24px] md:rounded-full overflow-hidden transition-all duration-300">
            {/* Área de Filtros */}
            <div className="flex-1 w-full px-2 py-1">
              <Filters
                filterName={filterName}
                filterLocation={filterLocation}
                filterDate={filterDate}
                filterCategory={filterCategory}
                filterType={filterType}
                setFilterName={setFilterName}
                setFilterLocation={setFilterLocation}
                setFilterDate={setFilterDate}
                setFilterCategory={setFilterCategory}
                setFilterType={setFilterType}
                resetFilters={resetFilters}
                variant="minimal"
              />
            </div>
          </div>
        </header>
        {/* Container Flutuante de Resultados */}
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Pílula de Contagem Premium */}
          <div className="flex items-center gap-3 bg-white border-2 border-gold/20 px-4 py-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-105 transition-all">
            <LayoutGrid size={16} className="text-[#D4AF37]" />
            <div className="flex items-center gap-2 text-[12px] md:text-[14px] tracking-tight">
              Exibindo
              <span className="text-[#D4AF37] font-black text-[12px] md:text-[14px] tabular-nums">
                {visibleGalerias.length}
              </span>
              <span className="text-slate-200 font-medium">/</span>
              <span className="text-slate-800 tabular-nums text-[12px] md:text-[14px] font-black ">
                {galerias.length}
              </span>
            </div>
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="min-h-[500px]">
          {filteredGalerias.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-gray-200 
            bg-white/50 py-16 text-center backdrop-blur-sm"
            >
              <Search className="text-[#D4AF37]/30 w-10 h-10 mb-6" />
              <p className="text-xl font-bold text-[#3C4043] tracking-tight">
                Busca sem resultados
              </p>
              <button
                onClick={resetFilters}
                className="items-center justify-center gap-3 px-2 py-4 
        rounded-2xl font-bold transition-all shadow-lg active:scale-95 
        text-[11px] md:text-xs tracking-[0.25em]
        bg-champagne-dark hover:bg-[#e6d595] text-slate-900 
        disabled:opacity-70 disabled:cursor-wait disabled:shadow-none
              mt-8 px-8 py-3 rounded-full border border-gold/30 
              text-[11px] font-bold text-[#D4AF37] 
              hover:bg-[#D4AF37] hover:text-white transition-all uppercase tracking-[0.3em]"
              >
                Limpar Busca
              </button>
            </div>
          ) : (
            <GaleriaList
              galerias={visibleGalerias}
              onEdit={(g) => setGaleriaToEdit(g)}
              onDelete={(g) => setGaleriaToDelete(g)}
              isDeleting={isDeleting}
              updatingId={updatingId}
            />
          )}
        </div>

        {/* BOTÃO CARREGAR MAIS */}
        {/* BOTÃO CARREGAR MAIS */}
        {filteredGalerias.length > cardsToShow && (
          <div className="mt-16 flex justify-center pb-20">
            <button
              onClick={() => setCardsToShow((prev) => prev + CARDS_PER_PAGE)}
              // 🎯 Estilo idêntico ao Submit: bg-slate-900, rounded-2xl, tracking editorial
              className="group flex items-center justify-center gap-3 rounded-2xl bg-slate-900 text-white px-14 py-4 text-[11px] font-bold uppercase tracking-[0.3em] transition-all active:scale-95 shadow-xl shadow-slate-900/20 hover:bg-black"
            >
              <ChevronDown
                size={16}
                className="text-[#D4AF37] transition-transform duration-300 group-hover:translate-y-1"
              />
              <span className="font-barlow">Expandir Acervo</span>
            </button>
          </div>
        )}
      </main>

      <ConfirmationModal
        isOpen={!!galeriaToDelete}
        onClose={() => setGaleriaToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Excluir Galeria"
        confirmText="Excluir"
        variant="danger"
        message={
          <p>
            Tem certeza que deseja excluir a galeria{' '}
            <strong>{galeriaToDelete?.title}</strong>?
            <span className="block mt-2 text-[#B3261E] font-bold">
              Esta ação não poderá ser desfeita.
            </span>
          </p>
        }
      />
      <EditGaleriaModal
        galeria={galeriaToEdit}
        isOpen={!!galeriaToEdit}
        onClose={() => setGaleriaToEdit(null)}
        onSuccess={handleUpdate}
      />
      {/* Certifique-se de usar o componente Toast.tsx que configuramos com Z-index 10001 */}
      {toastConfig && (
        <Toast
          message={toastConfig.message}
          type={toastConfig.type}
          onClose={() => setToastConfig(null)}
        />
      )}
    </div>
  );
}
