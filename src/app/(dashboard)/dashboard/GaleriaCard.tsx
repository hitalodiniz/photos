'use client';

import {
  Calendar,
  MapPin,
  Lock,
  Globe,
  User,
  Pencil,
  Trash2,
  FolderOpen,
  Loader2,
  Check,
  Copy,
  Inbox,
  Archive,
  XCircle,
  Unlock,
  Eye,
  LayoutGrid,
  ShieldCheck,
  Users,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import { GALLERY_CATEGORIES } from '@/constants/categories';
import {
  getPublicGalleryUrl,
  copyToClipboard,
  getProxyUrl,
} from '@/core/utils/url-helper';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { executeShare } from '@/core/utils/share-helper';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { div } from 'framer-motion/client';
import { normalizePhoneNumber } from '@/core/utils/masks-helpers';

interface GaleriaCardProps {
  galeria: Galeria;
  currentView: 'active' | 'archived' | 'trash';
  index: number;
  onEdit: (galeria: Galeria) => void;
  onDelete: (galeria: Galeria) => void;
  onArchive: (galeria: Galeria) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onSync: () => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
}

export default function GaleriaCard({
  galeria,
  index,
  currentView,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onPermanentDelete,
  isDeleting,
  isUpdating = false,
  onSync,
}: GaleriaCardProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState({ url: '', whatsapp: '', message: '' });
  // 1. Efeito para marcar que o componente montou no navegador
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Efeito para gerar os links assim que estiver montado ou a galeria mudar
  useEffect(() => {
    if (galeria && mounted) {
      const publicUrl = getPublicGalleryUrl(galeria.photographer, galeria.slug);
      const message = GALLERY_MESSAGES.LUXURY_SHARE(
        galeria.client_name,
        galeria.title,
        galeria.date,
        publicUrl,
      );
      setLinks({ url: publicUrl, message: message, whatsapp: '' });
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

  const imageUrl = getProxyUrl(galeria.cover_image_url);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!links.message) return;
    const success = await copyToClipboard(links.message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    executeShare({
      title: galeria.title,
      text: links.message,
      phone: galeria.client_whatsapp,
    });
  };

  return (
    <div
      onClick={() => {
        if (links.url) {
          window.open(links.url, '_blank');
        }
      }}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-[#D4AF37]/15 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Overlay Sincronização */}
      {isUpdating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
        </div>
      )}

      {/* Capa */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={galeria.title}
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
        />

        {/* Badges Superiores Padronizados Estilo Navbar (Glassmorphism) */}
        <div className="absolute top-3 left-3 flex gap-2">
          {/* 1. Status de Privacidade (Transparente com Blur) */}
          <span
            title={
              !galeria.is_public
                ? 'Acesso restrito via senha'
                : 'Acesso público liberado'
            }
            className="flex items-center justify-center w-8 h-8 bg-black/40 backdrop-blur-md rounded-full border border-white/20 shadow-lg transition-all hover:bg-black/60"
          >
            {!galeria.is_public ? (
              /* Escudo Dourado para Privado */
              <ShieldCheck
                size={16}
                className="text-[#F3E5AB]"
                strokeWidth={2}
              />
            ) : (
              /* Olho Verde para Público */
              <Eye size={16} className="text-[#34D399]" strokeWidth={2} />
            )}
          </span>

          {/* 2. Status de Perfil Público (Transparente com Blur)
          {galeria.is_public && (
            <span
              title="Exibido no seu Perfil Público"
              className="flex items-center justify-center w-8 h-8 bg-black/40 backdrop-blur-md rounded-full border border-white/20 shadow-lg transition-all hover:bg-black/60"
            >
              <LayoutGrid
                size={16}
                className="text-[#60A5FA]"
                strokeWidth={2}
              />
            </span>
          )} */}
        </div>

        <div className="absolute top-3 right-3">
          {categoryInfo && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded text-[8px] font-semibold tracking-widest text-white border border-[#D4AF37]/40 uppercase shadow-sm">
              <span className="text-[#F3E5AB] leading-none">
                {categoryInfo.icon}
              </span>
              {categoryInfo.label}
            </span>
          )}
        </div>

        {/* Título e Categoria sobre a foto */}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-4">
          <h3 className="text-white text-base font-semibold leading-tight tracking-tight drop-shadow-md">
            {galeria.title}
          </h3>
        </div>
      </div>

      {/* Conteúdo Inferior */}
      <div className="flex flex-col p-4 space-y-3">
        {/* Cliente */}
        <div className="flex items-center justify-between h-5">
          {galeria.has_contracting_client ? (
            <div className="flex items-center gap-2 min-w-0">
              <User size={12} className="text-[#D4AF37] shrink-0 glow-gold" />
              <span className="text-[11px] font-bold text-slate-900 truncate uppercase tracking-[0.1em]">
                {galeria.client_name || 'Cliente'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <Users size={12} className="text-[#D4AF37] shrink-0 glow-gold" />
              <span className="text-[11px] font-bold text-slate-800 truncate uppercase tracking-[0.1em]">
                Cobertura de evento
              </span>
            </div>
          )}

          {/* WhatsApp aparece independente do tipo, se existir no banco */}
          {galeria.client_whatsapp && (
            <span className="text-[10px] font-semibold text-slate-400">
              {normalizePhoneNumber(galeria.client_whatsapp)}{' '}
            </span>
          )}
        </div>

        {/* Local e Data: Agora com visual de pílula suave */}
        <div className="flex items-center justify-between py-2 border-y border-slate-50">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin size={12} className="text-slate-300" />
            <span className="text-[11px] font-medium text-slate-500 truncate">
              {galeria.location || 'Local não informado'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <Calendar size={12} className="text-slate-300" />
            <span className="text-[11px] font-semibold text-slate-600">
              {formatDateSafely(galeria.date)}
            </span>
          </div>
        </div>

        {/* Botão Drive: Agora com fundo cinza muito leve para não brigar com o branco do card */}
        {/* Container da Pasta e Sincronização - Horizontal e Compacto */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center h-9 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
            {/* Link da Pasta */}
            <a
              href={`https://drive.google.com/drive/folders/${galeria.drive_folder_id}`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center gap-2 px-3 h-full hover:bg-white transition-all group/drive min-w-0"
            >
              <FolderOpen size={14} className="text-[#D4AF37] shrink-0" />
              <span className="text-[11px] font-medium text-slate-600 truncate">
                {galeria.drive_folder_name || 'Pasta do Drive'}
              </span>
              <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-tighter opacity-0 group-hover/drive:opacity-100 transition-opacity shrink-0">
                Abrir
              </span>
            </a>

            {/* Divisor Sutil */}
            <div className="w-[1px] h-4 bg-slate-200" />

            {/* Botão de Sincronização Integrado */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSync();
              }}
              disabled={isUpdating}
              title="Sincronizar com o Drive"
              className="flex items-center justify-center px-3 h-full hover:bg-white text-slate-400 hover:text-[#D4AF37] transition-all disabled:opacity-50 shrink-0"
            >
              {isUpdating ? (
                <Loader2 size={13} className="animate-spin text-[#D4AF37]" />
              ) : (
                // RefreshCw passa muito mais a ideia de "sincronizar/atualizar"
                <RefreshCw
                  size={13}
                  className={isUpdating ? 'animate-spin' : ''}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé de Ações: Clean com borda sutil */}
      <div className="flex items-center justify-between p-3 bg-slate-50/50 border-t border-slate-100 mt-auto">
        <div className="flex gap-1.5">
          {currentView === 'active' && (
            <>
              <button
                onClick={handleWhatsAppShare}
                className="p-2 text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-emerald-50 transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                className={`p-2 border rounded-lg shadow-sm transition-all ${copied ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#D4AF37]'}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </>
          )}
          {currentView === 'trash' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(galeria.id);
              }}
              className="p-2 text-blue-600 bg-white border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
            >
              <Inbox size={16} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5">
          {currentView !== 'trash' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(galeria);
              }}
              className={`p-2 border rounded-lg shadow-sm transition-all ${galeria.is_archived ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'}`}
            >
              <Archive size={16} />
            </button>
          )}
          {currentView === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(galeria);
              }}
              className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-900 hover:text-white transition-all"
            >
              <Pencil size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              currentView === 'trash'
                ? onPermanentDelete(galeria.id)
                : onDelete(galeria);
            }}
            className={`p-2 rounded-lg border shadow-sm transition-all ${currentView === 'trash' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border-slate-200 hover:text-red-600'}`}
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : currentView === 'trash' ? (
              <XCircle size={16} />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
