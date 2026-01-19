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
        <h1 className="font-artistic font-semibold text-white leading-tight tracking-tight flex items-start gap-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-xl md:text-2xl mb-1 w-full">
          <div className="relative shrink-0 mt-1">
            <Camera
              className="text-[#F3E5AB] w-5 h-5 md:w-6 md:h-6"
              strokeWidth={1.5}
            />
          </div>
          <span className="line-clamp-2 break-words">{title}</span>
        </h1>
        <div className="h-[2px] bg-[#F3E5AB] rounded-full mb-2 w-16 md:w-24 shadow-lg shrink-0" />
      </div>

      <div className="flex flex-col items-start gap-y-1 w-full min-w-0">
        {location && (
          <div className="flex items-center text-white/80 text-[10px] md:text-[12px] font-medium gap-1.5 drop-shadow-md w-full">
            <MapPin size={12} className="text-[#F3E5AB] shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
        {data && (
          <div className="flex items-center text-white/80 text-[10px] md:text-[12px] font-medium gap-1.5 drop-shadow-md w-full">
            <Calendar size={12} className="text-[#F3E5AB] shrink-0" />
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
