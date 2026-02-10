import { Inbox, Archive, Trash2, Icon } from 'lucide-react';
import type { ViewType } from '../hooks/useDashboardFilters';
import { useSidebar } from '@/components/providers/SidebarProvider';

interface SidebarGaleriasProps {
  isSidebarCollapsed: boolean;
  counts: { active: number; archived: number; trash: number };
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  setCardsToShow: (count: number) => void;
}

export default function SidebarGalerias({
  isSidebarCollapsed,
  counts,
  currentView,
  setCurrentView,
  setCardsToShow,
}: SidebarGaleriasProps) {
  const { toggleSidebar } = useSidebar();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const items = [
    { id: 'active', label: 'Ativas', icon: Inbox, count: counts.active },
    {
      id: 'archived',
      label: 'Arquivadas',
      icon: Archive,
      count: counts.archived,
    },
    { id: 'trash', label: 'Lixeira', icon: Trash2, count: counts.trash },
  ];

  return (
    <div className="space-y-1">
      {(!isSidebarCollapsed || isMobile) && (
        <div className="mb-2 px-2">
          <span className="text-editorial-label text-white/90">GALERIAS</span>
        </div>
      )}
      <div className="flex flex-col gap-1 w-full">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentView(item.id as ViewType);
              setCardsToShow(8);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (isMobile && toggleSidebar) {
                toggleSidebar();
              }
            }}
            className={`relative flex items-center justify-start gap-3 w-full !px-3 py-2 
      rounded-luxury transition-all duration-300 text-left 
      ${
        currentView === item.id
          ? 'bg-white/10 text-champagne !translate-x-1'
          : 'text-white/90 hover:bg-white/5 hover:text-champagne'
      }`}
          >
            {/* 1. Indicador Ativo (Absoluto) */}
            {currentView === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-champagne rounded-r-full" />
            )}

            {/* 2. Ícone (Filho direto para alinhar pelo justify-start) */}
            <item.icon
              size={18}
              className={`${
                currentView === item.id ? 'text-champagne' : 'text-current'
              } shrink-0 ${currentView === item.id ? 'ml-1' : ''}`}
            />

            {/* 3. Texto (flex-grow garante que ele ocupe o centro e empurre o badge) */}
            {(!isSidebarCollapsed || isMobile) && (
              <span
                className={`text-editorial-label text-left flex-grow font-semibold tracking-widest ${
                  currentView === item.id ? 'opacity-100' : 'opacity-80'
                }`}
              >
                {item.label}
              </span>
            )}

            {/* 4. Contador (Alinhado à direita pelo flex-grow do span anterior) */}
            {(!isSidebarCollapsed || isMobile) && item.count > 0 && (
              <span
                className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full shrink-0 ${
                  currentView === item.id
                    ? 'bg-champagne text-black'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
