import { useState, useEffect } from 'react';
import { updateSidebarPreference } from '@/core/services/profile.service';

export function useDashboardState(initialSidebarCollapsed: boolean) {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showConsentAlert, setShowConsentAlert] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('galeria-view-mode');
      return saved === 'grid' || saved === 'list' ? saved : 'grid';
    }
    return 'grid';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('galeria-view-mode', viewMode);
    }
  }, [viewMode]);

  return {
    isAdminModalOpen,
    setIsAdminModalOpen,
    toast,
    setToast,
    showConsentAlert,
    setShowConsentAlert,
    viewMode,
    setViewMode,
  };
}
