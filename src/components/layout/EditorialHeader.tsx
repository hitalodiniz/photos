'use client';
import React from 'react';
import { Camera, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EditorialHeaderProps {
    title: string;
    subtitle: React.ReactNode;
    showBackButton?: boolean; // Novo parâmetro opcional
}

export default function EditorialHeader({
    title,
    subtitle,
    showBackButton = true // Valor padrão é verdadeiro
}: EditorialHeaderProps) {
    const router = useRouter();

    return (
        <header className="relative flex-none pt-8 md:pt-12 pb-0 w-full max-w-6xl mx-auto">
            {/* Exibição condicional do botão voltar */}
            {showBackButton && (
                <div className="fixed left-4 md:left-10 top-8 md:top-12 z-50">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-6 py-2 text-[10px] font-bold tracking-[0.3em] text-[#F3E5AB] bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300 backdrop-blur-md group uppercase shadow-2xl"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Voltar
                    </button>
                </div>
            )}

            {/* Conteúdo Centralizado */}
            <div className="flex flex-col items-center justify-center text-center gap-2 md:gap-6">
                <Link
                    href="/"
                    className="transition-transform duration-300 hover:scale-110 active:scale-95 z-30">
                    <div className="p-4 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
                        <Camera className="text-[#F3E5AB] w-6 h-6 md:w-10 md:h-10 drop-shadow-[0_0_15px_rgba(243,229,171,0.3)]" />
                    </div>
                </Link>
                <div className="space-y-4">
                    <h1
                        className="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow-2xl italic"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        {title}
                    </h1>
                    <div className="text-[14px] md:text-[18px] text-white/90 tracking-wide italic md:p-2">
                        {subtitle}
                    </div>
                </div>
            </div>
        </header>
    );
}