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
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const maxWidthClasses: Record<string, string> = {
    sm: 'sm:w-[384px]',
    md: 'sm:w-[448px]',
    lg: 'sm:w-[600px]',
    xl: 'sm:w-[640px]',
    '2xl': 'sm:w-[768px]',
    '3xl': 'sm:w-[896px]',
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
      className={`fixed inset-0 z-[9999] animate-in fade-in duration-200 flex ${positionClasses[position].container}`}
      {...(dataTheme ? { 'data-theme': dataTheme } : {})}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet Panel */}
      <div
        className={`relative z-10 bg-white shadow-2xl flex flex-col w-full max-h-[90vh] animate-in slide-in-from-bottom duration-300 ${maxWidthClasses[maxWidth]} sm:max-h-full sm:h-full ${positionClasses[position].sheet}`}
      >
        {/* Mobile: Pull Indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 pub-bar-bg">
          <div className="w-12 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header — Petroleum com Divisor */}
        <div className={`shrink-0 pub-bar-bg ${headerClassName}`}>
          <div className="px-6 py-4 flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {icon && (
                <div className="shrink-0 w-9 h-9 rounded-lg bg-gold/20 border border-gold/30 flex items-center justify-center text-gold">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-white leading-tight">
                  {title}
                </h4>
                {subtitle && (
                  <p className="text-xs text-white/60 mt-1 leading-tight">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-3"
            >
              <X size={20} />
            </button>
          </div>

          {/* Divisor Visual - Champagne */}
          <div className="h-1 bg-champagne" />
        </div>

        {/* Content — Fundo Branco */}
        <div
          className={`flex-1 overflow-y-auto overscroll-contain bg-white ${contentClassName}`}
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
    <div
      className={`px-6 py-3 border-b border-slate-100 space-y-2 ${className}`}
    >
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wider pub-bar-text/70 mb-2">
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
      className={`shrink-0 px-6 py-3 bg-slate-50 border-t border-slate-200 ${className}`}
    >
      {children}
    </div>
  );
}
