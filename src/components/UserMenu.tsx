'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase'; // Ajuste o caminho

// Recebe a sessão do AuthStatusButton
export default function UserMenu({ session, handleLogout }: { session: any, handleLogout: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    const userEmail = session.user.email || 'Usuário';
    const initialLetter = userEmail.charAt(0).toUpperCase();

    // Fecha o menu se o usuário clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    // Estilos Material Design (adaptado do seu tema)
    const avatarClass = "w-9 h-9 rounded-full cursor-pointer bg-[#D9E3F5] text-[#0B57D0] flex items-center justify-center font-semibold transition-shadow duration-150 hover:shadow-md";
    const popoverClass = "absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl py-3 border border-[#E0E3E7] z-50";

    return (
        < div className = "ml-auto" >
            <div className="relative" ref={menuRef}>
                {/* Botão Avatar (Gatilho) */}
                <div className={avatarClass} onClick={() => setIsOpen(!isOpen)} title={userEmail}>
                    {initialLetter}
                </div>

                {/* Menu Dropdown */}
                {isOpen && (
                    <div className={popoverClass}>
                        {/* Cabeçalho do Usuário */}
                        <div className="flex flex-col items-center p-4 border-b border-[#E0E3E7]">
                            <div className="w-12 h-12 rounded-full bg-[#0B57D0] text-white flex items-center justify-center text-xl font-bold mb-2">
                                {initialLetter}
                            </div>
                            <p className="text-base font-medium text-[#1F1F1F]">{userEmail.split('@')[0]}</p>
                            <p className="text-xs text-[#444746] mt-0.5">{userEmail}</p>
                        </div>

                        {/* Opção de Ação (Logout) */}
                        <div className="p-2">
                            <button
                                onClick={handleLogout}
                                // Estilo: Centraliza o texto e o ícone
                                className="w-full text-center text-sm font-medium text-[#B3261E] bg-[#FFDAD6] hover:bg-[#FFC3BB] py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {/* ÍCONE SVG: Sair (Door + Arrow) */}
                                <svg
                                    className="w-4 h-4"
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
                                Sair
                            </button>
                        </div>

                        {/* Adicione aqui links de Perfil, Configurações, etc., se necessário */}
                    </div>
                )}
            </div></div >
    );
}