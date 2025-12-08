'use client';
import React from 'react';
import GoogleSignInButton from './GoogleSignInButton';
export default function LandingPageContent() {
    return (
        <div 
        className="min-h-screen flex flex-col items-center justify-start p-4 bg-[#F8FAFD] font-sans relative overflow-hidden">

            {/* ELEMENTO DE FUNDO SUTIL (Adiciona profundidade, estilo Material) */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-[#E9EEF6] opacity-50 transform skew-y-3 origin-top-left"></div>
            {/* CONTEÚDO PRINCIPAL (Card Branco Elevado) */}
            <div className="max-w-3xl w-full text-center p-8 lg:p-10 bg-white rounded-2xl shadow-2xl border border-[#E0E3E7] relative z-10">
                {/* Ícone e Título */}
                <div className="flex flex-col items-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-[#0B57D0] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <path d="M7 10l5 5 5-5"></path>
                    </svg>

                    {/* HEADLINE / PROPOSTA DE VALOR */}
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-[#1F1F1F] mb-3">
                        A entrega de fotos que seus clientes merecem.
                    </h1>
                    <p className="text-[#444746] text-base lg:text-md">
                        Crie galerias integradas ao Google Drive, automatize a entrega e encante o seu cliente.
                    </p>
                </div>

                {/* SEÇÃO DE RECURSOS / VANTAGENS (Material Grid) */}
                <div className="grid grid-cols-3 gap-3 mb-8 mt-6 text-[#1F1F1F] border-t border-b border-[#E0E3E7] py-4">
                    <FeatureItem icon="✅" label="100% integrado ao Google Drive" color="#00A651" />
                    <FeatureItem icon="⏱️" label="Entrega Rápida" color="#FBBC05" />
                    <FeatureItem icon="☁️" label="Custo Zero de Storage" color="#4285F4" />
                </div>

                {/* CTA PRINCIPAL (Botão Google) */}
                <GoogleSignInButton />
            </div>
        </div>
    );
}

// NOVO COMPONENTE AUXILIAR (Para manter o ClientAdminWrapper limpo)
function FeatureItem({ icon, label, color }) {
    return (
        <div className="flex flex-col items-center p-1">
            <span style={{ color: color, fontSize: '2rem' }}>{icon}</span>
            <span className="text-xs font-medium text-[#1F1F1F] mt-1">{label}</span>
        </div>
    );
}