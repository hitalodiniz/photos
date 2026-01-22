import { RefreshCw } from 'lucide-react';

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
  return (
    <div
      className={`border-t border-white/5 ${isSidebarCollapsed ? 'px-0' : 'px-2'}`}
    >
      <div
        className={`relative group flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'justify-center py-4' : 'gap-3 py-4 rounded-luxury hover:bg-white/5'}`}
      >
        <div className="relative flex items-center justify-center shrink-0 ml-1">
          <div
            className={`h-2 w-2 rounded-full ${photographer?.google_refresh_token ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}
          />
          {photographer?.google_refresh_token ? (
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
          ) : (
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-amber-500 animate-ping opacity-75" />
          )}
        </div>

        {!isSidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-semibold uppercase tracking-luxury text-white/40 leading-none mb-1">
              Google Drive
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-semibold tracking-luxury truncate ${photographer?.google_refresh_token ? 'text-green-500' : 'text-amber-500'}`}
              >
                {photographer?.google_refresh_token ? 'Sincronizado' : 'Ação Necessária'}
              </span>
              <button
                onClick={() => handleGoogleLogin(!photographer?.google_refresh_token)}
                className="p-1 hover:bg-white/10 rounded-luxury transition-colors text-white/40 interactive-luxury"
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
