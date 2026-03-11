// src/components/ui/Sheet.tsx
'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'right' | 'bottom';
  /** Tema visual (ex: EDITORIAL_WHITE) para aplicar no conteúdo do sheet */
  dataTheme?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  headerClassName = '',
  contentClassName = '',
  maxWidth = 'md',
  position = 'right',
  dataTheme,
}: SheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const maxWidthClasses = {
    sm: 'sm:w-[384px]',
    md: 'sm:w-[448px]',
    lg: 'sm:w-[512px]',
    xl: 'sm:w-[640px]',
    '2xl': 'sm:w-[768px]',
    '3xl': 'sm:w-[896px]',
    '4xl': 'sm:w-[1024px]',
    '5xl': 'sm:w-[1152px]',
    '6xl': 'sm:w-[1280px]',
    full: 'w-[98%] h-[98%]',
  };

  const positionClasses = {
    right: {
      container: 'items-end sm:items-stretch sm:justify-end',
      sheet: 'sm:slide-in-from-right sm:slide-in-from-bottom-0',
    },
    bottom: {
      container: 'items-end justify-center',
      sheet: '',
    },
  };

  const sheetContent = (
    <div
      className={`fixed inset-0 z-[1000] animate-in fade-in duration-300 flex ${positionClasses[position].container}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-petroleum/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drag handle — mobile only */}
      <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Sheet Panel */}
      <div
        className={`relative z-10 bg-white shadow-2xl flex flex-col w-full max-h-[92vh] animate-in slide-in-from-bottom duration-500 ${maxWidthClasses[maxWidth]} sm:max-h-full sm:h-full ${positionClasses[position].sheet}`}
        {...(dataTheme ? { 'data-theme': dataTheme } : {})}
      >
        {/* Header */}
        <div
          className={`shrink-0 px-4 py-3 sm:p-5 flex items-center justify-between ${headerClassName}`}
        >
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-luxury bg-white/10 flex items-center justify-center text-gold">
                {icon}
              </div>
            )}
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-white">
                {title}
              </h4>
              {subtitle && (
                <p className="text-[9px] text-white/70 font-semibold uppercase tracking-luxury mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto overscroll-contain ${contentClassName}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}

// Subcomponentes opcionais para melhor organização

export function SheetSection({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-4 border-b border-slate-100 space-y-2 ${className}`}>
      {title && (
        <p className="text-[9px] font-semibold uppercase tracking-wide text-petroleum/90 px-1 mb-1">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function SheetFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 px-5 py-3 bg-petroleum/5 border-t border-petroleum/10 text-center ${className}`}
    >
      {children}
    </div>
  );
}
