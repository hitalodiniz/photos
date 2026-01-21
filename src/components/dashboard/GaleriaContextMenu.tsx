'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  X,
  Inbox,
} from 'lucide-react';
import type { Galeria } from '@/core/types/galeria';

interface GaleriaContextMenuProps {
  galeria: Galeria;
  currentView: 'active' | 'archived' | 'trash';
  onArchive: (galeria: Galeria) => void;
  onDelete: (galeria: Galeria) => void;
  onToggleShowOnProfile: (galeria: Galeria) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  isUpdating?: boolean;
}

export default function GaleriaContextMenu({
  galeria,
  currentView,
  onArchive,
  onDelete,
  onToggleShowOnProfile,
  onRestore,
  onPermanentDelete,
  isUpdating = false,
}: GaleriaContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = isMobile ? 'hidden' : 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMobile]);

  const handleAction = (action: () => void, closeMenu = true) => {
    action();
    if (closeMenu) {
      setIsOpen(false);
    }
  };

  const handleToggle = (action: () => void) => {
    // Para toggles, não fecha o menu para o usuário ver o resultado
    action();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleAction(() => onDelete(galeria), true); // Fecha o menu ao deletar
  };

  // Mobile: Bottom Sheet
  if (isMobile && isOpen) {
    return (
      <>
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="p-2 text-petroleum hover:text-[#D4AF37] transition-colors"
          disabled={isUpdating}
        >
          <MoreVertical size={18} />
        </button>

        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
          onClick={() => setIsOpen(false)}
        />

        {/* Bottom Sheet */}
        <div
          ref={menuRef}
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[9999] lg:hidden animate-in slide-in-from-bottom duration-300"
        >
          <div className="p-4 border-b border-petroleum/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Ações da Galeria
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="p-2 space-y-2">
            {currentView === 'active' && (
              <>
                {/* Toggle Exibir no Perfil */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {galeria.show_on_profile ? (
                      <Eye size={18} className="text-slate-400 shrink-0" />
                    ) : (
                      <EyeOff size={18} className="text-slate-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                      Exibir no Perfil
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(() => onToggleShowOnProfile(galeria));
                    }}
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${
                      galeria.show_on_profile ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        galeria.show_on_profile ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle Arquivar */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-amber-50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Archive size={18} className="text-amber-600 shrink-0" />
                    <span className="text-sm font-medium text-amber-600 whitespace-nowrap">
                      Arquivar
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(() => onArchive(galeria));
                    }}
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${
                      galeria.is_archived ? 'bg-amber-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        galeria.is_archived ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Mover para Lixeira */}
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  <Trash2 size={20} className="text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    Mover para Lixeira
                  </span>
                </button>
              </>
            )}

            {currentView === 'archived' && (
              <>
                <button
                  onClick={() => handleAction(() => onArchive(galeria))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-amber-50 transition-colors text-left"
                >
                  <Archive size={20} className="text-amber-600" />
                  <span className="text-sm font-medium text-amber-600">
                    Desarquivar
                  </span>
                </button>
                <button
                  onClick={() => handleAction(() => onDelete(galeria))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  <Trash2 size={20} className="text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    Mover para Lixeira
                  </span>
                </button>
              </>
            )}

            {currentView === 'trash' && (
              <>
                <button
                  onClick={() => handleAction(() => onRestore(galeria.id))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left"
                >
                  <Inbox size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">
                    Restaurar
                  </span>
                </button>
                <button
                  onClick={() => handleAction(() => onPermanentDelete(galeria.id))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  <Trash2 size={20} className="text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    Excluir Permanentemente
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // Desktop: Dropdown
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current && !isMobile) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen, isMobile]);

  const dropdownMenu = isOpen && !isMobile ? (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-petroleum/50 z-[9999] min-w-[200px] py-1"
      style={{
        top: `${menuPosition.top}px`,
        right: `${menuPosition.right}px`,
      }}
    >
      {currentView === 'active' && (
            <>
              {/* Toggle Exibir no Perfil */}
              <div className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-slate-50 transition-colors rounded-t-lg">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {galeria.show_on_profile ? (
                    <Eye size={16} className="text-slate-400 shrink-0" />
                  ) : (
                    <EyeOff size={16} className="text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                    Exibir no Perfil
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(() => onToggleShowOnProfile(galeria));
                  }}
                  className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${
                    galeria.show_on_profile ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      galeria.show_on_profile ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Arquivar */}
              <div className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-amber-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Archive size={16} className="text-amber-600 shrink-0" />
                  <span className="text-sm font-medium text-amber-600 whitespace-nowrap">
                    Arquivar
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(() => onArchive(galeria));
                  }}
                  className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${
                    galeria.is_archived ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      galeria.is_archived ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Mover para Lixeira */}
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left rounded-b-lg"
              >
                <Trash2 size={16} className="text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  Mover para Lixeira
                </span>
              </button>
            </>
          )}

          {currentView === 'archived' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(() => onArchive(galeria));
                }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-amber-50 transition-colors text-left"
              >
                <Archive size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-600">
                  Desarquivar
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(() => onDelete(galeria));
                }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 size={16} className="text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  Mover para Lixeira
                </span>
              </button>
            </>
          )}

          {currentView === 'trash' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(() => onRestore(galeria.id));
                }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 transition-colors text-left"
              >
                <Inbox size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  Restaurar
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(() => onPermanentDelete(galeria.id));
                }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 size={16} className="text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  Excluir Permanentemente
                </span>
              </button>
            </>
          )}
        </div>
      ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-petroleum hover:text-[#D4AF37] transition-colors rounded-lg border border-petroleum/50 hover:bg-slate-50"
        disabled={isUpdating}
      >
        <MoreVertical size={18} />
      </button>

      {typeof window !== 'undefined' && dropdownMenu
        ? createPortal(dropdownMenu, document.body)
        : null}
    </div>
  );
}
