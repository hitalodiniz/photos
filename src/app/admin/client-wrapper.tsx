"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { maskPhone } from "@/utils/masks"; 
// AGORA IMPORTAMOS 'updateGaleria'
import { createGaleria, getGalerias, deleteGaleria, updateGaleria } from '@/actions/galeria'; 
import { Galeria } from '@prisma/client/edge';
import { ConfirmationModal, SubmitButton, Toast, EditGaleriaModal } from '@/components/AdminUI'; // Importa todos os componentes de UI

// Define quantos cards carregar por vez
const CARDS_PER_PAGE = 6; 

// =========================================================================
// FUNÇÕES AUXILIARES (DE DADOS)
// =========================================================================

function normalizeString(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function getColorSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

const coverColors = ["556B2F", "FF7F50", "4682B4", "9370DB", "20B2AA", "DC143C", "FFA07A", "40E0D0"];

// NOVO: Função para formatar o SLUG com data (AAAA/MM/DD/titulo-galeria)
function formatDatedSlug(dateString: string, title: string): string {
    const safeTitle = normalizeString(title).replace(/\s+/g, '-');
    
    // A data no estado é YYYY-MM-DD
    if (dateString && dateString.length >= 10) {
        const [year, month, day] = dateString.split('-');
        if (year && month && day) {
            return `${year}/${month}/${day}/${safeTitle}`;
        }
    }
    // Fallback se a data for inválida
    return `sem-data/${safeTitle}`;
}


// =========================================================================
// COMPONENTE CLIENTE PRINCIPAL
// =========================================================================

export default function ClientAdminWrapper({ initialGalerias: initialGalerias }: { initialGalerias: Galeria[] }) {
    // Referência ao formulário
    const formRef = useRef<HTMLFormElement>(null);
    // Referência para o elemento que marca o final da página (para o Intersection Observer)
    const loadMoreRef = useRef<HTMLDivElement>(null); 
    
    // ESTADOS
    const [galerias, setGalerias] = useState(initialGalerias); 
    const [loading, setLoading] = useState(false); 
    const [cardsToShow, setCardsToShow] = useState(Math.min(initialGalerias.length, CARDS_PER_PAGE)); 
    
    // Estados de Filtro
    const [filterName, setFilterName] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterDate, setFilterDate] = useState('');
    
    // Estados de Feedback
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success'); 
    const [galeriaToDelete, setGaleriaToDelete] = useState<any>(null); // Usado para Confirmação
    
    // ESTADOS DE EDIÇÃO
    const [galeriaToEdit, setGaleriaToEdit] = useState<any>(null); // Galeria selecionada para edição
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Novo estado do modal de edição
    
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // ESTADO DE CADASTRO
    const [isPublic, setIsPublic] = useState(true); 
    const [password, setPassword] = useState(''); 
    const [formData, setFormData] = useState({ clientWhatsapp: "" }); 

    // Lógica de Filtragem (useMemo)
    const filteredGalerias = useMemo(() => {
        if (!galerias) return [];
        
        const nameLower = normalizeString(filterName);
        const locationLower = normalizeString(filterLocation);
        const dateFilter = filterDate; 

        return galerias.filter(galeria => {
            const galeriaTitle = normalizeString(galeria.title);
            const clientName = normalizeString(galeria.clientName || '');
            const galeriaLocation = normalizeString(galeria.location || '');
            
            const matchesName = nameLower === '' || galeriaTitle.includes(nameLower) || clientName.includes(nameLower);
            const matchesLocation = locationLower === '' || galeriaLocation.includes(locationLower);
            const galeriaDate = galeria.date.substring(0, 10);
            const matchesDate = dateFilter === '' || galeriaDate === dateFilter;
            
            return matchesName && matchesLocation && matchesDate;
        });
    }, [galerias, filterName, filterLocation, filterDate]);

    // Lógica de Paginação: Filtra e então fatia apenas os cards visíveis
    const visibleGalerias = useMemo(() => {
        return filteredGalerias.slice(0, cardsToShow);
    }, [filteredGalerias, cardsToShow]);

    // Verifica se ainda há mais itens a carregar
    const hasMore = filteredGalerias.length > cardsToShow;

    // =========================================================================
    // INFINITE SCROLLING (PAGINAÇÃO E ESTABILIDADE)
    // =========================================================================
    const loadMore = () => {
        setCardsToShow(prev => prev + CARDS_PER_PAGE);
    };

    // EFEITO DO SCROLL
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const target = entries[0];
            
            if (target.isIntersecting && hasMore) { 
                setTimeout(loadMore, 200); 
            }
        }, {
            rootMargin: '200px', 
        });

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [filteredGalerias.length, cardsToShow, hasMore]); 
    // =========================================================================


    // Função para buscar os dados no servidor (chamada após alteração de dados)
    const fetchGalerias = async () => {
        setLoading(true);
        const data = await getGalerias();
        setGalerias(data as any[]); // Mantém o nome 'galerias'
        setLoading(false);
        setCardsToShow(Math.min(data.length, CARDS_PER_PAGE)); 
    };

    // Lógica para confirmar e executar a deleção
    const handleConfirmDelete = async (galeriaId: string) => {
        setIsDeleting(true);
        setIsConfirmModalOpen(false);
        
        const result = await deleteGaleria(galeriaId);

        if (result.success) {
            setToastMessage(result.message || "Deleção realizada com sucesso!");
            setToastType('success');
        } else {
            setToastMessage(result.error || "Erro desconhecido ao deletar.");
            setToastType('error');
        }
        
        await fetchGalerias(); 

        setIsDeleting(false);
        setGaleriaToDelete(null);
    };

    // Lógica para abrir o modal de delete
    const handleDeleteClick = (galeria: any, e: React.MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        setGaleriaToDelete(galeria);
        setIsConfirmModalOpen(true);
    };

    // Lógica para editar
    const handleEditClick = (galeria: any, e: React.MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation();
        setGaleriaToEdit(galeria); // Define a galeria a ser editada
        setIsEditModalOpen(true); // Abre o novo modal
    };

    // Lógica para atualizar a galeria (AGORA CHAMA A SERVER ACTION REAL E ATUALIZA O SLUG)
    const handleUpdateGaleria = async (galeriaId: string, updatedData: any) => {
        
        // --- 1. GERA O NOVO SLUG COM FORMATO DE DATA ---
        // A Server Action updateGaleria precisa desse campo atualizado
        updatedData.slug = formatDatedSlug(updatedData.date, updatedData.title);

        // --- 2. CHAMADA REAL À SERVER ACTION DE ATUALIZAÇÃO ---
        const result = await updateGaleria(galeriaId, updatedData); 
        // ----------------------------------------------------

        if (result.success) {
            setGaleriaToEdit(null);
            setIsEditModalOpen(false);
            setToastMessage(result.message || "Galeria atualizada com sucesso!");
            setToastType('success');
            // Recarrega a lista para mostrar as alterações
            fetchGalerias();
        } else {
            setToastMessage(result.error || "Erro ao atualizar galeria.");
            setToastType('error');
        }
    }
    
    // Handler para aplicar a máscara e sugerir senha
    const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const maskedValue = maskPhone(e);
        setFormData({ ...formData, clientWhatsapp: maskedValue });
    };

    // Handler para submeter a Server Action (com lógica de senha e Radio)
    const clientHandleCreateGaleria = async (formNativeData: FormData) => {
        
        // --- 1. Adiciona dados do estado ao FormData ---
        formNativeData.append('isPublic', isPublic.toString());
        
        if (!isPublic && password.length >= 4) {
            formNativeData.append('password', password);
        } else if (!isPublic && password.length < 4) {
             setToastMessage("A senha privada deve ter entre 4 e 8 dígitos.");
             setToastType('error');
             return; 
        }

        // --- 2. Chama a Server Action ---
        const result = await createGaleria(formNativeData);

        if (result.success) {
            setToastMessage(result.message || "Galeria criada com sucesso!");
            setToastType('success');
            
            // 3. Limpa o formulário e estados
            if (formRef.current) { formRef.current.reset(); }
            setFormData({ clientWhatsapp: "" });
            setPassword(''); // Limpa a senha
            setIsPublic(true); // Volta para público
            
            await fetchGalerias(); 
        } else {
            setToastMessage(result.error || "Erro ao criar a galeria.");
            setToastType('error');
        }
    }

    // Função para limpar filtros
    const resetFilters = () => {
        setFilterName('');
        setFilterLocation('');
        setFilterDate('');
        setCardsToShow(CARDS_PER_PAGE); 
    };

    // NOVA FUNÇÃO: Navegação para o card (substitui o Link)
    const handleCardClick = (slug: string) => {
        window.open(`/galeria/${slug}`, '_blank');
    };
    
    // Função para formatar a data
    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // GERA SENHA SUGERIDA
    const suggestedPassword = useMemo(() => {
        const digits = formData.clientWhatsapp.replace(/\D/g, '');
        if (digits.length >= 4) {
            return digits.slice(-4); // Sugere os 4 últimos dígitos
        }
        return '';
    }, [formData.clientWhatsapp]);


    // Estilos Material Design
    const inputClass = "mt-1 block w-full rounded-lg border-none bg-[#F0F4F9] p-3 text-[#1F1F1F] placeholder-gray-500 focus:ring-2 focus:ring-[#0B57D0] focus:bg-white transition-all outline-none";
    const labelClass = "block text-xs font-medium text-[#444746] ml-1";

    return (
        // Fundo estilo Google Drive Surface (#F8FAFD)
        <div className="min-h-screen bg-[#F8FAFD] p-4 lg:p-8 font-sans">
            
            {/* Header estilo Google Drive (Mantido para contexto do tema) */}
            <div className="max-w-[1600px] mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Ícone de Fotografia (Câmera) */}
                    <div className="w-10 h-10 flex items-center justify-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#00A651]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    </div>
                    <span className="text-2xl text-[#1F1F1F] font-medium">SUA GALERIA</span>
                </div>
                
                {/* Barra de Pesquisa Simulada (Filtro Global) */}
                <div className="hidden md:flex bg-[#E9EEF6] rounded-full px-4 py-3 w-1/3 items-center text-[#444746]">
                     <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                     <span className="text-sm">Pesquisar...</span>
                </div>
            </div>

            {toastMessage && <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />}
            
            <ConfirmationModal galeria={galeriaToDelete} isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} />

            {/* NOVO MODAL DE EDIÇÃO */}
            {galeriaToEdit && (
                <EditGaleriaModal 
                    galeriaToEdit={galeriaToEdit}
                    isOpen={isEditModalOpen}
                    onClose={() => { setGaleriaToEdit(null); setIsEditModalOpen(false); }}
                    onUpdate={handleUpdateGaleria}
                />
            )}

            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                
                {/* ==================== COLUNA ESQUERDA: CADASTRO ==================== */}
                <div className="order-2 lg:order-1">
                    <div className="bg-white p-6 rounded-[16px] shadow-sm border border-[#E0E3E7] h-fit sticky top-8">
                        <h2 className="text-lg text-[#1F1F1F] mb-4 px-1">Nova galeria</h2>
                        <form action={clientHandleCreateGaleria} className="space-y-4" ref={formRef}>
                            
                            {/* CAMPO: Nome do Cliente */}
                            <div>
                                <label className={labelClass}>Nome do cliente</label>
                                <div className="relative flex items-center">
                                    <input name="clientName" type="text" required className={`${inputClass}`} placeholder="Ex: Ana Silva" />
                                </div>
                            </div>

                            {/* CAMPO: WhatsApp do Cliente (COM MÁSCARA) */}
                            <div>
                                <label className={labelClass}>WhatsApp do cliente</label>
                                <div className="relative flex items-center">
                                    <input type="text" className={`${inputClass}`} placeholder="(31) 99999-9999"
                                        value={formData.clientWhatsapp}
                                        onChange={handleWhatsappChange}
                                        maxLength={15}
                                    />
                                </div>
                                <input type="hidden" name="clientWhatsapp" value={formData.clientWhatsapp} />
                            </div>

                            {/* TÍTULO DA SESSÃO */}
                            <div>
                                <label className={labelClass}>Título da galeria</label>
                                <div className="relative flex items-center">
                                    <input name="title" type="text" required className={`${inputClass}`} placeholder="Ex: Casamento Silva" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Data</label>
                                    <div className="relative flex items-center">
                                        <input name="date" type="date" required className={`${inputClass}`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Local</label>
                                    <div className="relative flex items-center">
                                        <input name="location" type="text" className={`${inputClass}`} placeholder="Cidade/Local" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* CAMPO ID DO GOOGLE DRIVE */}
                            <div>
                                <label className={labelClass}>ID da pasta do Google Drive</label>
                                <div className="relative flex items-center">
                                    <input name="driveFolderId" type="text" required className={`${inputClass}`} placeholder="ID da URL..." />
                                </div>
                            </div>
                            
                            {/* ==================== CAMPO DE PRIVACIDADE ==================== */}
                            <div className="pt-2 border-t border-[#E0E3E7] space-y-3">
                                <h3 className="text-sm font-medium text-[#1F1F1F] pt-2">Opções de Acesso</h3>
                                
                                {/* Radio Público */}
                                <label className="flex items-center space-x-2 text-sm text-[#444746]">
                                    <input 
                                        type="radio" 
                                        name="accessType" 
                                        checked={isPublic}
                                        onChange={() => setIsPublic(true)}
                                        className="form-radio h-4 w-4 text-[#0B57D0] border-gray-400"
                                    />
                                    <span>Galeria Pública (Link Aberto)</span>
                                </label>

                                {/* Radio Privado */}
                                <label className="flex items-center space-x-2 text-sm text-[#444746]">
                                    <input 
                                        type="radio" 
                                        name="accessType" 
                                        checked={!isPublic}
                                        onChange={() => setIsPublic(false)}
                                        className="form-radio h-4 w-4 text-[#0B57D0] border-gray-400"
                                    />
                                    <span>Galeria Privada (Requer Senha)</span>
                                </label>

                                {/* Campo de Senha Condicional */}
                                {!isPublic && (
                                    <div className="relative mt-3 transition-opacity duration-300">
                                        <label className={labelClass}>Senha de 4-8 dígitos</label>
                                        <div className="flex space-x-2 items-center">
                                            <input 
                                                type="text" 
                                                name="password"
                                                required={!isPublic}
                                                className={`${inputClass} flex-grow`} 
                                                placeholder="Digite a senha..."
                                                value={password}
                                                onChange={(e) => {
                                                    // Limita a 8 dígitos numéricos
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                    setPassword(val);
                                                }}
                                                minLength={4}
                                                maxLength={8}
                                            />
                                            {suggestedPassword && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPassword(suggestedPassword)}
                                                    className="px-3 py-1.5 whitespace-nowrap text-xs bg-[#E9EEF6] text-[#0B57D0] rounded-full hover:bg-[#D4E0F4] transition-colors"
                                                    title="Sugerir 4 últimos dígitos do WhatsApp"
                                                >
                                                    Sugestão: {suggestedPassword}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="pt-2">
                                <SubmitButton />
                            </div>
                        </form>
                    </div>
                </div>

                {/* ==================== COLUNA DIREITA: LISTA (MEU DRIVE) ==================== */}
                <div className="order-1 lg:order-2">
                    <div className="bg-white p-8 rounded-[16px] shadow-xl w-full">
                        <h2 className="text-2xl font-extrabold mb-6 text-gray-800 border-b pb-2">
                            Galerias Recentes ({filteredGalerias.length} de {galerias.length})
                        </h2>
                        
                        {/* Filtros */}
                        <div className="bg-white p-2 mb-4 flex flex-wrap gap-2 items-center">
                            <input type="text" placeholder="Nome/Cliente/Título..." value={filterName} onChange={(e) => setFilterName(e.target.value)} 
                                className="bg-[#F8FAFD] border border-[#747775] text-sm rounded-lg px-3 py-1.5 outline-none focus:bg-[#E8F0FE] focus:border-[#0B57D0] focus:text-[#0B57D0] placeholder-gray-500 transition-colors w-full sm:w-auto flex-1" />
                            <input type="text" placeholder="Local..." value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} 
                                className="bg-[#F8FAFD] border border-[#747775] text-sm rounded-lg px-3 py-1.5 outline-none focus:bg-[#E8F0FE] focus:focus:border-[#0B57D0] focus:text-[#0B57D0] placeholder-gray-500 transition-colors w-full sm:w-auto flex-1" />
                            <input type="date" placeholder="Data" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} 
                                className="bg-[#F8FAFD] border border-[#747775] text-sm rounded-lg px-3 py-1.5 outline-none focus:bg-[#E8F0FE] focus:border-[#0B57D0] focus:text-[#0B57D0] placeholder-gray-500 transition-colors w-full sm:w-auto" />
                            <button onClick={resetFilters} className="px-4 py-1.5 bg-[#E9EEF6] text-[#444746] text-sm rounded-full hover:bg-[#E2E7EB] transition-colors font-medium ml-auto" title="Limpar todos os filtros de busca">Limpar</button>
                        </div>
                        
                        {/* Grid de Cards */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B57D0]"></div>
                                <p className="text-[#444746] mt-4 text-sm">Carregando suas galerias...</p>
                            </div>
                        )}
                        {filteredGalerias.length === 0 && !loading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[16px] border border-[#E0E3E7]">
                                 <svg className="w-24 h-24 text-[#B3261E] opacity-20 mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                                <p className="text-[#1F1F1F] font-medium">Nenhuma galeria cadastrada</p>
                            </div>
                        ) : (
                            // LISTA DE CARDS VISÍVEIS
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {visibleGalerias.map((galeria) => {
                                        
                                        const seed = getColorSeed(galeria.id);
                                        const color = coverColors[Math.abs(seed) % coverColors.length];
                                        const titleText = encodeURIComponent(galeria.title.split(' ')[0]);
                                        
                                        const placeholderUrl = `https://placehold.co/600x400/${color}/FFFFFF/png?text=${titleText}&font=roboto`;
                                        
                                        const imageUrl = galeria.coverImageUrl || placeholderUrl;
                                        
                                        // Variáveis de Status de Acesso
                                        const isGaleriaPrivate = !galeria.isPublic; 
                                        const accessStatus = isGaleriaPrivate ? 'Privada' : 'Pública';
                                        const accessColor = isGaleriaPrivate ? '#B3261E' : '#00A651';
                                        
                                        return (
                                        // Substituímos <Link> por <div onClick>
                                        <div 
                                            key={galeria.id} 
                                            onClick={() => handleCardClick(galeria.slug)}
                                            className="group block bg-white rounded-[12px] hover:shadow-lg transition-all duration-200 border border-[#E0E3E7] hover:border-[#0B57D0] relative cursor-pointer"
                                            role="link" // Adicionado para acessibilidade (indica que é um link)
                                            tabIndex={0} // Permite que seja focado com o teclado
                                        >
                                            {/* ENVOLVE O CONTEÚDO DO CARD EM UM DIV ADICIONAL PARA ESTABILIDADE DO DOM */}
                                            <div className="h-full flex flex-col justify-between">
                                                {/* Topo: Preview */}
                                                <div>
                                                    <div className="aspect-[16/10] bg-[#F0F4F9] flex items-center justify-center relative overflow-hidden rounded-t-[12px]">
                                                        <img 
                                                            src={imageUrl} 
                                                            alt={`Capa da galeria: ${galeria.title}`} 
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                                        />
                                                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                                                            {formatDate(galeria.date)}
                                                        </div>
                                                    </div>

                                                    <div className="p-3">
                                                        {/* Título e Status */}
                                                        <div className="overflow-hidden mb-2">
                                                            <h3 className="text-[#1F1F1F] font-medium text-sm truncate group-hover:text-[#0B57D0] transition-colors" title={galeria.title}>
                                                                {galeria.title}
                                                            </h3>
                                                            
                                                            {/* Status de Acesso */}
                                                            <div className="flex items-center space-x-1 mt-1 text-xs font-medium" style={{ color: accessColor }}>
                                                                {isGaleriaPrivate ? (
                                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1C8.13 1 5 4.13 5 8v3H4c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2h-1V8c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v3H7V8c0-2.76 2.24-5 5-5zm-1 9h2v5h-2v-5z"/></svg>
                                                            ) : (
                                                                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zM7 12c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z"/></svg>
                                                            )}
                                                                <span style={{color: accessColor}}>{accessStatus}</span>
                                                                {galeria.password && (
                                                                    <span className="text-xs text-[#444746] ml-2"> | Senha: <span className="font-semibold text-sm">{galeria.password}</span></span>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Cliente e Localização */}
                                                            <div className="flex items-center gap-1 mt-1 text-[#444746]">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                                                <p className="text-xs truncate max-w-[150px] font-medium">{galeria.clientName || 'Cliente não informado'}</p>
                                                            </div>
                                                            {galeria.clientWhatsapp && (
                                                                <div className="flex items-center gap-1 mt-0.5 text-[#444746]">
                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h1.5v-4.5H10V17zm4.5 0H16v-4.5h-1.5V17z"/></svg>
                                                                    <a href={`https://wa.me/${galeria.clientWhatsapp.replace(/\D/g,'')}`} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="text-xs text-[#25D366] hover:underline">{galeria.clientWhatsapp}</a>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-1 mt-1 text-[#444746]">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                                                <p className="text-xs truncate max-w-[150px]">{galeria.location || 'Sem local'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* RODAPÉ: BOTÕES DE AÇÃO */}
                                                    <div className="flex space-x-2 mt-4 pt-2 border-t border-[#E0E3E7] w-full p-3 bg-white justify-end">
                                                            
                                                        {/* NOVO BOTÃO: Editar */}
                                                        <button 
                                                            onClick={(e) => handleEditClick(galeria, e)}
                                                            className="flex items-center justify-center p-2 rounded-full text-[#444746] hover:bg-[#E9EEF6] hover:text-[#0B57D0] transition-colors" 
                                                            title="Editar Galeria"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                            
                                                        {/* Botão Deletar (Lixeira) */}
                                                        <button 
                                                            onClick={(e) => handleDeleteClick(galeria, e)}
                                                            disabled={isDeleting}
                                                            className="flex items-center justify-center p-2 rounded-full text-[#444746] hover:bg-[#FFDAD6] hover:text-[#B3261E] transition-colors" 
                                                            title="Mover para lixeira"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );})}
                                </div>
                                
                                {/* ELEMENTO MONITORADO PELO SCROLLING */}
                                {hasMore && (
                                    <div ref={loadMoreRef} className="flex justify-center py-8">
                                        <div className="flex items-center gap-3 text-[#444746]">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0B57D0]"></div>
                                            <span>Carregando mais galerias...</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}