// app/dashboard/ClientAdminWrapper/GaleriaCard.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  Lock,
  Globe,
  User,
  MessageCircle,
  Pencil,
  Trash2,
  FolderOpen
} from "lucide-react";
import type { Galeria } from "./types";

interface GaleriaCardProps {
  galeria: Galeria;
  onEdit: (galeria: Galeria) => void;
  onDelete: (galeria: Galeria) => void;
  isDeleting: boolean;
  isUpdating?: boolean;
}

export default function GaleriaCard({ galeria, onEdit, onDelete, isDeleting, isUpdating = false }: GaleriaCardProps) {
  const router = useRouter();

  // Função para formatar data ignorando o fuso horário (Timezone) do navegador
  const formatDateSafely = (dateString: string) => {
    if (!dateString) return "---";
    // Divide a string "2025-11-04" e reorganiza para o padrão brasileiro sem usar 'new Date' direto
    const [datePart] = dateString.split("T");
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  };

  const getImageUrl = (fileId: string | null) => {
    if (!fileId) return "https://placehold.co/400x250?text=Sem+Capa";
    // Endpoint otimizado e estável para exibir miniaturas do Google Drive
    return `https://lh3.googleusercontent.com/d/${fileId}=w400-h250-p`;
  };

  const imageUrl = galeria.cover_image_url?.includes("http")
    ? galeria.cover_image_url
    : getImageUrl(galeria.cover_image_url);

  const isPrivate = !galeria.is_public;

  return (
    <motion.div
      onClick={() => window.open(`/${galeria.slug}`, '_blank')}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-400 hover:shadow-md h-full"
      whileHover={{ y: -3 }}
      style={{ maxWidth: '320px' }}>
      {/* Overlay de Loading */}
      <AnimatePresence>
        {isUpdating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-all"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent"
            />
            <motion.span
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest"
            >
              Atualizando...
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Imagem de Capa */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-50 border-b border-gray-100">
        <img
          src={imageUrl}
          alt={galeria.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://placehold.co/400x250/F0F4F9/444746?text=Sem+Capa";
          }}
        />
        <div className="absolute top-2 left-2">
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight shadow-sm ${isPrivate ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
            }`}>
            {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
            {isPrivate ? "PRIVADA" : "PÚBLICA"}
          </span>
        </div>
      </div>

      {/* Conteúdo Compacto */}
      <div className="flex flex-col p-3.5 gap-y-2">
        <h3 className="line-clamp-1 text-sm font-bold text-gray-900 group-hover:text-blue-600">
          {galeria.title}
        </h3>

        {/* Metadados Agrupados */}
        <div className="space-y-1.5">
          {/* Cliente e Local */}
          <div className="flex items-center justify-between gap-x-2 text-[12px]">
            <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
              <User size={13} className="text-blue-500 flex-shrink-0" />
              <span className="truncate font-medium">{galeria.client_name}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
              <MapPin size={12} />
              <span className="truncate max-w-[70px]">{galeria.location || "---"}</span>
            </div>
          </div>

          {/* Data e Nome da Pasta */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar size={12} />
              {/* CORREÇÃO: Usando a função que ignora o fuso horário */}
              <span>{formatDateSafely(galeria.date)}</span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 max-w-[130px]">
              <FolderOpen size={11} className="flex-shrink-0" />
              <span className="truncate uppercase tracking-tighter">
                {galeria.drive_folder_name || "PASTA S/ NOME"}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé e Ações */}
        <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-3">
          {galeria.client_whatsapp ? (
            <a
              href={`https://wa.me/${galeria.client_whatsapp.replace(/\D/g, "")}`}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              className="flex items-center gap-1 text-[11px] font-bold text-green-600 hover:text-green-700"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          ) : <div />}

          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(galeria); }}
              className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(galeria); }}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}