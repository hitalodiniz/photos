'use client';
import { Camera } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string; // Prop opcional para a mensagem
}

export default function LoadingSpinner({
  size = 'md',
  message,
}: LoadingSpinnerProps) {
  // Ajuste de tamanhos proporcionais
  const sizes = {
    sm: {
      container: 'w-16 h-16',
      camera: 'w-6 h-6',
      blur: 'w-10 h-10',
      text: 'text-xs',
    },
    md: {
      container: 'w-24 h-24',
      camera: 'w-8 h-8',
      blur: 'w-16 h-16',
      text: 'text-sm',
    },
    lg: {
      container: 'w-32 h-32',
      camera: 'w-12 h-12',
      blur: 'w-20 h-20',
      text: 'text-base',
    },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`relative ${s.container}`}>
        {/* Círculo de fundo */}
        <div className="absolute inset-0 rounded-full border border-[#F3E5AB]/10" />

        {/* Círculo Giratório */}
        <div
          className="absolute inset-0 rounded-full border-t-[2px] border-r-[2px] border-transparent border-t-[#F3E5AB] border-r-[#F3E5AB]/30 animate-spin"
          style={{ animationDuration: '2s' }}
        />

        {/* Centro com Câmera */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              className={`absolute ${s.blur} bg-[#F3E5AB]/10 blur-[20px] rounded-full animate-pulse`}
            />
            <Camera
              className={`text-[#F3E5AB] relative z-10 ${s.camera}`}
              strokeWidth={1}
              style={{ animation: 'pulse 3s infinite ease-in-out' }}
            />
          </div>
        </div>
      </div>

      {/* Mensagem Opcional */}
      {message && (
        <p
          className={`font-serif italic text-[#F3E5AB]/80 tracking-wide animate-pulse ${s.text}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
