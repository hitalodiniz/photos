// src/app/onboarding/UserMenu.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.client'

// Adicione o novo prop: avatarUrl
export default function UserMenu({
    session,
    handleLogout,
    avatarUrl 
}: {
    session: any,
    handleLogout: () => void,
    avatarUrl?: string | null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    const userEmail = session.user.email || 'Usuário';
    
    // Tenta obter o full_name ou usa o nome antes do @ do email como fallback
    const fullName = session.user.user_metadata?.full_name || userEmail.split('@')[0];
    
    avatarUrl = avatarUrl || session.user.user_metadata?.avatar_url || null;

    // Obtém a primeira letra do nome completo para o fallback
    const initialLetter = fullName.charAt(0).toUpperCase();

    // Lógica para fechar o menu (sem alteração)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !(menuRef.current as HTMLElement).contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMenuItemClick = () => {
        setIsOpen(false);
    };

    // Estilos Google (Ajustados)
    const avatarClass = "relative w-9 h-9 rounded-full cursor-pointer bg-[#D9E3F5] text-[#0B57D0] flex items-center justify-center font-semibold transition-shadow duration-150 hover:shadow-md overflow-hidden";
    const popoverClass = "absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 z-50"; 
    const menuItemClass = "w-full flex items-center gap-3 px-6 py-2.5 text-sm text-[#1F1F1F] font-medium hover:bg-[#F0F0F0] rounded-none transition-colors cursor-pointer";
    const menuItemDangerClass = "w-full flex items-center gap-3 px-6 py-2.5 text-sm text-[#B3261E] font-medium hover:bg-[#F0F0F0] rounded-none transition-colors cursor-pointer";

    // Função auxiliar para renderizar o Avatar com Borda Colorida
    const renderAvatar = (sizeClass: string, textClass: string, hasBorder: boolean = false) => {
        // Define as classes de borda colorida do Google (simplificadas)
        const avatarContainerClasses = hasBorder ? "border-4 border-[#DADCE0]" : "border-none"; 
        
        // Se houver um URL de avatar válido, renderiza o Image
        if (avatarUrl) {
            return (
                <div className={`${sizeClass} rounded-full overflow-hidden relative flex-shrink-0 ${hasBorder ? avatarContainerClasses : ''}`}>
                    <Image
                        src={avatarUrl}
                        alt="Avatar do Usuário"
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes={sizeClass} 
                        priority={true} 
                    />
                </div>
            );
        }
        // Caso contrário, retorna a letra inicial como fallback
        return (
            <div className={`${sizeClass} rounded-full bg-[#0B57D0] text-white flex items-center justify-center ${textClass} ${hasBorder ? avatarContainerClasses : ''}`}>
                {initialLetter}
            </div>
        );
    };


    return (
        <div className="ml-auto" >
            <div className="relative" ref={menuRef}>
                {/* Botão Avatar (Gatilho) */}
                <div className={avatarClass} onClick={() => setIsOpen(!isOpen)} title={userEmail}>
                    {/* CHAMA A FUNÇÃO AQUI para renderizar o Avatar no botão */}
                    {renderAvatar("w-9 h-9", "text-base font-semibold")}
                </div>

                {/* Menu Dropdown */}
                {isOpen && (
                    <div className={popoverClass}>

                        {/* 1. SEÇÃO DE INFORMAÇÕES DO USUÁRIO (Estilo Google) */}
                        <div className="flex flex-col items-center px-6 pt-2 pb-4">
                            {/* CHAMA A FUNÇÃO AQUI para renderizar o Avatar grande no cabeçalho */}
                            {renderAvatar("w-20 h-20 mb-3", "text-2xl font-bold", true)} 
                            
                            {/* Email no topo, como no Google (hitalodiniz@gmail.com) */}
                            <p className="text-sm text-[#444746] mb-0.5">{userEmail}</p>

                            {/* Nome Completo como saudação (Olá, Hitalo!) */}
                            <p className="text-2xl font-normal text-[#1F1F1F] mb-4">Olá, {fullName.split(' ')[0]}!</p>
                            
                            {/* Botão de Ação "Gerenciar/Editar Perfil" */}
                            <Link 
                                href="/onboarding" 
                                onClick={handleMenuItemClick}
                                className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-[#0B57D0] border border-[#DADCE0] rounded-full hover:bg-[#F0F0F0] transition-colors whitespace-nowrap"
                            >
                                Gerenciar seu Perfil
                            </Link>

                        </div>
                        
                        {/* Linha Divisória Fina */}
                        <div className="my-2 border-t border-[#E0E0E0]"></div>

                        {/* 2. ITEM: SAIR (Logout) */}
                        <button
                            onClick={handleLogout}
                            className={menuItemClass}
                        >
                            {/* ÍCONE SVG: Sair (Door + Arrow) */}
                            <svg
                                className="w-5 h-5 text-[#444746]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sair da conta
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}