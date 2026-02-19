'use client';

import { useRouter } from 'next/navigation';
import FormPageBase from './FormPageBase';
import { ExternalLink, Search } from 'lucide-react';
import { Galeria } from '@/core/types/galeria';
import { getPublicGalleryUrl } from '@/core/utils/url-helper';
import { useMemo } from 'react';

interface RelatorioBasePageProps {
  title: string;
  children: React.ReactNode;
  footerStatusText?: string;
  exportButtons?: React.ReactNode;
  onBack?: () => void;
  /** Slot para o cabeçalho flexível (Galeria + Busca, etc) */
  headerContent?: React.ReactNode;
}

export function RelatorioBasePage({
  title,
  children,
  footerStatusText,
  exportButtons,
  onBack,
  headerContent,
}: RelatorioBasePageProps) {
  const router = useRouter();

  return (
    <FormPageBase
      title={title}
      onClose={onBack || (() => router.back())}
      isShowButtons={false}
      footerStatusText={footerStatusText}
      footerButtons={exportButtons}
      onSubmit={() => {}}
    >
      <div className="flex flex-col h-full max-w-[1600px] mx-auto px-4 md:px-6 antialiased subpixel-antialiased">
        {headerContent && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-slate-100 mb-4">
            {headerContent}
          </div>
        )}
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </FormPageBase>
  );
}

export function RelatorioSelectedGallery({
  galeria,
  className,
}: {
  galeria?: Galeria;
  className?: string;
}) {
  const publicUrl = useMemo(() => {
    return getPublicGalleryUrl(galeria?.photographer, galeria?.slug);
  }, [galeria]);

  if (!galeria) return null;

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gold/80 mb-0.5">
        Galeria selecionada
      </span>
      <h2 className="text-[15px] font-bold text-petroleum truncate leading-tight">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gold transition-colors inline-flex items-center gap-2"
        >
          {galeria?.title}
          <ExternalLink size={14} className="opacity-50 shrink-0" />
        </a>
      </h2>
    </div>
  );
}

export function RelatorioSearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative group ${className}`}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-petroleum/30 group-focus-within:text-gold/60 transition-colors"
        size={16}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        /* tabular-nums garante que números fiquem alinhados e nítidos */
        className="w-full !pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-luxury text-sm tabular-nums outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/10 transition-all placeholder:text-slate-400"
      />
    </div>
  );
}
