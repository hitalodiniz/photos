"use client";

import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Lock,
  Globe,
  User,
  MessageCircle,
  Pencil,
  Trash2,
  FolderOpen,
  Loader2
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

  const formatDateSafely = (dateString: string) => {
    if (!dateString) return "---";
    const [datePart] = dateString.split("T");
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  };

  const getImageUrl = (fileId: string | null) => {
    if (!fileId) return "https://placehold.co/400x250?text=Sem+Capa";
    return `https://lh3.googleusercontent.com/u/0/d/${fileId}=w400-h250-p-k-nu`;
  };

  const imageUrl = galeria.cover_image_url?.includes("http")
    ? galeria.cover_image_url
    : getImageUrl(galeria.cover_image_url);

  const isPrivate = !galeria.is_public;
  const rowStyle = "flex items-center gap-2 text-[#4F5B66] min-w-0";

  return (
    <div
      onClick={() => window.open(`/${galeria.slug}`, '_blank')}
      className="group relative flex cursor-pointer flex-col 
      overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 w-full"
      style={{ maxWidth: '400px' }}
    >
      {/* Overlay de Loading */}
      {isUpdating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
          <span className="mt-2 text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">
            Atualizando
          </span>
        </div>
      )}

      {/* Imagem de Capa */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-50 border-b border-gray-50">
        <img
          src={imageUrl}
          alt={`Capa da galeria ${galeria.title}`}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://placehold.co/400x250/F8F9FA/D4AF37?text=Sem+Capa";
          }}
        />

        <div className="absolute top-2 left-2">
          <span
            title={isPrivate ? "Esta galeria é privada" : "Esta galeria é pública"}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 
            text-[12px] font-bold tracking-[0.05em] ${isPrivate
                ? "bg-slate-600/80 text-white"
                : "border-[#D4AF37]/30 bg-[#FAF7ED] text-[#4F5B66] shadow-sm "
              }`}
          >
            {isPrivate ? <Lock size={9} strokeWidth={3} /> : <Globe size={9} strokeWidth={3} />}
            {isPrivate ? "Privada" : "Pública"}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col p-4 gap-y-2.5">
        <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-[#D4AF37] transition-colors tracking-tight">
          {galeria.title}
        </h3>

        <div className="space-y-1.5">
          <div className={rowStyle} title="Cliente">
            <User size={15} className="text-[#D4AF37] flex-shrink-0" />
            <span className="truncate font-bold text-base">{galeria.client_name}</span>
          </div>

          <div className={rowStyle} title="Localização">
            <MapPin size={15} className="text-[#D4AF37]/40 flex-shrink-0" />
            <span className="truncate text-[12px]">{galeria.location || "Local não informado"}</span>
          </div>

          <div className={rowStyle} title="Data do evento">
            <Calendar size={15} className="text-[#D4AF37]/40 flex-shrink-0" />
            <span className="text-[12px]">{formatDateSafely(galeria.date)}</span>
          </div>

          <a
            href={`https://drive.google.com/drive/folders/${galeria.drive_folder_id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir pasta no Google Drive"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-slate-700 bg-[#FAF7ED] px-2.5 py-1.5 rounded-lg border border-[#D4AF37]/10 hover:bg-[#F3E5AB] transition-all group/drive mt-1"
          >
            <FolderOpen size={15} className="text-[#D4AF37] flex-shrink-0" />
            <span className="truncate text-[9px] font-bold uppercase tracking-[0.1em]">
              {galeria.drive_folder_name || "Abrir Pasta"}
            </span>
          </a>
        </div>

        {/* Ações */}
        {/* Rodapé de Ações - Borda em Tom Champanhe */}
        <div className="mt-1 flex items-center justify-between border-t border-[#D4AF37]/20 pt-4">
          {galeria.client_whatsapp ? (
            <a
              href={`https://wa.me/${galeria.client_whatsapp.replace(/\D/g, "")}`}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              title="Enviar galeria via WhatsApp"
              aria-label="Enviar galeria via WhatsApp"
              className="flex items-center gap-1.5 text-[14px] font-bold tracking-tight text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <MessageCircle size={20} />
              WhatsApp
            </a>
          ) : <div />}

          <div className="flex gap-2">
            {/* Botão de Edição - Estilo Champanhe Sutil */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(galeria); }}
              title="Editar galeria"
              aria-label="Editar galeria"
              className="p-2 text-slate-500 bg-slate-50 border border-slate-100 hover:bg-[#F3E5AB] hover:border-[#D4AF37]/30 hover:text-slate-900 rounded-xl transition-all shadow-sm active:scale-90"
            >
              <Pencil size={20} />
            </button>

            {/* Botão de Exclusão - Estilo Alerta Sutil */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(galeria); }}
              disabled={isDeleting}
              title="Excluir galeria"
              aria-label="Excluir galeria"
              className="p-2 text-slate-500 bg-slate-50 border border-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-xl transition-all shadow-sm active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}