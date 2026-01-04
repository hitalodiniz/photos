'use client';

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
  Loader2,
  Briefcase,
  Check,
  Copy,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Galeria } from '@/types/galeria';
import { GALLERY_CATEGORIES } from '@/constants/categories';
import {
  getPublicGalleryUrl,
  copyToClipboard,
  getImageUrl,
  getWhatsAppShareLink,
  getLuxuryMessageData,
} from '@/utils/url-helper';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { url } from 'inspector';

interface GaleriaCardProps {
  galeria: Galeria;
  onEdit: (galeria: Galeria) => void;
  onDelete: (galeria: Galeria) => void;
  isDeleting: boolean;
  isUpdating?: boolean;
}

export default function GaleriaCard({
  galeria,
  onEdit,
  onDelete,
  isDeleting,
  isUpdating = false,
}: GaleriaCardProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState({
    url: '',
    whatsapp: '',
    message: '', // Adicionado aqui
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (galeria && mounted) {
      const publicUrl = getPublicGalleryUrl(galeria.photographer, galeria.slug);

      const message = GALLERY_MESSAGES.LUXURY_SHARE(
        galeria.client_name,
        galeria.title,
        galeria.date,
        publicUrl,
      );

      setLinks({
        url: publicUrl,
        message: message, // Salva a mensagem para o handleCopy e WhatsApp
        whatsapp: '',
      });
    }
  }, [galeria, mounted]);

  const categoryInfo = GALLERY_CATEGORIES.find(
    (c) => c.id === galeria.category,
  );

  const formatDateSafely = (dateString: string) => {
    if (!dateString) return '---';
    const [datePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  };

  const imageUrl = galeria.cover_image_url?.includes('http')
    ? galeria.cover_image_url
    : getImageUrl(galeria.cover_image_url);

  const isPrivate = !galeria.is_public;
  const rowStyle = 'flex items-center gap-2 text-[#4F5B66] min-w-0';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!links.message) return;

    const success = await copyToClipboard(links.message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCardClick = () => {
    if (links.url) window.open(links.url, '_blank');
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Se não houver mensagem pronta, não faz nada
    if (!links.message) return;

    // 1. Limpa o telefone (Sempre garanta que só tenha números)
    const phone = galeria.client_whatsapp
      ? galeria.client_whatsapp.replace(/\D/g, '')
      : '';

    // 2. Codifica a mensagem de forma pura (Igual à URL 1 que você mandou)
    const encodedText = encodeURIComponent(links.message);

    // 3. Monta a URL manualmente para garantir que não haja parâmetros extras quebrando tudo
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 w-full"
      style={{ maxWidth: '400px' }}
    >
      {isUpdating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
          <span className="mt-2 text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">
            Atualizando
          </span>
        </div>
      )}

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-50 border-b border-gray-50">
        <img
          src={imageUrl}
          alt={`Capa da galeria ${galeria.title}`}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] md:text-[12px] font-medium tracking-[0.05em] shadow-sm ${isPrivate ? 'bg-slate-800 text-white ' : 'bg-white text-slate-700'}`}
          >
            {isPrivate ? (
              <Lock size={10} strokeWidth={3} />
            ) : (
              <Globe size={10} strokeWidth={3} />
            )}
            {isPrivate ? 'Privada' : 'Pública'}
          </span>
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] md:text-[12px] font-medium tracking-[0.05em] shadow-sm ${galeria.has_contracting_client ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}
          >
            <Briefcase size={10} strokeWidth={3} />
            {galeria.has_contracting_client ? 'Contrato' : 'Venda Direta'}
          </span>
        </div>

        {categoryInfo && (
          <div className="absolute bottom-2 right-2">
            <span className="flex items-center gap-1.5 rounded-lg px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] md:text-[12px] font-medium tracking-widest border border-white/10">
              {categoryInfo.icon} {categoryInfo.label}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col p-4">
        <div className="flex items-start justify-between gap-1 min-h-[40px]">
          <h3 className="truncate text-[14px] md:text-[18px] font-bold text-slate-900 group-hover:text-[#D4AF37] transition-colors tracking-tight leading-tight line-clamp-2 flex-1">
            {galeria.title}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="h-[20px] flex items-center">
            {galeria.has_contracting_client ? (
              <div className={rowStyle}>
                <User size={14} className="text-[#D4AF37] flex-shrink-0" />
                <span className="truncate text-[12px] md:text-[16px] font-bold text-slate-700">
                  {galeria.client_name}
                </span>
              </div>
            ) : (
              <div className="invisible h-full w-full" aria-hidden="true" />
            )}
          </div>

          <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-1">
            <div className={`${rowStyle} flex-1`}>
              <MapPin size={14} className="text-[#D4AF37]/40 flex-shrink-0" />
              <span className="truncate text-[8px] md:text-[14px] font-medium text-slate-500">
                {galeria.location || 'Local não informado'}
              </span>
            </div>
            <div className={`${rowStyle} shrink-0`}>
              <Calendar size={14} className="text-[#D4AF37]/40 flex-shrink-0" />
              <span className="text-[8px] md:text-[14px] font-medium text-slate-500 whitespace-nowrap">
                {formatDateSafely(galeria.date)}
              </span>
            </div>
          </div>

          <a
            href={`https://drive.google.com/drive/folders/${galeria.drive_folder_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-3 text-slate-700 bg-[#FAF7ED] px-4 py-2.5 rounded-xl border border-[#D4AF37]/10 hover:bg-[#F3E5AB] transition-all mt-3 group/drive shadow-sm"
          >
            <FolderOpen
              size={16}
              className="text-[#D4AF37] flex-shrink-0 transition-transform group-hover/drive:scale-110"
            />
            <span className="truncate text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              {galeria.drive_folder_name || 'Abrir Pasta no Google Drive'}
            </span>
          </a>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-[#D4AF37]/20 pt-4 px-4 pb-4">
        <div className="flex gap-2">
          {mounted &&
            galeria.has_contracting_client &&
            galeria.client_whatsapp && (
              <button
                type="button"
                onClick={handleWhatsAppShare}
                // Mantivemos EXATAMENTE as suas classes originais do link <a>
                className="p-3 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-90 flex items-center justify-center cursor-pointer"
                title="Enviar via WhatsApp"
              >
                <MessageCircle size={20} />
              </button>
            )}

          <button
            onClick={handleCopy}
            className={`p-3 border rounded-xl transition-all shadow-sm active:scale-90 flex items-center justify-center ${
              copied
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
            }`}
            title="Copiar mensagem personalizada"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(galeria);
            }}
            className="p-3 text-slate-500 bg-slate-50 border border-slate-100 hover:bg-[#F3E5AB] hover:border-[#D4AF37]/30 hover:text-slate-900 rounded-xl transition-all shadow-sm active:scale-90 flex items-center justify-center"
          >
            <Pencil size={20} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(galeria);
            }}
            disabled={isDeleting}
            className="p-3 text-slate-500 bg-slate-50 border border-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-xl transition-all shadow-sm active:scale-90 disabled:opacity-30 flex items-center justify-center"
          >
            {isDeleting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Trash2 size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
