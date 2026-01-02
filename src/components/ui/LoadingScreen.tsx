'use client';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = 'Verificando seu acesso',
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black animate-in fade-in duration-700">
      <div className="relative w-16 h-16">
        {/* Círculo de fundo estático */}
        <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/10" />

        {/* Spinner animado em tom Champanhe/Dourado */}
        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#D4AF37] animate-spin shadow-[0_0_15px_rgba(212,175,55,0.2)]" />

        {/* Ponto central pulsante */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_8px_#D4AF37]" />
        </div>
      </div>

      {/* Texto com tracking (espaçamento) editorial */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-[10px] md:text-[12px] lg:text-[14px] uppercase tracking-[0.4em] text-[#D4AF37] font-bold animate-pulse text-center px-4">
          {message}
        </p>
        <div className="h-px w-8 bg-[#D4AF37]/30" />
      </div>
    </div>
  );
}
