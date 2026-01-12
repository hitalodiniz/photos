'use client';
import { Camera } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'; // Adicionado 'xs'
  message?: string;
}

export default function LoadingSpinner({
  size = 'md',
  message,
}: LoadingSpinnerProps) {
  const sizes = {
    // 🎯 NOVO: Tamanho extra pequeno focado em Mobile/Grid
    xs: {
      container: 'w-10 h-10',
      camera: 'w-4 h-4',
      blur: 'w-6 h-6',
      text: 'text-[8px]',
      stroke: 1,
    },
    sm: {
      container: 'w-16 h-16',
      camera: 'w-6 h-6',
      blur: 'w-10 h-10',
      text: 'text-xs',
      stroke: 1.2,
    },
    md: {
      container: 'w-24 h-24',
      camera: 'w-8 h-8',
      blur: 'w-16 h-16',
      text: 'text-sm',
      stroke: 1.5,
    },
    lg: {
      container: 'w-32 h-32',
      camera: 'w-12 h-12',
      blur: 'w-20 h-20',
      text: 'text-base',
      stroke: 1.5,
    },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`relative ${s.container}`}>
        {/* Círculo de fundo */}
        <div className="absolute inset-0 rounded-full border border-[#F3E5AB]/5" />

        {/* Círculo Giratório */}
        <div
          className="absolute inset-0 rounded-full border-t-[1.5px] border-r-[1.5px] border-transparent border-t-[#F3E5AB] border-r-[#F3E5AB]/20 animate-spin"
          style={{ animationDuration: '1.5s' }}
        />

        {/* Centro com Câmera */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Blur reduzido para o tamanho XS */}
            {size !== 'xs' && (
              <div
                className={`absolute ${s.blur} bg-[#F3E5AB]/10 blur-[15px] rounded-full animate-pulse`}
              />
            )}
            <Camera
              className={`text-[#F3E5AB] relative z-10 ${s.camera}`}
              strokeWidth={s.stroke}
              style={{ animation: 'pulse 2.5s infinite ease-in-out' }}
            />
          </div>
        </div>
      </div>

      {/* Mensagem Opcional - Só exibe acima de XS ou se for forçada */}
      {message && size !== 'xs' && (
        <p
          className={`font-serif italic text-[#F3E5AB]/60 tracking-[0.1em] uppercase animate-pulse ${s.text}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
