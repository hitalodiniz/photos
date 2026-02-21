import { useState, useMemo } from 'react';
import type { Galeria } from '@/core/types/galeria';
import { normalizeString } from '@/core/utils/string-helpers';

const CARDS_PER_PAGE = 9;

export type ViewType = 'active' | 'archived' | 'trash';

export function useDashboardFilters(galerias: Galeria[]) {
  const [currentView, setCurrentView] = useState<ViewType>('active');
  const [cardsToShow, setCardsToShow] = useState(CARDS_PER_PAGE);
  const [filterName, setFilterName] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');

  const counts = useMemo(
    () => ({
      active: (galerias || []).filter((g) => !g.is_archived && !g.is_deleted)
        .length,
      archived: (galerias || []).filter((g) => g.is_archived && !g.is_deleted)
        .length,
      trash: (galerias || []).filter((g) => g.is_deleted).length,
    }),
    [galerias],
  );

  const filteredGalerias = useMemo(() => {
    if (!Array.isArray(galerias)) return [];
    const nameLower = normalizeString(filterName);
    const locationLower = normalizeString(filterLocation);

    return galerias.filter((g) => {
      const isArchived = Boolean(g.is_archived);
      const isDeleted = Boolean(g.is_deleted);
      if (currentView === 'active' && (isArchived || isDeleted)) return false;
      if (currentView === 'archived' && (!isArchived || isDeleted))
        return false;
      if (currentView === 'trash' && !isDeleted) return false;

      const titleNorm = normalizeString(g.title || '');
      const clientNorm = normalizeString(g.client_name || '');
      const locationNorm = normalizeString(g.location || '');

      const matchesSearch =
        !nameLower ||
        titleNorm.includes(nameLower) ||
        clientNorm.includes(nameLower);
      const matchesLocation =
        !locationLower || locationNorm.includes(locationLower);
      const matchesCategory = !filterCategory || g.category === filterCategory;
      const matchesType =
        !filterType || String(g.has_contracting_client) === filterType;
      const galleryDateString = g.date ? g.date.split('T')[0] : '';
      const matchesDate =
        (!filterDateStart || galleryDateString >= filterDateStart) &&
        (!filterDateEnd || galleryDateString <= filterDateEnd);

      return (
        matchesSearch &&
        matchesLocation &&
        matchesCategory &&
        matchesType &&
        matchesDate
      );
    });
  }, [
    galerias,
    currentView,
    filterName,
    filterLocation,
    filterCategory,
    filterType,
    filterDateStart,
    filterDateEnd,
  ]);

  const visibleGalerias = useMemo(
    () => filteredGalerias.slice(0, cardsToShow),
    [filteredGalerias, cardsToShow],
  );

  const resetFilters = () => {
    setFilterName('');
    setFilterLocation('');
    setFilterCategory('');
    setFilterType('');
    setFilterDateStart('');
    setFilterDateEnd('');
  };

  const loadMore = () => {
    setCardsToShow((prev) => prev + CARDS_PER_PAGE);
  };

  return {
    currentView,
    setCurrentView,
    cardsToShow,
    setCardsToShow,
    filterName,
    setFilterName,
    filterLocation,
    setFilterLocation,
    filterDateStart,
    setFilterDateStart,
    filterDateEnd,
    setFilterDateEnd,
    filterCategory,
    setFilterCategory,
    filterType,
    setFilterType,
    counts,
    filteredGalerias,
    visibleGalerias,
    resetFilters,
    loadMore,
  };
}
