import { RefreshCw, Cloud } from 'lucide-react';

interface SidebarGoogleDriveProps {
  isSidebarCollapsed: boolean;
  photographer: {
    google_refresh_token?: string | null;
  } | null;
  handleGoogleLogin: (force: boolean) => void;
}

export default function SidebarGoogleDrive({
  isSidebarCollapsed,
  photographer,
  handleGoogleLogin,
}: SidebarGoogleDriveProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const showFull = !isSidebarCollapsed || isMobile;

  return (
    <div
      className={`border-t border-white/5 ${isSidebarCollapsed && !isMobile ? 'px-0' : 'px-2'}`}
    >
      <div
        className={`relative group flex items-center transition-all duration-300 ${isSidebarCollapsed && !isMobile ? 'justify-center py-4' : 'gap-3 py-4 rounded-luxury hover:bg-white/5'}`}
      >
        {isSidebarCollapsed && !isMobile ? (
          <div className="relative flex items-center justify-center shrink-0">
            <div
              className={`h-2 w-2 rounded-full ${photographer?.google_refresh_token ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}
            />
            {photographer?.google_refresh_token ? (
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
            ) : (
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-amber-500 animate-ping opacity-75" />
            )}
          </div>
        ) : (
          <div className="text-white/90 ml-1">
            <Cloud size={20} strokeWidth={2} />
          </div>
        )}

        {showFull && (
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-luxury text-white/90 leading-none mb-1">
              Google Drive
            </span>
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center justify-center shrink-0">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${photographer?.google_refresh_token ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-luxury truncate ${photographer?.google_refresh_token ? 'text-green-500' : 'text-amber-500'}`}
              >
                {photographer?.google_refresh_token ? 'Sincronizado' : 'Ação Necessária'}
              </span>
              <button
                onClick={() => handleGoogleLogin(!photographer?.google_refresh_token)}
                className="p-1 hover:bg-white/10 rounded-luxury transition-colors text-white/90 interactive-luxury"
              >
                <RefreshCw
                  size={12}
                  strokeWidth={2.5}
                  className={!photographer?.google_refresh_token ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
