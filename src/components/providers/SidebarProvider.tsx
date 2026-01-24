'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { updateSidebarPreference } from '@/core/services/profile.service';

interface SidebarContextType {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => Promise<void>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ 
  children,
  initialCollapsed = false 
}: { 
  children: React.ReactNode;
  initialCollapsed?: boolean;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialCollapsed);

  const toggleSidebar = async () => {
    const newValue = !isSidebarCollapsed;
    setIsSidebarCollapsed(newValue);
    // Só tenta salvar no banco se estiver logado e não for mobile
    if (window.innerWidth >= 1024) {
      try {
        await updateSidebarPreference(newValue);
      } catch (error) {
        console.error('Erro ao salvar preferência do sidebar:', error);
      }
    }
  };

  return (
    <SidebarContext.Provider value={{ isSidebarCollapsed, setIsSidebarCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
