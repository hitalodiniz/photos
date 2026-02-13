// @/components/galeria/TagManagerModal.tsx
import React, { useState } from 'react';
import { Tag, Plus, Check, Layout, X } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import MasonryGrid from '../../MasonryGrid';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Dados das fotos
  photos: any[];
  galeria: any;
  // Estado de Tags (Vínculo ID -> Tag)
  photoTags: { id: string; tag: string }[];
  existingTags: string[];
  // Callbacks
  onApplyTag: (selectedIds: string[], tagName: string) => void;
  onCreateTag: (newTag: string) => void;
}

export function TagManagerModal({
  isOpen,
  onClose,
  photos,
  galeria,
  photoTags,
  existingTags,
  onApplyTag,
  onCreateTag,
}: TagManagerModalProps) {
  const [newTagName, setNewTagName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 🎯 Transforma o array de objetos photoTags em um formato que o MasonryItem entenda
  const photosWithTags = photos.map((p) => ({
    ...p,
    tag: photoTags.find((t) => t.id === p.id)?.tag,
  }));

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
      maxWidth="6xl"
    >
      <div className="flex flex-col h-[80vh]">
        {/* HEADER DO MODAL: CRIAÇÃO DE TAGS */}
        <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-[100] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex gap-2 flex-1 max-w-sm">
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nova marcação (Ex: FESTA)"
                  className="input-luxury h-10"
                />
                <button
                  onClick={handleCreate}
                  className="bg-petroleum text-white px-3 rounded-luxury"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* BARRA DE SELEÇÃO ATIVA (Estilo Google Fotos) */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 bg-gold/10 border border-gold/30 px-4 py-2 rounded-full animate-in fade-in zoom-in duration-300">
                <span className="text-[10px] font-bold text-petroleum uppercase">
                  {selectedIds.length} selecionadas:
                </span>
                <div className="flex gap-1">
                  {existingTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        onApplyTag(selectedIds, tag);
                        setSelectedIds([]); // Limpa após aplicar
                      }}
                      className="px-2 py-1 bg-petroleum text-white text-[9px] font-bold rounded uppercase hover:bg-gold hover:text-petroleum transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-petroleum/40 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CORPO DO MODAL: O GRID MASONRY */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          <MasonryGrid
            galleryTitle="Organizador"
            galeria={galeria}
            displayedPhotos={photosWithTags}
            favorites={selectedIds} // Aqui usamos o estado de seleção local do modal
            toggleFavoriteFromGrid={handleToggleSelection}
            tagSelectionMode="bulk" // 🎯 Força o modo seleção múltipla
            canUseFavorites={true}
            columns={{ mobile: 3, tablet: 4, desktop: 6 }} // Mais colunas para o admin
            setSelectedPhotoIndex={() => {}} // Desativado no admin
            showOnlyFavorites={false}
            setShowOnlyFavorites={() => {}}
          />
        </div>
      </div>
    </BaseModal>
  );
}
