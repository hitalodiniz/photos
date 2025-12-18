// app/dashboard/ClientAdminWrapper/index.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Toast, ConfirmationModal } from "@/components/DashboardUI";
import { getGalerias, deleteGaleria } from "@/actions/galeria";

import type { Galeria } from "./types";
import CreateGaleriaForm from "./CreateGaleriaForm";
import EditGaleriaModal from "./EditGaleriaModal";
import Filters from "./Filters";
import GaleriaList from "./GaleriaList";

const CARDS_PER_PAGE = 6;

function normalizeString(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

interface ClientAdminWrapperProps {
  initialGalerias: Galeria[];
}

export default function ClientAdminWrapper({ initialGalerias }: ClientAdminWrapperProps) {
  // Estado principal que rege a lista exibida
  const [galerias, setGalerias] = useState<Galeria[]>(initialGalerias ?? []);
  const [cardsToShow, setCardsToShow] = useState(
    Math.min(initialGalerias?.length ?? 0, CARDS_PER_PAGE)
  );
  const [loadingMore, setLoadingMore] = useState(false);

  // Estados de Filtros
  const [filterName, setFilterName] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Estados de Feedback (Toast)
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success")

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Estados de Modais (Delete e Edit)
  const [galeriaToDelete, setGaleriaToDelete] = useState<Galeria | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [galeriaToEdit, setGaleriaToEdit] = useState<Galeria | null>(null);

  // Sincroniza estado se as props iniciais mudarem (ex: navegação)
  useEffect(() => {
    setGalerias(initialGalerias ?? []);
  }, [initialGalerias]);

  // ------------------------
  // Lógica de Atualização (Edit Flow)
  // ------------------------
  const handleUpdate = (success: boolean, data: any) => {
    
    if (success) {
      // 1. Primeiro fechamos o modal para evitar conflito de renderização
      setGaleriaToEdit(null);
      setUpdatingId(null); // Remove o estado de loading do card

      // 2. Atualizamos os dados locais
      setGalerias((prev) => {
        const novaLista = prev.map((g) => (g.id === data.id ? { ...g, ...data } : g));
        return [...novaLista];
      });

      // 3. O SEGREDO: Limpamos o estado e usamos um delay maior
      // para garantir que o Next.js terminou de revalidar a página no background
      setToastMessage("");

      setTimeout(() => {
        setToastType("success");
        setToastMessage(`Galeria atualizada!`);
      }, 500);
    } else {
      setUpdatingId(null);
      setToastType("error");
      setToastMessage(typeof data === "string" ? data : "Erro ao atualizar galeria toast index.");
    }
  };

  // ------------------------
  // Lógica de Deleção
  // ------------------------
  const handleConfirmDelete = async () => {
    if (!galeriaToDelete) return;
    setIsDeleting(true);

    const result = await deleteGaleria(galeriaToDelete.id);

    if (result.success) {
      setToastType("success");
      setToastMessage(result.message || "Excluído com sucesso");
      // Remove da lista local imediatamente
      setGalerias((prev) => prev.filter((g) => g.id !== galeriaToDelete.id));
    } else {
      setToastType("error");
      setToastMessage(result.error || "Erro ao excluir");
    }

    setIsDeleting(false);
    setGaleriaToDelete(null);
  };

  // ------------------------
  // Filtros e Visibilidade
  // ------------------------
  const filteredGalerias = useMemo(() => {
    if (!Array.isArray(galerias)) return [];

    const nameLower = normalizeString(filterName);
    const locationLower = normalizeString(filterLocation);

    return galerias.filter((g) => {
      const titleNorm = normalizeString(g.title || "");
      const clientNorm = normalizeString(g.client_name || "");
      const locNorm = normalizeString(g.location || "");
      const galeriaDate = g.date?.substring(0, 10) || "";

      const matchesName = !nameLower || titleNorm.includes(nameLower) || clientNorm.includes(nameLower);
      const matchesLocation = !locationLower || locNorm.includes(locationLower);
      const matchesDate = !filterDate || galeriaDate === filterDate;

      return matchesName && matchesLocation && matchesDate;
    });
  }, [galerias, filterName, filterLocation, filterDate]);

  const visibleGalerias = useMemo(
    () => filteredGalerias.slice(0, cardsToShow),
    [filteredGalerias, cardsToShow]
  );

  const hasMore = filteredGalerias.length > cardsToShow;

  const resetFilters = () => {
    setFilterName("");
    setFilterLocation("");
    setFilterDate("");
    setCardsToShow(Math.min(galerias.length, CARDS_PER_PAGE));
  };

  const handleCreateResult = async (ok: boolean, message: string) => {
    setToastType(ok ? "success" : "error");
    setToastMessage(message);
    if (ok) {
      // Para criação, recarregamos do servidor para obter os dados completos e IDs
      const result = await getGalerias();
      if (result.success) setGalerias(result.data);
    }
  };

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] py-2">
      {/* Coluna Esquerda: Formulário de Criação */}
      <div className="order-1">
        <div className="sticky top-8 h-fit rounded-2xl border border-[#E0E3E7] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#1F1F1F]">Nova galeria</h2>
          <CreateGaleriaForm onSuccess={handleCreateResult} />
        </div>
      </div>

      {/* Coluna Direita: Lista e Filtros */}
      <div className="order-2">
        <h2 className="mb-3 border-b pb-2 text-2xl font-extrabold text-gray-800">
          Galerias recentes ({filteredGalerias.length} de {galerias.length})
        </h2>

        <Filters
          filterName={filterName}
          filterLocation={filterLocation}
          filterDate={filterDate}
          setFilterName={setFilterName}
          setFilterLocation={setFilterLocation}
          setFilterDate={setFilterDate}
          resetFilters={resetFilters}
        />

        {filteredGalerias.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E0E3E7] bg-white py-16 text-center">
            <p className="text-sm font-medium text-gray-500">Nenhuma galeria encontrada.</p>
            <button onClick={resetFilters} className="mt-2 text-xs text-blue-600 underline">Limpar filtros</button>
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

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setCardsToShow((prev) => prev + CARDS_PER_PAGE)}
              className="rounded-full border px-6 py-2 text-xs font-bold hover:bg-gray-50"
            >
              Carregar mais
            </button>
          </div>
        )}
      </div>

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
        onSuccess={handleUpdate} // Esta prop deve ser chamada no Modal
        isUpdating={updatingId}
      />

      {/* Componentes de Feedback e Modais */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage("")}
        />
      )}
    </div>
  );
}