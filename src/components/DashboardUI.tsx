"use client";

import { useState, useEffect, useMemo } from 'react';
import { useFormStatus } from 'react-dom';

// Importa a tipagem do seu arquivo de tipos (assumindo que Galeria e ToastType foram movidos para lá)

// Tipagem básica para os componentes auxiliares
type ToastType = 'success' | 'error';
interface ToastProps { message: string; type: ToastType; onClose: () => void; }
interface EditModalProps {
    galeriaToEdit: Galeria;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (galeriaId: string, updatedData: any) => void;
}

// =========================================================================
// FUNÇÕES AUXILIARES (DE UI)
// =========================================================================

// Estilos Material Design
const inputClass = "mt-1 block w-full rounded-lg border-none bg-[#F0F4F9] p-3 text-[#1F1F1F] placeholder-gray-500 focus:ring-2 focus:ring-[#0B57D0] focus:bg-white transition-all outline-none";
const labelClass = "block text-xs font-medium text-[#444746] ml-1";

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
    const baseClasses = "fixed bottom-6 left-6 py-3 px-6 rounded-md shadow-lg text-white text-sm flex items-center justify-between z-50 min-w-[300px] animate-in slide-in-from-bottom-5 fade-in duration-300";
    const colorClasses = type === 'success' ? "bg-[#323232]" : "bg-[#B3261E]";
    
    useEffect(() => { const timer = setTimeout(() => { onClose(); }, 5000); return () => clearTimeout(timer); }, [message, onClose]);
    if (!message) return null;
    return (<div className={`${baseClasses} ${colorClasses}`}><span>{message}</span><button onClick={onClose} className="ml-4 text-[#A8C7FA] hover:text-white font-medium text-sm uppercase">Fechar</button></div>);
}

// =========================================================================
// 2. SubmitButton (Botão Pílula Azul Google)
// =========================================================================

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (<button type="submit" aria-disabled={pending} disabled={pending} className="w-full bg-[#0B57D0] text-white font-medium text-sm py-3 px-6 rounded-full hover:bg-[#09429E] hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none">{pending ? (<span className="flex items-center justify-center space-x-2"><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Criando...</span></span>) : (<><span className="text-xl leading-none font-light mb-0.5">+</span><span>Criar Galeria</span></>)}</button>);
}

// =========================================================================
// 3. ConfirmationModal
// =========================================================================

export function ConfirmationModal({ galeria, isOpen, onClose, onConfirm }: any) {
    if (!isOpen || !galeria) return null;
    return (<div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4 transition-opacity"><div className="bg-white p-6 rounded-[28px] shadow-xl max-w-sm w-full transform scale-100 transition-transform"><h3 className="text-xl text-[#1F1F1F] mb-3 px-2">Excluir galeria?</h3><p className="text-[#444746] text-sm mb-6 px-2 leading-relaxed">Você tem certeza que deseja deletar a galeria <strong className="font-medium text-black mx-1">"{galeria.title}"</strong>? Esta ação não pode ser desfeita.</p><div className="flex justify-end space-x-2"><button onClick={onClose} className="px-4 py-2 text-[#0B57D0] font-medium text-sm rounded-full hover:bg-[#F0F4F9] transition-colors">Cancelar</button><button onClick={() => onConfirm(galeria.id)} className="px-4 py-2 text-[#B3261E] font-medium text-sm rounded-full hover:bg-[#FFDAD6] transition-colors">Excluir</button></div></div></div>);
}

// =========================================================================
// 4. NOVO: EditGaleriaModal
// =========================================================================

export function EditGaleriaModal({ galeriaToEdit, isOpen, onClose, onUpdate }: EditModalProps) {
    
    // FUNÇÃO DE INICIALIZAÇÃO DE DATA CORRIGIDA
    const initializeDate = (dateIso: string | undefined): string => {
        if (!dateIso) return '';
        
        try {
            const dateObj = new Date(dateIso);
            if (isNaN(dateObj.getTime())) {
                return '';
            }
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        } catch (e) {
            return '';
        }
    };

    const initializeEditState = (galeria: Galeria) => ({
        clientName: galeria.clientName || '',
        // Armazena o valor RAW (não mascarado)
        clientWhatsapp: galeria.clientWhatsapp?.replace(/\D/g, '') || '', 
        title: galeria.title || '',
        location: galeria.location || '',
        driveFolderId: galeria.driveFolderId || '',
        isPublic: galeria.isPublic,
        password: galeria.password || '',
        date: initializeDate(galeria.date), 
    });


    const [editData, setEditData] = useState(initializeEditState(galeriaToEdit));

    // MÁSCARA: Dependente do dado RAW (não do valor inicial de prop)
    const [maskedWhatsapp, setMaskedWhatsapp] = useState(maskPhoneInternal(editData.clientWhatsapp));

    // Efeito para preencher o modal sempre que a galeria muda
    useEffect(() => {
        if (galeriaToEdit) {
            const initialState = initializeEditState(galeriaToEdit);
            setEditData(initialState);
            // Atualiza a máscara com o dado RAW
            setMaskedWhatsapp(maskPhoneInternal(initialState.clientWhatsapp));
        }
    }, [galeriaToEdit]);


    // GERA SENHA SUGERIDA
    const suggestedPassword = useMemo(() => {
        const digits = editData.clientWhatsapp.replace(/\D/g, '');
        if (digits.length >= 4) {
            return digits.slice(-4);
        }
        return '';
    }, [editData.clientWhatsapp]);


    if (!isOpen) return null;

    // Handler genérico para campos de texto
    const handleChange = (field: keyof typeof editData, value: string | boolean) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    // Handler para submissão do formulário de edição
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Lógica de validação de senha
        if (!editData.isPublic && (editData.password.length < 4 || editData.password.length > 8)) {
             alert("A senha privada deve ter entre 4 e 8 dígitos.");
             return; 
        }

        // Chama a função de atualização no componente pai
        onUpdate(galeriaToEdit.id, editData);
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4 transition-opacity">
            <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-lg w-full transform scale-100 transition-transform">
                <h3 className="text-xl text-[#1F1F1F] mb-4 border-b pb-2">Editar Galeria: {galeriaToEdit.title}</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Linha 1: Título */}
                    <div>
                        <label className={labelClass}>Título da galeria</label>
                        <input type="text" required value={editData.title} onChange={(e) => handleChange('title', e.target.value)} className={inputClass} />
                    </div>
                    
                    {/* Linha 2: Data e Local */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Data</label>
                            <input type="date" required value={editData.date} onChange={(e) => handleChange('date', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Local</label>
                            <input type="text" value={editData.location} onChange={(e) => handleChange('location', e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    
                    {/* Linha 3: Nome do Cliente */}
                    <div>
                        <label className={labelClass}>Nome do cliente</label>
                        <input type="text" required value={editData.clientName} onChange={(e) => handleChange('clientName', e.target.value)} className={inputClass} />
                    </div>

                    {/* Linha 4: WhatsApp */}
                    <div>
                        <label className={labelClass}>WhatsApp do cliente</label>
                        <input 
                            type="text" 
                            className={inputClass} 
                            placeholder="(31) 99999-9999"
                            value={maskedWhatsapp}
                            onChange={(e) => {
                                const val = maskPhoneInternal(e.target.value);
                                setMaskedWhatsapp(val);
                                // ARMAZENA O VALOR BRUTO (RAW) NO ESTADO
                                handleChange('clientWhatsapp', e.target.value.replace(/\D/g, '')); 
                            }}
                            maxLength={15}
                        />
                    </div>
                    
                    {/* Linha 5: ID do Drive (Não editável no Modal de forma simples) */}
                    <div>
                        <label className={labelClass}>ID da Pasta Drive (Não Editável)</label>
                        <input type="text" disabled value={editData.driveFolderId} className={`${inputClass} opacity-60`} />
                    </div>

                    {/* ==================== PRIVACIDADE E SENHA ==================== */}
                    <div className="pt-2 border-t border-[#E0E3E7] space-y-3">
                        <h3 className="text-sm font-medium text-[#1F1F1F] pt-2">Opções de Acesso</h3>
                        
                        {/* Radio Público */}
                        <label className="flex items-center space-x-2 text-sm text-[#444746]">
                            <input 
                                type="radio" 
                                name="editAccessType" 
                                checked={editData.isPublic === true} 
                                onChange={() => handleChange('isPublic', true)} // Passa true
                                className="form-radio h-4 w-4 text-[#0B57D0] border-gray-400"
                            />
                            <span>Galeria Pública</span>
                        </label>

                        {/* Radio Privado */}
                        <label className="flex items-center space-x-2 text-sm text-[#444746]">
                            <input 
                                type="radio" 
                                name="editAccessType" 
                                checked={editData.isPublic === false} 
                                onChange={() => handleChange('isPublic', false)} // Passa false
                                className="form-radio h-4 w-4 text-[#0B57D0] border-gray-400"
                            />
                            <span>Galeria Privada</span>
                        </label>

                        {/* Campo de Senha Condicional */}
                        {!editData.isPublic && (
                            <div className="relative mt-3 transition-opacity duration-300">
                                <label className={labelClass}>Senha de 4-8 dígitos</label>
                                <div className="flex space-x-2 items-center">
                                    <input 
                                        type="text" 
                                        required={!editData.isPublic}
                                        className={`${inputClass} flex-grow`} 
                                        placeholder="Digite a nova senha..."
                                        value={editData.password}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                            handleChange('password', val);
                                        }}
                                        minLength={4}
                                        maxLength={8}
                                    />
                                    {suggestedPassword && (
                                        <button
                                            type="button"
                                            onClick={() => handleChange('password', suggestedPassword)}
                                            className="px-3 py-1.5 whitespace-nowrap text-xs bg-[#E9EEF6] text-[#0B57D0] rounded-full hover:bg-[#D4E0F4] transition-colors"
                                        >
                                            Sugestão: {suggestedPassword}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-[#444746] rounded-full hover:bg-[#F0F4F9] transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-white bg-[#0B57D0] rounded-full hover:bg-[#09429E]">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    );
}