import { Inbox, Archive, Trash2 } from 'lucide-react';
import type { ViewType } from '../hooks/useDashboardFilters';

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
  const items = [
    { id: 'active', label: 'Ativas', icon: Inbox, count: counts.active },
    { id: 'archived', label: 'Arquivadas', icon: Archive, count: counts.archived },
    { id: 'trash', label: 'Lixeira', icon: Trash2, count: counts.trash },
  ];

  return (
    <div className="space-y-1">
      {!isSidebarCollapsed && (
        <div className="mb-2 px-2">
          <span className="text-editorial-label text-white/90">
            GALERIAS
          </span>
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
            }}
            className={`flex items-center justify-between group relative w-full px-3 py-2 rounded-luxury transition-all duration-300 ${currentView === item.id ? 'bg-white/10 text-gold translate-x-1' : 'text-white/90 hover:bg-white/5 hover:text-gold'}`}
          >
            {currentView === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gold rounded-r-full" />
            )}
            <div className="flex items-center gap-3">
              <item.icon
                size={18}
                className={
                  currentView === item.id
                    ? 'text-gold'
                    : 'text-current transition-colors'
                }
              />
              {!isSidebarCollapsed && (
                <span
                  className={`text-editorial-label text-left ${currentView === item.id ? 'font-semibold' : ''}`}
                >
                  {item.label}
                </span>
              )}
            </div>
            {!isSidebarCollapsed && item.count > 0 && (
              <span
                className={`text-[10px] font-semibold tracking-luxury px-2 py-0.5 rounded-full ${
                  currentView === item.id ? 'bg-gold text-black' : 'bg-white/10 text-white/90'
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
