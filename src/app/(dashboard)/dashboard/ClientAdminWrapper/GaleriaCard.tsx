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
  Inbox,
  Archive,
  XCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import { GALLERY_CATEGORIES } from '@/constants/categories';
import {
  getPublicGalleryUrl,
  copyToClipboard,
  getImageUrl,
} from '@/core/utils/url-helper';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { executeShare } from '@/core/utils/share-helper';

interface GaleriaCardProps {
  galeria: Galeria;
  currentView: 'active' | 'archived' | 'trash';
  onEdit: (galeria: Galeria) => void;
  onDelete: (galeria: Galeria) => void;
  onArchive: (galeria: Galeria) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
}
export default function GaleriaCard({
  galeria,
  currentView,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onPermanentDelete,
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

    executeShare({
      title: galeria.title,
      text: links.message,
      phone: galeria.client_whatsapp, // Opcional
    });
  };

  // Função auxiliar para evitar repetição de código
  const openWhatsApp = (phone: string, message: string) => {
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[12px] border border-[#F3E5AB] bg-[#FFF9F0]/30 backdrop-blur-sm shadow-sm hover:shadow-2xl hover:shadow-gold/10 transition-all duration-500 w-full"
      style={{ maxWidth: '400px' }}
    >
      {/* Overlay de Atualização Premium */}
      {isUpdating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          <span className="mt-3 text-[10px] font-semibold text-slate-900 uppercase tracking-wider font-barlow">
            Sincronizando
          </span>
        </div>
      )}

      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 border-b border-[#F3E5AB]">
        <img
          src={imageUrl}
          alt={`Capa da galeria ${galeria.title}`}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
        />

        <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col gap-1.5">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] md:text-[12px] font-medium tracking-wider shadow-sm ${isPrivate ? 'bg-slate-800 text-white ' : 'bg-white text-slate-700'}`}
          >
            {isPrivate ? (
              <Lock size={10} strokeWidth={3} />
            ) : (
              <Globe size={10} strokeWidth={3} />
            )}
            {isPrivate ? 'Privada' : 'Pública'}
          </span>
        </div>

        <div className="absolute top-2 right-2 md:top-3 md:right-3 flex flex-col gap-1.5">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] md:text-[12px] font-medium tracking-wider shadow-sm ${galeria.has_contracting_client ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}
          >
            <Briefcase size={10} strokeWidth={3} />
            {galeria.has_contracting_client ? 'Contrato' : 'Cobertura'}
          </span>
        </div>

        {categoryInfo && (
          <div className="absolute bottom-2 right-2 md:right-3 ">
            <span className="flex items-center gap-1.5 rounded-lg px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] md:text-[12px] font-medium tracking-widest border border-white/10">
              {categoryInfo.icon} {categoryInfo.label}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col p-4">
        <div className="flex items-start justify-between gap-1 min-h-[40px]">
          <h3 className="truncate text-[14px] md:text-[18px] font-semibold text-slate-900 group-hover:text-[#D4AF37] transition-colors tracking-tight leading-tight line-clamp-2 flex-1">
            {galeria.title}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="h-[20px] flex items-center">
            {galeria.has_contracting_client ? (
              <div className={rowStyle}>
                <User size={14} className="text-[#D4AF37] flex-shrink-0" />
                <span className="truncate text-[12px] md:text-[16px] font-semibold text-slate-700">
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
            className="flex items-center gap-3 text-slate-700  px-4 py-2.5 rounded-xl border
             border-gold/10 hover:bg-champagne-dark transition-all mt-3 group/drive shadow-sm  hover:text-white "
          >
            <FolderOpen
              size={16}
              className="text-[#D4AF37] flex-shrink-0 transition-transform group-hover/drive:scale-105"
            />
            <span className="truncate text-[8px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {galeria.drive_folder_name || 'Abrir Pasta no Google Drive'}
            </span>
          </a>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-gold/20 pt-4 px-4 pb-4">
        <div className="flex gap-2">
          {/* MODO LIXEIRA: Mostra apenas botão Restaurar */}
          <div className="flex gap-2">
            {/* WhatsApp e Copy: Exibir apenas na aba ATIVA */}
            {currentView === 'active' && (
              <>
                {mounted &&
                  galeria.has_contracting_client &&
                  galeria.client_whatsapp && (
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="p-3 text-emerald-700 bg-white border border-gold/20 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                      title="Enviar via WhatsApp"
                    >
                      <MessageCircle size={20} />
                    </button>
                  )}

                <button
                  onClick={handleCopy}
                  className={`p-3 border rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center ${
                    copied
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-slate-400 border-gold/20 hover:text-gold hover:border-gold/40'
                  }`}
                  title="Copiar mensagem personalizada"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </>
            )}

            {/* Botão Restaurar: Aparece na Arquivada e na Lixeira */}
            {currentView === 'trash' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(galeria.id);
                }}
                className="p-3 text-blue-600 bg-white border border-blue-100 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                title="Restaurar para Ativas"
              >
                <Inbox size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {/* Botão Arquivar/Desarquivar: Apenas na aba Ativa ou Arquivada */}
          {(currentView === 'active' || currentView === 'archived') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(galeria);
              }}
              className={`p-3 border rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center ${
                galeria.is_archived
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-slate-500 border-gold/20 hover:bg-amber-50'
              }`}
              title={galeria.is_archived ? 'Desarquivar' : 'Arquivar'}
            >
              <Archive size={20} />
            </button>
          )}

          {/* Botão Editar: Apenas na aba Ativa */}
          {currentView === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(galeria);
              }}
              className="p-3 text-slate-500 bg-white border border-gold/20 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
            >
              <Pencil size={20} />
            </button>
          )}

          {/* Botão Lixeira: Apenas na aba Ativa ou Arquivada */}
          {(currentView === 'active' || currentView === 'archived') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(galeria);
              }}
              disabled={isDeleting}
              className="p-3 text-slate-500 bg-white border border-gold/20 hover:bg-[#B3261E] hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-30 flex items-center justify-center"
            >
              {isDeleting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Trash2 size={20} />
              )}
            </button>
          )}

          {/* 4. NOVO: Botão Exclusão Definitiva: Apenas na Aba Lixeira */}
          {currentView === 'trash' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPermanentDelete(galeria.id); // Certifique-se de passar essa prop para o card
              }}
              className="p-3 text-white bg-red-600 border border-red-700 hover:bg-red-800 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
              title="Excluir Permanentemente"
            >
              <XCircle size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
