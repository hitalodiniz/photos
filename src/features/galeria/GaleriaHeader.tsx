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
        <h1 className="font-artistic font-semibold text-slate-900 dark:text-white leading-tight tracking-tight flex items-start gap-3 text-xl md:text-2xl mb-1 w-full transition-colors duration-300">
          <div className="relative shrink-0 mt-1">
            <Camera
              className="text-slate-700 dark:text-[#F3E5AB] w-5 h-5 md:w-6 md:h-6 transition-colors duration-300"
              strokeWidth={1.5}
            />
          </div>
          <span className="line-clamp-2 break-words">{title}</span>
        </h1>
        <div className="h-[2px] bg-slate-700 dark:bg-[#F3E5AB] rounded-full mb-2 w-16 md:w-24 shadow-lg shrink-0 transition-colors duration-300" />
      </div>

      <div className="flex flex-col items-start gap-y-1 w-full min-w-0">
        {location && (
          <div className="flex items-center text-slate-700 dark:text-white/80 text-[10px] md:text-[12px] font-medium gap-1.5 w-full transition-colors duration-300">
            <MapPin size={12} className="text-slate-600 dark:text-[#F3E5AB] shrink-0 transition-colors duration-300" />
            <span className="truncate">{location}</span>
          </div>
        )}
        {data && (
          <div className="flex items-center text-slate-700 dark:text-white/80 text-[10px] md:text-[12px] font-medium gap-1.5 w-full transition-colors duration-300">
            <Calendar size={12} className="text-slate-600 dark:text-[#F3E5AB] shrink-0 transition-colors duration-300" />
            <span>
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
