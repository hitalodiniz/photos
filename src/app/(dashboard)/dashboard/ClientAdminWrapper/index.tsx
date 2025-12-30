'use client';

import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Filter, Plus, Search } from 'lucide-react';
import { Toast, ConfirmationModal } from '@/components/sections/DashboardUI';
import { getGalerias, deleteGaleria } from '@/actions/galeria';

import type { Galeria } from './types';
import CreateGaleriaForm from './CreateGaleriaForm';
import EditGaleriaModal from './EditGaleriaModal';
import Filters from './Filters';
import GaleriaList from './GaleriaList';

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

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [galeriaToDelete, setGaleriaToDelete] = useState<Galeria | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [galeriaToEdit, setGaleriaToEdit] = useState<Galeria | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      setGalerias(initialGalerias ?? []);
    });
  }, [initialGalerias]);

  const handleUpdate = (success: boolean, data: any) => {
    if (success && data?.id) {
      // O "?." e "data.id" evitam o erro que você recebeu
      setGaleriaToEdit(null);
      setUpdatingId(null);
      setGalerias((prev) =>
        prev.map((g) => (g.id === data.id ? { ...g, ...data } : g)),
      );

      // Lógica do seu Toast
      setToastType('success');
      setToastMessage('Galeria atualizada com sucesso!');
      setGaleriaToEdit(null);
      setUpdatingId(null);
      setGalerias((prev) =>
        prev.map((g) => (g.id === data.id ? { ...g, ...data } : g)),
      );
      setToastMessage('');
      setTimeout(() => {
        setToastType('success');
        setToastMessage(`Galeria atualizada com sucesso!`);
      }, 300);
      setGalerias((prev) => prev.map((g) => (g.id === data.id ? data : g)));
    } else {
      setUpdatingId(null);
      setToastType('error');
      setToastMessage(typeof data === 'string' ? data : 'Erro ao atualizar.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!galeriaToDelete) return;
    setIsDeleting(true);
    const result = await deleteGaleria(galeriaToDelete.id);

    if (result.success) {
      setToastType('success');
      setToastMessage(result.message || 'Excluído com sucesso');
      setGalerias((prev) => prev.filter((g) => g.id !== galeriaToDelete.id));
    } else {
      setToastType('error');
      setToastMessage(result.error || 'Erro ao excluir');
    }
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
    setToastType(ok ? 'success' : 'error');
    setToastMessage(message);
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
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#D4AF37]/5 text-[#D4AF37] border border-[#D4AF37]/10">
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
          <div className="flex flex-col md:flex-row items-center bg-[#FAF7ED] border border-[#D4AF37]/30 shadow-sm rounded-[24px] md:rounded-full overflow-hidden transition-all duration-300">
            {/* Identificador de Filtros */}
            <div className="flex items-center gap-2.5 px-8 py-4 bg-white/40 border-b md:border-b-0 md:border-r border-[#D4AF37]/20">
              <Filter size={14} className="text-[#D4AF37]" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
                Filtros
              </span>
            </div>

            {/* Área de Filtros */}
            <div className="flex-1 w-full px-4 py-1.5">
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
        {/* Contador Flutuante com Rolagem */}
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Pílula de Contagem Premium */}
          <div className="flex items-center gap-3 bg-white border-2 border-[#D4AF37]/20 px-6 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-105 transition-all">
            <LayoutGrid size={16} className="text-[#D4AF37]" />
            <div className="flex items-center gap-2 text-base tracking-tight">
              Exibindo
              <span className="text-[#D4AF37] font-black text-lg tabular-nums">
                {visibleGalerias.length}
              </span>
              <span className="text-slate-200 font-medium">/</span>
              <span className="text-slate-800 tabular-nums text-lg font-black ">
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
        bg-[#F3E5AB] hover:bg-[#e6d595] text-slate-900 
        disabled:opacity-70 disabled:cursor-wait disabled:shadow-none
              mt-8 px-8 py-3 rounded-full border border-[#D4AF37]/30 
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
        {filteredGalerias.length > cardsToShow && (
          <div className="mt-12 flex justify-center pb-16">
            <button
              onClick={() => setCardsToShow((prev) => prev + CARDS_PER_PAGE)}
              className="group relative overflow-hidden rounded-full bg-[#1A1C1E] text-white px-12 py-4 text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
            >
              <span className="relative z-10">Expandir Acervo</span>
              <div className="absolute inset-0 bg-[#D4AF37] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
            </button>
          </div>
        )}
      </main>

      <ConfirmationModal
        galeria={galeriaToDelete}
        isOpen={!!galeriaToDelete}
        onClose={() => setGaleriaToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
      <EditGaleriaModal
        galeria={galeriaToEdit}
        isOpen={!!galeriaToEdit}
        onClose={() => setGaleriaToEdit(null)}
        onSuccess={handleUpdate}
      />
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  );
}
