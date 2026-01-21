'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  topBanner?: ReactNode;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  headerIcon,
  footer,
  topBanner,
}: BaseModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-[1001] bg-black/70 backdrop-blur-md flex items-center justify-center px-6 md:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`w-full ${maxWidthClasses[maxWidth]} bg-petroleum border border-white/10 rounded-[0.5rem] shadow-2xl flex flex-col h-auto max-h-[85vh] relative animate-in zoom-in-95 duration-300 overflow-hidden`}
      >
        {/* TOP BANNER (opcional) */}
        {topBanner && (
          <div className="flex flex-col shrink-0">{topBanner}</div>
        )}

        {/* HEADER */}
        <div className="px-8 py-7 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
          <div className="min-w-0 text-left flex items-center gap-3">
            {headerIcon && (
              <div className="shrink-0">{headerIcon}</div>
            )}
            <div className="min-w-0">
              <h2 className="text-2xl text-white font-semibold tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[#F3E5AB] text-[11px] font-medium uppercase tracking-[0.15em] mt-2">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2.5 text-white bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 shrink-0"
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-black/20 min-h-0 no-scrollbar">
          {children}
        </div>

        {/* FOOTER (opcional) */}
        {footer && (
          <div className="px-8 py-8 bg-petroleum border-t border-white/5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
