import { useSegment } from '@/hooks/useSegment';
import { div } from 'framer-motion/client';
import { Camera, MapPin, Calendar } from 'lucide-react';

export const GaleriaHeader = ({ title, location, data, className }) => {
  const { SegmentIcon } = useSegment();
  return (
    <div
      className={`flex flex-col items-start text-left min-w-0 flex-1 pointer-events-auto select-none ${className}`}
    >
      <div className="flex flex-col min-w-0 w-full">
        <h1 className=" font-semibold text-editorial-ink dark:text-white leading-tight tracking-luxury-tight flex items-start gap-3 text-xl md:text-2xl mb-1 w-full transition-colors duration-300">
          <div className="relative shrink-0 mt-1">
            <SegmentIcon
              className="text-petroleum dark:text-champagne w-5 h-5 md:w-6 md:h-6 transition-colors duration-300"
              strokeWidth={1.5}
            />
          </div>
          <span className="line-clamp-2 break-words">{title}</span>
        </h1>
        <div className="h-[2px] bg-petroleum dark:bg-champagne rounded-luxury mb-3 w-16 md:w-24 shadow-lg shrink-0 transition-colors duration-300 opacity-30" />
      </div>

      <div className="flex flex-col items-start gap-y-1 w-full min-w-0">
        {location && (
          <div className="flex items-center text-editorial-gray dark:text-white text-[10px] md:text-[11px] font-semibold uppercase tracking-luxury gap-1.5 w-full transition-colors duration-300">
            <MapPin size={12} className="dark:text-champagne shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
        {data && (
          <div className="flex items-center text-editorial-gray dark:text-white text-[10px] md:text-[11px] font-semibold uppercase tracking-luxury gap-1.5 w-full transition-colors duration-300">
            <Calendar size={12} className="dark:text-champagne shrink-0" />

            {new Date(data).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        )}
      </div>
    </div>
  );
};
