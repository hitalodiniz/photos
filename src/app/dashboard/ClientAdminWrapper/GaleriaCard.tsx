// app/dashboard/ClientAdminWrapper/GaleriaCard.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Galeria } from "./types";

interface GaleriaCardProps {
  galeria: Galeria;
  onEdit: (galeria: Galeria) => void;
  onDelete: (galeria: Galeria) => void;
  isDeleting: boolean;
}

export default function GaleriaCard({
  galeria,
  onEdit,
  onDelete,
  isDeleting,
}: GaleriaCardProps) {
  const router = useRouter();

  const seed = galeria.id.length;
  const coverColors = ["556B2F", "FF7F50", "4682B4", "9370DB", "20B2AA"];
  const color = coverColors[seed % coverColors.length];
  const titleText = encodeURIComponent(galeria.title.split(" ")[0] || "Galeria");
  const placeholderUrl = `https://placehold.co/600x400/${color}/FFFFFF/png?text=${titleText}&font=roboto`;
  const imageUrl = galeria.cover_image_url || placeholderUrl;

  const isPrivate = !galeria.is_public;

  const openGaleria = () => {
    router.push(`/galeria/${galeria.slug}`);
  };

  return (
    <motion.div
      onClick={openGaleria}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white shadow-sm transition hover:border-[#0B57D0] hover:shadow-md"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#F0F4F9]">
        <img
          src={imageUrl}
          alt={`Capa da galeria: ${galeria.title}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
          {new Date(galeria.date).toLocaleDateString("pt-BR")}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <h3
            className="truncate text-sm font-medium text-[#1F1F1F] group-hover:text-[#0B57D0]"
            title={galeria.title}
          >
            {galeria.title}
          </h3>

          <div className="mt-1 flex items-center gap-1 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                isPrivate
                  ? "bg-[#FFDAD6] text-[#B3261E]"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {isPrivate ? "Privada" : "Pública"}
            </span>
            {galeria.password && isPrivate && (
              <span className="text-[11px] text-gray-600">
                | senha definida
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1 text-xs text-[#444746]">
            <span className="font-medium">
              {galeria.client_name || "Cliente não informado"}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#444746]">
            <span>{galeria.location || "Sem local"}</span>
          </div>

          {galeria.client_whatsapp && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#25D366]">
              <a
                href={`https://wa.me/${galeria.client_whatsapp.replace(/\D/g, "")}`}
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                WhatsApp do cliente
              </a>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#E0E3E7] pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(galeria);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] hover:bg-[#E9EEF6] hover:text-[#0B57D0]"
            title="Editar galeria"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M16.862 4.487l1.651-1.65a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              <path d="M19.5 7.125L17.25 4.875" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(galeria);
            }}
            disabled={isDeleting}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#B3261E] hover:bg-[#FFDAD6] disabled:cursor-not-allowed disabled:opacity-60"
            title="Mover para lixeira"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
