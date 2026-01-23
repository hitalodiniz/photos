import { Camera, MapPin, Calendar } from 'lucide-react';

export const GaleriaHeader: React.FC<GaleriaHeaderProps> = ({
  title,
  location,
  data,
  className,
}) => {
  return (
    <div
      className={`flex flex-col items-start text-left min-w-0 flex-1 pointer-events-auto select-none ${className}`}
    >
      <div className="flex flex-col min-w-0 w-full">
        <h1 className="font-artistic font-bold text-editorial-ink dark:text-white leading-tight tracking-tight flex items-start gap-3 text-xl md:text-2xl mb-1 w-full transition-colors duration-300 italic">
          <div className="relative shrink-0 mt-1">
            <Camera
              className="text-editorial-gray dark:text-gold w-5 h-5 md:w-6 md:h-6 transition-colors duration-300"
              strokeWidth={1.5}
            />
          </div>
          <span className="line-clamp-2 break-words">{title}</span>
        </h1>
        <div className="h-[2px] bg-editorial-gray dark:bg-gold rounded-luxury mb-3 w-16 md:w-24 shadow-lg shrink-0 transition-colors duration-300 opacity-30" />
      </div>

      <div className="flex flex-col items-start gap-y-1 w-full min-w-0">
        {location && (
          <div className="flex items-center text-editorial-gray dark:text-white/60 text-[10px] md:text-[11px] font-bold uppercase tracking-luxury gap-1.5 w-full transition-colors duration-300">
            <MapPin size={12} className="dark:text-gold shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
        {data && (
          <div className="flex items-center text-editorial-gray dark:text-white/60 text-[10px] md:text-[11px] font-bold uppercase tracking-luxury gap-1.5 w-full transition-colors duration-300">
            <Calendar size={12} className="dark:text-gold shrink-0" />
            <span className="italic">
              {new Date(data).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
