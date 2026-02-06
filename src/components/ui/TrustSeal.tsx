'use client';
import React from 'react';
import { ShieldCheck, LucideIcon } from 'lucide-react';

interface TrustSealProps {
  icon?: LucideIcon;
  text: string;
  className?: string;
}

export default function TrustSeal({
  icon: Icon = ShieldCheck,
  text,
  className = '',
}: TrustSealProps) {
  return (
    <div className={`mt-16 flex justify-center ${className}`}>
      <div className="flex items-center gap-4 bg-white/15 border border-white/10 px-4 py-3 rounded-luxury backdrop-blur-sm transition-all hover:bg-white/10 hover:border-gold/30 group">
        {/* Mantive o ícone em 18px com a cor gold */}
        <div className="text-gold transition-transform group-hover:scale-110">
          <SegmentIcon size={18} strokeWidth={1.5} />
        </div>

        {/* Mantive a tipografia exata: 11px, Medium, Tracking 0.2em */}
        <span className="text-[11px] font-medium uppercase tracking-luxury-widest text-white/80 leading-none">
          {text}
        </span>
      </div>
    </div>
  );
}
