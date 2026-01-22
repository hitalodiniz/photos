import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { updateSidebarPreference } from '@/core/services/profile.service';

export function useDashboardState(initialSidebarCollapsed: boolean) {
  const pathname = usePathname();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
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

  useEffect(() => {
    setIsRedirecting(false);
  }, [pathname]);

  const toggleSidebar = async () => {
    const newValue = !isSidebarCollapsed;
    setIsSidebarCollapsed(newValue);
    await updateSidebarPreference(newValue);
  };

  const startRedirecting = () => {
    setIsRedirecting(true);
    // Timeout de segurança
    setTimeout(() => setIsRedirecting(false), 10000);
  };

  return {
    isAdminModalOpen,
    setIsAdminModalOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toast,
    setToast,
    isRedirecting,
    setIsRedirecting,
    showConsentAlert,
    setShowConsentAlert,
    viewMode,
    setViewMode,
    toggleSidebar,
    startRedirecting,
  };
}
