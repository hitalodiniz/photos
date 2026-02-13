// @/components/galeria/TagManagerModal.tsx - VERSÃO OTIMIZADA
import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Check,
  Layout,
  X,
  Filter,
  Image as ImageIcon,
  EyeOff,
  Trash2,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import MasonryGrid from '../../MasonryGrid';
import { ConfirmationModal } from '@/components/ui';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: any[];
  galeria: any;
  photoTags: { id: string; tag: string }[];
  existingTags: string[];
  onApplyTag: (selectedIds: string[], tagName: string) => void;
  onCreateTag: (newTag: string) => void;
  onDeleteTag: (tagName: string) => void;
}

type FilterMode = 'all' | 'untagged' | string;

export function TagManagerModal({
  isOpen,
  onClose,
  photos,
  galeria,
  photoTags,
  existingTags,
  onApplyTag,
  onCreateTag,
  onDeleteTag,
}: TagManagerModalProps) {
  const [newTagName, setNewTagName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  // 🛡️ VALIDAÇÃO E MAPEAMENTO
  const photosWithTags = useMemo(() => {
    const safePhotos = Array.isArray(photos) ? photos : [];
    const safePhotoTags = Array.isArray(photoTags) ? photoTags : [];

    return safePhotos.map((p) => ({
      ...p,
      tag: safePhotoTags.find((t) => t.id === p.id)?.tag,
    }));
  }, [photos, photoTags]);

  // 🎯 LÓGICA DE FILTRAGEM
  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'all') return photosWithTags;
    if (activeFilter === 'untagged')
      return photosWithTags.filter((p) => !p.tag);
    return photosWithTags.filter((p) => p.tag === activeFilter);
  }, [photosWithTags, activeFilter]);

  const handleCreate = () => {
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim().toUpperCase());
      setNewTagName('');
    }
  };

  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Organizador de Fotos"
      subtitle="Categorize suas fotos para facilitar a navegação do cliente"
      maxWidth="full"
      headerIcon={<Layout size={20} className="text-gold" />}
    >
      {/* ✅ CORREÇÃO: Remover -m-5, usar height 100% direto */}
      <div className="flex flex-col h-full relative">
        {/* TOOLBAR COMPACTA */}
        <div className="p-3 border-b border-slate-200 bg-white shrink-0 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            {/* FILTROS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-petroleum/60 mr-1 shrink-0">
                <Filter size={12} />
                <span className="text-[9px] font-semibold uppercase tracking-widest">
                  Filtrar:
                </span>
              </div>

              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase transition-all whitespace-nowrap shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-petroleum text-white'
                    : 'bg-slate-50 text-petroleum/40 hover:bg-slate-200'
                }`}
              >
                Todas ({photosWithTags.length})
              </button>

              <button
                onClick={() => setActiveFilter('untagged')}
                className={`px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase transition-all whitespace-nowrap flex items-center gap-1.5 group shrink-0 ${
                  activeFilter === 'untagged'
                    ? 'bg-gold text-petroleum'
                    : 'bg-slate-50 text-petroleum/40 hover:bg-slate-200'
                }`}
              >
                <EyeOff size={11} />
                <span>Sem Marcação</span>
                <span
                  className={`px-1 py-0.5 rounded text-[8px] ${
                    activeFilter === 'untagged'
                      ? 'bg-petroleum/10'
                      : 'bg-slate-200 text-petroleum/60'
                  }`}
                >
                  {photosWithTags.filter((p) => !p.tag).length}
                </span>
              </button>

              {existingTags.map((tag) => {
                const count = photosWithTags.filter(
                  (p) => p.tag === tag,
                ).length;

                return (
                  <div key={tag} className="relative group flex shrink-0">
                    <button
                      onClick={() => setActiveFilter(tag)}
                      className={`pl-2.5 pr-8 py-1 rounded-full text-[9px] font-semibold uppercase transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                        activeFilter === tag
                          ? 'bg-champagne border-gold/30 text-petroleum'
                          : 'bg-slate-50 border-transparent text-petroleum/40 hover:bg-slate-200'
                      }`}
                    >
                      <span>{tag}</span>
                      <span
                        className={`px-1 py-0.5 rounded text-[8px] ${
                          activeFilter === tag
                            ? 'bg-petroleum/10 text-petroleum/70'
                            : 'bg-slate-200 text-petroleum/50'
                        }`}
                      >
                        {count}
                      </span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagToDelete(tag);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-petroleum/20 hover:text-red-600 transition-colors"
                      title={`Excluir marcação ${tag}`}
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* INPUT NOVA TAG */}
            <div className="flex gap-2 shrink-0">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nova marcação..."
                className="input-luxury h-8 w-36 text-[11px]"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button
                onClick={handleCreate}
                className="bg-petroleum text-white p-1.5 rounded-luxury hover:bg-black transition-all shadow-md"
                title="Criar marcação"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA DO GRID */}
        <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 custom-scrollbar">
          {filteredPhotos.length > 0 ? (
            <MasonryGrid
              galleryTitle="Organizador"
              galeria={galeria}
              displayedPhotos={filteredPhotos}
              favorites={selectedIds}
              toggleFavoriteFromGrid={handleToggleSelection}
              tagSelectionMode="bulk"
              canUseFavorites={true}
              columns={{ mobile: 3, tablet: 6, desktop: 8 }}
              setSelectedPhotoIndex={() => {}}
              showOnlyFavorites={false}
              setShowOnlyFavorites={() => {}}
              mode="admin"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 animate-in fade-in">
              <ImageIcon size={48} strokeWidth={1} />
              <p className="text-sm font-medium italic">
                Nenhuma foto encontrada para este filtro.
              </p>
              <button
                onClick={() => setActiveFilter('all')}
                className="text-[10px] font-semibold uppercase tracking-widest text-gold hover:text-petroleum underline underline-offset-4"
              >
                Ver todas as fotos
              </button>
            </div>
          )}
        </div>

        {/* BARRA FLUTUANTE */}
        {selectedIds.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
            <div className="bg-petroleum backdrop-blur-md px-4 py-2.5 rounded-xl shadow-2xl border border-white/30 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-1.5 border-r border-white/20 pr-3 shrink-0">
                <div className="w-5 h-5 rounded-full bg-gold/30 flex items-center justify-center">
                  <Check size={12} className="text-gold" />
                </div>
                <span className="text-[11px] font-semibold text-white">
                  {selectedIds.length}
                </span>
              </div>

              <button
                onClick={() => {
                  onApplyTag(selectedIds, '');
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-red-500/30 hover:bg-red-500 text-white hover:text-white text-[9px] font-semibold rounded-lg uppercase transition-all whitespace-nowrap border border-red-500/50 flex items-center gap-1 shrink-0"
              >
                <Trash2 size={11} />
                Remover
              </button>

              <div className="h-6 w-px bg-white/20 shrink-0" />

              <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
                <span className="text-[9px] text-white/70 uppercase font-medium shrink-0 mr-1">
                  Aplicar:
                </span>

                {existingTags.map((tag) => {
                  const count = photoTags.filter((t) => t.tag === tag).length;

                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        onApplyTag(selectedIds, tag);
                        setSelectedIds([]);
                      }}
                      className="px-2.5 py-1.5 bg-white/15 hover:bg-gold hover:text-petroleum text-white text-[9px] font-semibold rounded-lg uppercase transition-all whitespace-nowrap border border-white/20 flex items-center gap-1.5 group shrink-0"
                    >
                      <span>{tag}</span>
                      <span className="bg-white/20 group-hover:bg-petroleum/30 px-1 py-0.5 rounded text-[8px]">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setSelectedIds([])}
                className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors shrink-0"
                title="Cancelar seleção"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        onConfirm={() => {
          if (tagToDelete) {
            onDeleteTag(tagToDelete);
            if (activeFilter === tagToDelete) setActiveFilter('all');
            setTagToDelete(null);
          }
        }}
        title="Excluir marcação"
        message={`Deseja remover a marcação "${tagToDelete}"? As fotos desta marcação não serão apagadas, mas perderão essa marcação e voltarão para "Sem marcação".`}
      />
    </BaseModal>
  );
}
