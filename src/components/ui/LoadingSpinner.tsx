'use client';
import { Camera } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  message?: string;
  variant?: 'default' | 'light';
}

export default function LoadingSpinner({
  size = 'md',
  message,
  variant = 'default',
}: LoadingSpinnerProps) {
  const sizes = {
    // Tamanho extra pequeno focado em Mobile/Grid
    xs: {
      container: 'w-10 h-10',
      camera: 14,
      blur: 'w-6 h-6',
      text: 'text-[8px]',
      stroke: 1,
    },
    sm: {
      container: 'w-16 h-16',
      camera: 20,
      blur: 'w-10 h-10',
      text: 'text-xs',
      stroke: 1.2,
    },
    md: {
      container: 'w-24 h-24',
      camera: 28,
      blur: 'w-16 h-16',
      text: 'text-sm',
      stroke: 1.5,
    },
    lg: {
      container: 'w-32 h-32',
      camera: 40,
      blur: 'w-20 h-20',
      text: 'text-base',
      stroke: 1.5,
    },
  };

  const s = sizes[size];

  // Cores baseadas no padrão editorial
  const colorClass = variant === 'light' ? 'text-petroleum' : 'text-champagne';
  const borderColorClass =
    variant === 'light' ? 'border-petroleum' : 'border-champagne';
  const bgBlurClass =
    variant === 'light' ? 'bg-petroleum/5' : 'bg-champagne/10';

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`relative ${s.container}`}>
        {/* Círculo de fundo (Estrutura do usuário) */}
        <div
          className={`absolute inset-0 rounded-full border border-white/5 transition-colors duration-300`}
        />

        {/* Círculo Giratório - Usando as cores padronizadas */}
        <div
          className={`absolute inset-0 rounded-full border-t-2 border-r-2 border-transparent ${borderColorClass} border-r-champagne/20 animate-spin transition-colors duration-300`}
          style={{ animationDuration: '1.5s' }}
        />

        {/* Centro com Câmera */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Glow Editorial */}
            {size !== 'xs' && (
              <div
                className={`absolute ${s.blur} ${bgBlurClass} blur-[15px] rounded-full animate-pulse transition-colors duration-300`}
              />
            )}
            <Camera
              size={s.camera}
              strokeWidth={s.stroke}
              className={`${colorClass} relative z-10 animate-pulse-gentle transition-colors duration-300`}
            />
          </div>
        </div>
      </div>

      {/* Mensagem Opcional - Microcopy Editorial Standard */}
      {message && size !== 'xs' && (
        <p
          className={`text-editorial-label ${colorClass} opacity-60 animate-pulse text-center px-4`}
        >
          {message}
        </p>
      )}

      <style jsx global>{`
        @keyframes pulse-gentle {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        .animate-pulse-gentle {
          animation: pulse-gentle 2.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
