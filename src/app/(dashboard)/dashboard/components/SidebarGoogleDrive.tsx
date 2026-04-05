'use client';

import { RefreshCw, Cloud } from 'lucide-react';

interface SidebarGoogleDriveProps {
  isSidebarCollapsed: boolean;
  photographer: {
    google_refresh_token?: string | null;
  } | null;
  handleGoogleLogin: (force: boolean) => void;
}

// SidebarGoogleDrive — responsabilidade única: status da conexão com o Drive.
// Métricas de uso (galerias, fotos) ficam em SidebarStorage para evitar
// duplicação e confusão de informações na sidebar.
export default function SidebarGoogleDrive({
  isSidebarCollapsed,
  photographer,
  handleGoogleLogin,
}: SidebarGoogleDriveProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const showFull = !isSidebarCollapsed || isMobile;
  const isConnected = !!photographer?.google_refresh_token;

  return (
    <div
      className={`border-t border-white/5 ${
        isSidebarCollapsed && !isMobile ? 'px-0' : 'px-2'
      }`}
    >
      <div
        className={`relative group flex items-center transition-all duration-300 ${
          isSidebarCollapsed && !isMobile
            ? 'justify-center py-4'
            : 'gap-3 py-3 rounded-luxury hover:bg-white/5'
        }`}
      >
        {/* ── Modo colapsado: só o dot de status ───────────────────────── */}
        {isSidebarCollapsed && !isMobile ? (
          <div className="relative flex items-center justify-center shrink-0">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                  : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              }`}
            />
            <div
              className={`absolute inset-0 h-2 w-2 rounded-full animate-ping opacity-75 ${
                isConnected ? 'bg-green-500' : 'bg-amber-500'
              }`}
            />
          </div>
        ) : (
          <div className="text-white/60 ml-1 shrink-0">
            <Cloud size={16} strokeWidth={2} />
          </div>
        )}

        {/* ── Modo expandido ────────────────────────────────────────────── */}
        {showFull && (
          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-luxury text-white/60 leading-none truncate">
                Google Drive
              </span>
              <div
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  isConnected
                    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                    : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                }`}
              />
              <span
                className={`text-[10px] font-semibold tracking-luxury shrink-0 ${
                  isConnected ? 'text-green-400' : 'text-amber-400'
                }`}
              >
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            <button
              onClick={() => handleGoogleLogin(!isConnected)}
              title={isConnected ? 'Reconectar' : 'Conectar ao Google Drive'}
              className="p-1 hover:bg-white/10 active:bg-white/20 rounded-luxury transition-colors text-white/40 hover:text-white/80 shrink-0"
            >
              <RefreshCw
                size={11}
                strokeWidth={2.5}
                className={!isConnected ? 'animate-spin' : ''}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
