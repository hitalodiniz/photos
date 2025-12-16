// app/dashboard/ClientAdminWrapper/index.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Toast, ConfirmationModal, EditGaleriaModal } from "@/components/DashboardUI";
import { getGalerias, deleteGaleria, updateGaleria } from "@/actions/galeria";

import type { Galeria } from "./types";
import CreateGaleriaForm from "./CreateGaleriaForm";
import Filters from "./Filters";
import GaleriaList from "./GaleriaList";

const CARDS_PER_PAGE = 12;

function normalizeString(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

interface ClientAdminWrapperProps {
  initialGalerias: Galeria[];
}

export default function ClientAdminWrapper({ initialGalerias }: ClientAdminWrapperProps) {
  const [galerias, setGalerias] = useState<Galeria[]>(initialGalerias ?? []);
  const [cardsToShow, setCardsToShow] = useState(
    Math.min(initialGalerias?.length ?? 0, CARDS_PER_PAGE)
  );
  const [loadingMore, setLoadingMore] = useState(false);

  const [filterName, setFilterName] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [galeriaToDelete, setGaleriaToDelete] = useState<Galeria | null>(null);
  const [galeriaToEdit, setGaleriaToEdit] = useState<Galeria | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ------------------------
  // Carregar / recarregar galerias do server
  // ------------------------
  const reloadGalerias = async () => {
    const result = await getGalerias();
    if (result.success && Array.isArray(result.data)) {
      setGalerias(result.data);
      setCardsToShow(Math.min(result.data.length, CARDS_PER_PAGE));
    } else if (!result.success) {
      setToastType("error");
      setToastMessage(result.error || "Erro ao carregar galerias.");
    }
  };

  // ------------------------
  // Filtros
  // ------------------------
  const filteredGalerias = useMemo(() => {
    if (!Array.isArray(galerias)) return [];

    const nameLower = normalizeString(filterName);
    const locationLower = normalizeString(filterLocation);
    const dateFilter = filterDate;

    return galerias.filter((g) => {
      const titleNorm = normalizeString(g.title || "");
      const clientNorm = normalizeString(g.client_name || "");
      const locNorm = normalizeString(g.location || "");
      const galeriaDate = g.date.substring(0, 10);

      const matchesName =
        !nameLower ||
        titleNorm.includes(nameLower) ||
        clientNorm.includes(nameLower);

      const matchesLocation = !locationLower || locNorm.includes(locationLower);

      const matchesDate = !dateFilter || galeriaDate === dateFilter;

      return matchesName && matchesLocation && matchesDate;
    });
  }, [galerias, filterName, filterLocation, filterDate]);

  const visibleGalerias = useMemo(
    () => filteredGalerias.slice(0, cardsToShow),
    [filteredGalerias, cardsToShow]
  );

  const hasMore = filteredGalerias.length > cardsToShow;

  // ------------------------
  // Infinite scroll simples (load more on scroll bottom)
  // ------------------------
  useEffect(() => {
    if (!hasMore) return;
    const handleScroll = () => {
      if (loadingMore) return;
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.body.scrollHeight;

      if (scrollY + viewportHeight + 200 >= fullHeight) {
        setLoadingMore(true);
        setTimeout(() => {
          setCardsToShow((prev) =>
            Math.min(prev + CARDS_PER_PAGE, filteredGalerias.length)
          );
          setLoadingMore(false);
        }, 200);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, filteredGalerias.length]);

  // ------------------------
  // Reset filtros
  // ------------------------
  const resetFilters = () => {
    setFilterName("");
    setFilterLocation("");
    setFilterDate("");
    setCardsToShow(Math.min(galerias.length, CARDS_PER_PAGE));
  };

  // ------------------------
  // Delete flow
  // ------------------------
  const handleDelete = (galeria: Galeria) => {
    setGaleriaToDelete(galeria);
  };

  const handleConfirmDelete = async () => {
    if (!galeriaToDelete) return;
    setIsDeleting(true);

    const result = await deleteGaleria(galeriaToDelete.id);

    if (result.success) {
      setToastType("success");
      setToastMessage("Galeria deletada com sucesso!");
      await reloadGalerias();
    } else {
      setToastType("error");
      setToastMessage(result.error || "Erro ao deletar galeria.");
    }

    setIsDeleting(false);
    setGaleriaToDelete(null);
  };

  // ------------------------
  // Edit flow
  // ------------------------
  const handleEdit = (galeria: Galeria) => {
    setGaleriaToEdit(galeria);
  };

  const handleUpdate = async (
    galeriaId: string,
    updatedData: Partial<Galeria> & { isPublic: boolean }
  ) => {
    const result = await updateGaleria(galeriaId, updatedData);

    if (result.success) {
      setToastType("success");
      setToastMessage("Galeria atualizada com sucesso!");
      await reloadGalerias();
    } else {
      setToastType("error");
      setToastMessage(result.error || "Erro ao atualizar galeria.");
    }

    setGaleriaToEdit(null);
  };

  // ------------------------
  // Create flow (via CreateGaleriaForm)
  // ------------------------
  const handleCreateResult = async (ok: boolean, message: string) => {
    setToastType(ok ? "success" : "error");
    setToastMessage(message);
    if (ok) {
      await reloadGalerias();
    }
  };

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      {/* Coluna esquerda: criação de galeria */}
      <div className="order-1 lg:order-1">
        <div className="sticky top-8 h-fit rounded-2xl border border-[#E0E3E7] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#1F1F1F]">
            Nova galeria
          </h2>

          <CreateGaleriaForm onSuccess={handleCreateResult} />
        </div>
      </div>

      {/* Coluna direita: lista de galerias */}
      <div className="order-2 lg:order-2">
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
            <svg
              className="mb-4 h-20 w-20 text-[#B3261E] opacity-20"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 6h-8l-2-2H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
            </svg>
            <p className="text-sm font-medium text-[#1F1F1F]">
              Nenhuma galeria encontrada com os filtros atuais.
            </p>
            <button
              onClick={resetFilters}
              className="mt-3 rounded-full bg-[#E9EEF6] px-4 py-1.5 text-xs font-medium text-[#444746] hover:bg-[#E2E7EB]"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <GaleriaList
              galerias={visibleGalerias}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={isDeleting}
            />

            {hasMore && (
              <div className="flex justify-center py-8 text-sm text-[#444746]">
                {loadingMore ? (
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#0B57D0]" />
                    <span>Carregando mais galerias...</span>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setCardsToShow((prev) =>
                        Math.min(prev + CARDS_PER_PAGE, filteredGalerias.length)
                      )
                    }
                    className="rounded-full border border-[#E0E3E7] px-4 py-1.5 text-xs font-medium text-[#444746] hover:bg-[#F8FAFD]"
                  >
                    Carregar mais
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* Modal de confirmação de delete */}
      <ConfirmationModal
        galeria={galeriaToDelete}
        isOpen={!!galeriaToDelete}
        onClose={() => setGaleriaToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Modal de edição */}
      <EditGaleriaModal
        galeriaToEdit={galeriaToEdit}
        isOpen={!!galeriaToEdit}
        onClose={() => setGaleriaToEdit(null)}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
