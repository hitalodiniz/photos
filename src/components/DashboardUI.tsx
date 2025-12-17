"use client";

import { useState, useEffect, useMemo } from 'react';
import { useFormStatus } from 'react-dom';

// Importe a tipagem Galeria do seu arquivo de tipos (assumindo que ClientAdminWrapper/types.ts)
// Nota: Você deve garantir que esta interface Galeria reflete as chaves do banco de dados (snake_case).
interface Galeria {
  id: string;
  user_id: string;
  studio_id: string;
  title: string;
  slug: string;
  date: string;
  location: string | null;
  client_name: string;      // <- Usando snake_case para leitura
  client_whatsapp: string | null; // <- Usando snake_case para leitura
  drive_folder_id: string; // <- Usando snake_case para leitura
  is_public: boolean;
  password: string | null;
  cover_image_url: string | null;
}

// Tipagem básica para os componentes auxiliares
type ToastType = 'success' | 'error';
interface ToastProps { message: string; type: ToastType; onClose: () => void; }
interface ConfirmationModalProps { 
    galeria: Galeria | null; 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: (id: string) => void; 
    isDeleting: boolean; 
}
interface EditModalProps {
    galeriaToEdit: Galeria | null; // Tipagem corrigida para aceitar null
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (galeriaId: string, updatedData: any) => void;
}

// =========================================================================
// FUNÇÕES AUXILIARES (DE UI)
// =========================================================================

const inputClass = "mt-1 block w-full rounded-lg border-none bg-[#F0F4F9] p-2 text-[#1F1F1F] placeholder-gray-500 focus:ring-2 focus:ring-[#0B57D0] focus:bg-white transition-all outline-none";
const labelClass = "block text-sm font-medium text-[#444746] ml-1";

// Função para aplicar a máscara (reimplementada aqui para evitar circular dependency no hook)
const maskPhoneInternal = (value: string): string => {
    value = value.replace(/\D/g, "");
    value = value.replace(/^(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    return value;
};


// =========================================================================
// 1. Toast (Snackbar estilo Google)
// =========================================================================

export function Toast({ message, type, onClose }: ToastProps) {
  // Aumentamos min-w para 600px, py para 5, px para 8 e text para lg
  const baseClasses = `
    fixed bottom-10 left-1/2 -translate-x-1/2 
    py-5 px-8 rounded-xl shadow-2xl 
    text-white text-lg font-medium
    flex items-center justify-between 
    z-[9999] min-w-[600px] max-w-[90vw]
    pointer-events-auto 
    animate-in slide-in-from-bottom-10 fade-in duration-500
  `;
  
  const colorClasses = type === 'success' ? "bg-[#323232]" : "bg-[#B3261E]";
  
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => { onClose(); }, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`${baseClasses} ${colorClasses}`}>
      <div className="flex items-center gap-4">
        {/* Ícone opcional para preencher mais espaço e dar feedback visual */}
        {type === 'success' ? (
          <div className="h-3 w-3 rounded-full bg-green-500" />
        ) : (
          <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
        )}
        <span>{message}</span>
      </div>
      
      <button 
        onClick={(e) => {
          e.preventDefault();
          onClose();
        }} 
        className="ml-8 text-[#A8C7FA] hover:text-white font-bold text-sm uppercase tracking-widest transition-colors"
      >
        Fechar
      </button>
    </div>
  );
}
// =========================================================================
// 2. SubmitButton (Botão Pílula Azul Google)
// =========================================================================

// Usamos esta versão no formulário de CRIAÇÃO (no CreateGaleriaForm)
export function SubmitButton() {
    const { pending } = useFormStatus();
    return (<button type="submit" aria-disabled={pending} disabled={pending} className="w-full bg-[#0B57D0] text-white font-medium text-sm py-3 px-6 rounded-full hover:bg-[#09429E] hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none">{pending ? (<span className="flex items-center justify-center space-x-2"><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Criando...</span></span>) : (<><span className="text-xl leading-none font-light mb-0.5">+</span><span>Criar Galeria</span></>)}</button>);
}

// =========================================================================
// 3. ConfirmationModal
// =========================================================================

export function ConfirmationModal({ galeria, isOpen, onClose, onConfirm, isDeleting }: ConfirmationModalProps) {
    if (!isOpen || !galeria) return null;
    
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-[28px] shadow-xl max-w-sm w-full">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir galeria?</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Tem certeza que deseja excluir <strong>{galeria.title}</strong>? Esta ação não pode ser desfeita.
                </p>
                
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => onConfirm(galeria.id)} 
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-full disabled:opacity-50"
                    >
                        {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                    </button>
                </div>
            </div>
        </div>
    );
}