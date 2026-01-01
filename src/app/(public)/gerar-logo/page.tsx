'use client';
import { Camera } from 'lucide-react';

export default function GerarLogoPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      {/* Container de captura - 512x512 é o ideal para o Google */}
      <div
        id="logo-capture"
        className="w-[512px] h-[512px] flex items-center justify-center bg-white"
      >
        {/* O círculo luxuoso que você usa no seu app */}
        <div className="p-12 bg-[#0a0a0a] rounded-full border border-white/10 shadow-2xl flex items-center justify-center">
          <Camera
            size={240}
            strokeWidth={1.5}
            className="text-[#F3E5AB] drop-shadow-[0_0_30px_rgba(243,229,171,0.4)]"
          />
        </div>
      </div>
    </div>
  );
}
