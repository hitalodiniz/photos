'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Tag as TagIcon,
  Plus,
  Filter,
  EyeOff,
  Trash2,
  Loader2,
  X,
  Info,
  ImageIcon,
  Tag,
  ArrowLeft,
  Check,
  CheckCircle2,
  Link2,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormPageBase, ConfirmationModal } from '@/components/ui';
import { usePlan } from '@/core/context/PlanContext';
import MasonryGrid from '../../MasonryGrid';
import { updateGaleriaTagsAction } from '@/core/services/galeria.service';
import { useNavigation } from '@/components/providers/NavigationProvider';
import BaseModal from '@/components/ui/BaseModal';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { getPublicGalleryUrl, copyToClipboard } from '@/core/utils/url-helper';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { formatMessage } from '@/core/utils/message-helper';
import { useShare } from '@/hooks/useShare';
import { useToast } from '@/hooks/useToast';

interface TagManagerViewProps {
  galeria: any;
  photos: any[];
  isLoading?: boolean;
}

type FilterMode = 'all' | 'untagged' | string;

const parsePossiblySerializedJson = (input: unknown): unknown => {
  let current = input;
  for (let i = 0; i < 2; i++) {
    if (typeof current !== 'string') break;
    const trimmed = current.trim();
    if (!trimmed) return [];
    try {
      current = JSON.parse(trimmed);
    } catch {
      break;
    }
  }
  return current;
};

const normalizeTag = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase();
const normalizeId = (value: unknown) => String(value || '').trim();

const parseGalleryTags = (raw: unknown): string[] => {
  const parsed = parsePossiblySerializedJson(raw);
  if (!Array.isArray(parsed)) return [];
  return Array.from(
    new Set(parsed.map((tag) => normalizeTag(tag)).filter(Boolean)),
  );
};

const parsePhotoTags = (raw: unknown): { id: string; tag: string }[] => {
  const parsed = parsePossiblySerializedJson(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item: any) => ({
      id: normalizeId(item?.id),
      tag: normalizeTag(item?.tag),
    }))
    .filter((item) => item.id && item.tag);
};

export default function TagManagerView({
  galeria,
  photos,
  isLoading: photosLoading,
}: TagManagerViewProps) {
  const router = useRouter();
  const { permissions } = usePlan();
  const { navigate } = useNavigation();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { shareToClient } = useShare({ galeria });
  const { showToast, ToastElement } = useToast();

  const [galleryTags, setGalleryTags] = useState<string[]>(() =>
    parseGalleryTags(galeria?.gallery_tags),
  );
  const [photoTags, setPhotoTags] = useState<{ id: string; tag: string }[]>(
    () => parsePhotoTags(galeria?.photo_tags),
  );
  const [newTagName, setNewTagName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const links = useMemo(() => {
    if (!galeria || !mounted) return { url: '', message: '' };
    const publicUrl = getPublicGalleryUrl(galeria.photographer, galeria.slug);
    const customTemplate = galeria.photographer?.message_templates?.card_share;
    const message =
      customTemplate && customTemplate.trim() !== ''
        ? formatMessage(customTemplate, galeria, publicUrl)
        : GALLERY_MESSAGES.CARD_SHARE(galeria.title, publicUrl);
    return { url: publicUrl, message };
  }, [galeria, mounted]);

  const handleDeleteTag = (tagName: string) => {
    setGalleryTags((prev) => prev.filter((t) => t !== tagName));
    setPhotoTags((prev) => prev.filter((item) => item.tag !== tagName));
    if (activeFilter === tagName) setActiveFilter('all');
    showToast(`marcação "${tagName}" removida.`, 'success');
  };

  const handleCreateNewTag = () => {
    const normalizedTag = normalizeTag(newTagName);
    if (normalizedTag && !galleryTags.includes(normalizedTag)) {
      setGalleryTags((prev) => [...prev, normalizedTag]);
      setNewTagName('');
    }
  };

  const handleApplyTagToPhotos = (selectedIds: string[], tagName: string) => {
    if (!selectedIds.length) return;
    const normalizedSelectedIds = selectedIds.map(normalizeId);
    const normalizedTagName = normalizeTag(tagName);
    setPhotoTags((prev) => {
      const filtered = prev.filter(
        (item) => !normalizedSelectedIds.includes(normalizeId(item.id)),
      );
      return normalizedTagName === ''
        ? filtered
        : [
            ...filtered,
            ...normalizedSelectedIds.map((id) => ({
              id,
              tag: normalizedTagName,
            })),
          ];
    });
    showToast(
      normalizedTagName === ''
        ? 'Marcação removida.'
        : `Fotos marcadas como ${normalizedTagName}`,
      'success',
    );
  };

  const photosWithTags = useMemo(() => {
    const safePhotos = Array.isArray(photos) ? photos : [];
    const tagMap = new Map(
      photoTags.map((item) => [normalizeId(item.id), item.tag]),
    );
    return safePhotos.map((p) => ({
      ...p,
      tag: tagMap.get(normalizeId(p.id)),
    }));
  }, [photos, photoTags]);

  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'all') return photosWithTags;
    if (activeFilter === 'untagged')
      return photosWithTags.filter((p) => !p.tag);
    const normalizedFilter = normalizeTag(activeFilter);
    return photosWithTags.filter(
      (p) => normalizeTag(p.tag) === normalizedFilter,
    );
  }, [photosWithTags, activeFilter]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const normalizedGalleryTags = Array.from(
        new Set(galleryTags.map((tag) => normalizeTag(tag)).filter(Boolean)),
      );
      const filteredPhotoTags = photoTags
        .map((item) => ({
          id: normalizeId(item.id),
          tag: normalizeTag(item.tag),
        }))
        .filter(
          (item) =>
            item.id && item.tag && normalizedGalleryTags.includes(item.tag),
        );
      const dedupedPhotoTags = Array.from(
        filteredPhotoTags
          .reduce(
            (map, item) => map.set(item.id, item),
            new Map<string, { id: string; tag: string }>(),
          )
          .values(),
      );

      const res = await updateGaleriaTagsAction(
        galeria,
        dedupedPhotoTags,
        normalizedGalleryTags,
      );
      if (res.success) {
        setShowSuccessModal(true);
      } else {
        const errorMsg =
          typeof res.error === 'object'
            ? (res.error as any).message
            : res.error;
        showToast(errorMsg || 'Erro ao salvar.', 'error');
      }
    } catch (error) {
      showToast('Erro crítico ao salvar.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (photosLoading)
    return (
      <FormPageBase
        title="Organizador"
        onClose={() => router.back()}
        isShowButtons={false}
        onSubmit={() => {}}
      >
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="w-10 h-10 text-gold animate-spin" />
          <p className="text-[10px] font-semibold uppercase tracking-luxury text-petroleum/80">
            Sincronizando acervo...
          </p>
        </div>
      </FormPageBase>
    );

  return (
    <FormPageBase
      title={`${galeria.theme_icon ? `${galeria.theme_icon} ` : ''}Organizador de fotos - ${galeria.title}`}
      isEdit={true}
      loading={isSaving}
      onClose={() => router.back()}
      onSubmit={handleSave}
      submitLabel="Salvar"
      footerStatusText={`${photosWithTags.length} fotos total | ${galleryTags.length} marcações`}
    >
      <div className="flex h-[calc(100vh-140px)] -mx-6 overflow-hidden w-[calc(100%+3rem)] gap-3">
        {/* SIDEBAR ESQUERDA */}
        <aside className="w-64 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar rounded-luxury">
          <div className="p-5 border-b border-slate-200 bg-white/50">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gold mb-1 block">
              Galeria selecionada
            </span>
            <h2
              className="text-[13px] font-semibold text-petroleum leading-tight tracking-luxury-tight truncate"
              title={galeria.title}
            >
              {galeria.title}
            </h2>
          </div>

          <div className="p-5 border-b border-slate-200 bg-white">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
              <TagIcon size={12} className="text-gold" /> Criar marcação
            </h3>
            <div className="flex gap-1">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ex: Premiação"
                maxLength={15}
                minLength={3}
                className="input-luxury h-9 text-[11px] flex-1"
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (e.preventDefault(), handleCreateNewTag())
                }
              />
              <button
                type="button"
                onClick={handleCreateNewTag}
                className="bg-champagne text-petroleum w-9 h-9 flex items-center justify-center rounded hover:bg-petroleum/90"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-6 bg-white">
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-petroleum/80 mb-3 flex items-center gap-2">
                <Filter size={12} className="text-gold" /> Filtros de Exibição
              </h3>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-luxury text-[11px] font-medium transition-all ${activeFilter === 'all' ? 'bg-petroleum text-white shadow-md' : 'text-petroleum/80 hover:bg-slate-200/50'}`}
                >
                  <span>Todas as Fotos</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${activeFilter === 'all' ? 'bg-white/20' : 'bg-slate-200'}`}
                  >
                    {photosWithTags.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('untagged')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-luxury text-[11px] border border-slate-200 font-medium transition-all ${activeFilter === 'untagged' ? 'bg-gold text-petroleum shadow-md' : 'text-petroleum/80 hover:bg-slate-200/50'}`}
                >
                  <div className="flex items-center gap-2">
                    <EyeOff size={12} className="text-gold" /> Sem marcação
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${activeFilter === 'untagged' ? 'bg-petroleum/10' : 'bg-slate-200'}`}
                  >
                    {photosWithTags.filter((p) => !p.tag).length}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-petroleum/80 mb-3 flex items-center gap-2">
                <Tag size={12} className="text-gold" /> marcações
              </h3>
              <div className="space-y-1.5">
                {galleryTags.map((tag) => (
                  <div
                    key={tag}
                    className="group relative border border-slate-200 rounded-luxury"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFilter(tag)}
                      className={`w-full flex items-center justify-between pl-3 pr-8 py-2 rounded-luxury text-[11px] font-medium transition-all border ${activeFilter === tag ? 'bg-champagne border-gold/30 text-petroleum' : 'bg-white border-transparent text-petroleum/80 hover:border-slate-200'}`}
                    >
                      <span className="truncate">{tag}</span>
                      <span className="text-[11px] opacity-60">
                        {
                          photosWithTags.filter(
                            (p) =>
                              String(p.tag || '')
                                .trim()
                                .toUpperCase() ===
                              String(tag || '')
                                .trim()
                                .toUpperCase(),
                          ).length
                        }
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagToDelete(tag);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-600 p-1 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto p-5 bg-petroleum/5 border-t border-slate-200">
            <p className="text-[10px] text-petroleum/50 italic leading-relaxed flex gap-2">
              <Info size={14} className="shrink-0" />
              Selecione as fotos ao lado e clique em uma marcação para marcar.
            </p>
          </div>
        </aside>

        {/* GRID DE FOTOS */}
        <main className="flex-1 relative flex flex-col min-w-0 h-full">
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-white border-t border-slate-200 rounded-luxury">
            <div className="max-w-full">
              {filteredPhotos.length > 0 ? (
                <MasonryGrid
                  galeria={galeria}
                  displayedPhotos={filteredPhotos}
                  favorites={selectedIds}
                  toggleFavoriteFromGrid={(id) =>
                    setSelectedIds((prev) =>
                      prev.includes(id)
                        ? prev.filter((i) => i !== id)
                        : [...prev, id],
                    )
                  }
                  tagSelectionMode="bulk"
                  canUseFavorites={true}
                  columns={{ mobile: 2, tablet: 4, desktop: 6 }}
                  mode="admin"
                  galleryTitle={galeria.title}
                  setSelectedPhotoIndex={() => {}}
                  showOnlyFavorites={false}
                  setShowOnlyFavorites={() => {}}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                  <ImageIcon size={48} strokeWidth={1} />
                  <p className="text-sm italic">
                    Nenhuma foto encontrada para este filtro.
                  </p>
                </div>
              )}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="absolute bottom-4 left-3 right-3 z-50">
              <div className="w-full bg-petroleum/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-start gap-4 animate-in slide-in-from-bottom-6 duration-500 border border-white/10">
                <div className="flex items-center gap-2 border-r border-white/10 pr-4 shrink-0 mt-1">
                  <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center shadow-lg shadow-gold/20">
                    <span className="text-[10px] font-semibold text-petroleum">
                      {selectedIds.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest hidden sm:inline">
                    Selecionadas
                  </span>
                </div>
                <div className="flex-1 flex flex-wrap items-center gap-2 py-1 px-1 -mx-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyTagToPhotos(selectedIds, '');
                      setSelectedIds([]);
                    }}
                    className="px-3 py-2 bg-red-500/20 text-[9px] font-semibold rounded-lg uppercase border border-red-500/30 hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
                  >
                    Limpar Marcação
                  </button>
                  <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />
                  {galleryTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        handleApplyTagToPhotos(selectedIds, tag);
                        setSelectedIds([]);
                      }}
                      className="px-4 py-2 bg-champagne text-petroleum text-[9px] font-semibold rounded-lg uppercase border border-white/10 transition-all whitespace-nowrap active:scale-95"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors shrink-0 mt-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <ConfirmationModal
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        onConfirm={() => {
          handleDeleteTag(tagToDelete!);
          setTagToDelete(null);
        }}
        title="Remover marcação"
        message={`Deseja remover "${tagToDelete}"? As fotos voltarão para o estado pendente.`}
      />

      {ToastElement}

      <BaseModal
        isOpen={showSuccessModal}
        showCloseButton={true}
        onClose={() => setShowSuccessModal(false)}
        title="Marcações Salvas"
        subtitle="As marcações foram salvas com sucesso"
        maxWidth="lg"
        headerIcon={
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/5">
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
        }
        footer={
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 w-full items-center">
              <button
                onClick={() => navigate('/dashboard', 'Voltando ao painel...')}
                className="btn-secondary-white w-full h-10 uppercase font-semibold"
              >
                <ArrowLeft size={14} /> Painel
              </button>
              <a
                href={getPublicGalleryUrl(galeria.photographer, galeria.slug)}
                target="_blank"
                className="btn-luxury-primary w-full h-10 uppercase font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> Ver Galeria
              </a>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/80 font-medium text-center px-4">
            As marcações da galeria <strong>{galeria.title}</strong> foram
            sincronizadas. Seu cliente agora pode filtrar as fotos por
            marcações.
          </p>
          <div className="p-4 bg-slate-50 border border-petroleum/10 rounded-luxury flex flex-col items-center gap-4">
            <p className="text-[10px] font-semibold text-petroleum/80 text-center uppercase tracking-luxury">
              Compartilhe com seu cliente:
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => shareToClient(links.url)}
                className="btn-luxury-base text-white bg-green-500 hover:bg-[#20ba56] px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
              >
                <WhatsAppIcon className="w-4 h-4 fill-current" />
                WhatsApp
              </button>
              <button
                onClick={async () => {
                  const url = getPublicGalleryUrl(
                    galeria.photographer,
                    galeria.slug,
                  );
                  const ok = await copyToClipboard(url);
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="btn-luxury-base text-petroleum bg-white border border-petroleum/20 hover:border-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
              >
                {copied ? (
                  <Check
                    size={16}
                    className="text-green-600 animate-in zoom-in"
                  />
                ) : (
                  <Link2 size={16} className="text-petroleum/40" />
                )}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </div>
        </div>
      </BaseModal>
    </FormPageBase>
  );
}
