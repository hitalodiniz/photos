'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?:
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | 'full';
  showCloseButton?: boolean;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  topBanner?: ReactNode;
  overlayColor?: string;
  overlayOpacity?: string;
  blurLevel?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
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
  overlayColor = 'bg-petroleum',
  overlayOpacity = '60',
  blurLevel = 'md',
}: BaseModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && showCloseButton) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, showCloseButton, onClose]);

  if (!isOpen || !mounted) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm w-full',
    md: 'max-w-md w-full',
    lg: 'max-w-lg w-full',
    xl: 'max-w-xl w-full',
    '2xl': 'max-w-2xl w-full',
    '3xl': 'max-w-3xl w-full',
    '4xl': 'max-w-4xl w-full',
    '5xl': 'max-w-5xl w-full',
    '6xl': 'max-w-6xl w-full',
    full: 'w-[98%] h-[98%]',
  };

  const blurClasses = {
    none: 'backdrop-blur-none',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  };

  const containerPadding = maxWidth === 'full' ? 'p-0' : 'px-6 md:p-6';

  const modalContent = (
    <div
      className={`fixed inset-0 z-[10000] ${overlayColor}/${overlayOpacity} ${blurClasses[blurLevel]} flex items-center justify-center ${containerPadding} animate-in fade-in duration-500`}
    >
      <div
        className="absolute inset-0"
        onClick={() => showCloseButton && onClose()}
      />

      <div
        className={`${maxWidthClasses[maxWidth]} flex flex-col ${
          maxWidth === 'full' ? 'h-full' : 'h-auto max-h-[90vh]'
        } relative shadow-2xl ${
          maxWidth === 'full' ? 'rounded-none' : 'rounded-luxury'
        } overflow-hidden border border-white/10`}
      >
        <div className="bg-petroleum px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {headerIcon && (
              <div className="text-gold scale-90">{headerIcon}</div>
            )}
            <div>
              <h2 className="text-sm text-white font-bold uppercase -tracking-luxury-normal leading-none">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[10px] font-bold uppercase tracking-luxury text-gold mt-1.5 opacity-90">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-white/90 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="bg-white flex-1 overflow-y-auto no-scrollbar">
          {topBanner && (
            <div className="border-b border-petroleum/10">{topBanner}</div>
          )}

          {maxWidth === 'full' ? (
            <div className="h-full">{children}</div>
          ) : (
            <div className="p-5">
              <div className="border border-petroleum/20 rounded-luxury p-4 bg-white shadow-sm">
                {children}
              </div>
            </div>
          )}
        </div>

        {footer && (
          <div className="bg-petroleum px-6 py-4 border-t border-white/10 shrink-0 text-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
