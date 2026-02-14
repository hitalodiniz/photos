import { useState, useEffect, useCallback } from 'react';
import type { Galeria } from '@/core/types/galeria';

export function useGalleryTags(galeria: Galeria | null) {
  const [galleryTags, setGalleryTags] = useState<string[]>([]);
  const [photoTags, setPhotoTags] = useState<{ id: string; tag: string }[]>([]);

  const loadFromGallery = useCallback((galeriaData: Galeria) => {
    let initialGalleryTags: string[] = [];
    if (Array.isArray(galeriaData.gallery_tags)) {
      initialGalleryTags = galeriaData.gallery_tags;
    } else if (typeof galeriaData.gallery_tags === 'string') {
      try {
        const parsed = JSON.parse(galeriaData.gallery_tags);
        if (Array.isArray(parsed)) initialGalleryTags = parsed;
      } catch (e) {
        console.error('Error parsing gallery_tags from DB', e);
      }
    }

    let initialPhotoTags: { id: string; tag: string }[] = [];
    if (Array.isArray(galeriaData.photo_tags)) {
      initialPhotoTags = galeriaData.photo_tags as any;
    } else if (typeof galeriaData.photo_tags === 'string') {
      try {
        const parsed = JSON.parse(galeriaData.photo_tags);
        if (Array.isArray(parsed)) initialPhotoTags = parsed;
      } catch (e) {
        console.error('Error parsing photo_tags from DB', e);
      }
    }

    setGalleryTags(initialGalleryTags);
    setPhotoTags(initialPhotoTags);
  }, []);

  // Carregar dados (Banco ou Rascunho)
  useEffect(() => {
    if (!galeria) return;

    const storageKey = `draft_tags_${galeria.id}`;
    const savedDraft = localStorage.getItem(storageKey);

    if (savedDraft) {
      try {
        const { galleryTags: g, photoTags: p } = JSON.parse(savedDraft);
        setGalleryTags(g || []);
        setPhotoTags(p || []);
      } catch (e) {
        console.error('Error parsing draft tags', e);
        // Fallback to gallery data if draft is corrupted
        loadFromGallery(galeria);
      }
    } else {
      loadFromGallery(galeria);
    }
  }, [galeria, loadFromGallery]);

  // Persistência Transitória (Debounce de 1s)
  useEffect(() => {
    if (!galeria) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(
        `draft_tags_${galeria.id}`,
        JSON.stringify({ galleryTags, photoTags }),
      );
    }, 1000);
    return () => clearTimeout(timeout);
  }, [galleryTags, photoTags, galeria]);

  const handleCreateTag = (name: string) => {
    const val = name.trim().toUpperCase();
    if (val && !galleryTags.includes(val))
      setGalleryTags((prev) => [...prev, val]);
  };

  const handleApplyTag = (ids: string[], tag: string) => {
    setPhotoTags((prev) => {
      const filtered = prev.filter((item) => !ids.includes(item.id));
      return tag === ''
        ? filtered
        : [...filtered, ...ids.map((id) => ({ id, tag }))];
    });
  };

  const handleDeleteTag = (tag: string) => {
    setGalleryTags((prev) => prev.filter((t) => t !== tag));
    setPhotoTags((prev) => prev.filter((item) => item.tag !== tag));
  };

  return {
    galleryTags,
    photoTags,
    handleCreateTag,
    handleApplyTag,
    handleDeleteTag,
    clearDraft: () =>
      galeria && localStorage.removeItem(`draft_tags_${galeria.id}`),
  };
}
