// components/DashboardUI/ConfirmationModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Galeria } from "@/app/dashboard/ClientAdminWrapper/types";

interface ConfirmationModalProps {
  galeria: Galeria | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export default function ConfirmationModal({
  galeria,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && galeria && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Excluir galeria?
            </h2>

            <p className="mb-4 text-sm text-gray-700">
              Tem certeza que deseja excluir a galeria{" "}
              <span className="font-semibold">{galeria.title}</span>? Essa ação
              não pode ser desfeita.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                )}
                Deletar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
