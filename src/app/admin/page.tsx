"use client"; // Obrigatório para usar useFormStatus

import { useFormStatus } from 'react-dom'; 
import { useState, useEffect, useMemo, useRef } from 'react'; 
import { redirect } from 'next/navigation';
// Importa as Server Actions
import { createSession, getSessions, deleteSession } from '@/actions/session'; 
import Link from 'next/link';
import { maskPhone } from "@/utils/masks"; 
import Image from 'next/image'; // Adicionando import do Next Image

// Define o tipo para os dados da sessão (para tipagem no lado do cliente)
interface Session {
    id: string;
    title: string;
    slug: string;
    date: string; // Vem como string serializada (ISO string)
    location: string | null;
    driveFolderId: string;
    clientName: string;
    clientWhatsapp: string | null;
    createdAt: string;
    updatedAt: string;
    coverImageUrl?: string | null; // NOVO CAMPO: URL da capa (opcional)
}

// =========================================================================
// FUNÇÃO AUXILIAR: Normaliza string (remove acentos e caracteres especiais)
// =========================================================================
function normalizeString(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// =========================================================================
// FUNÇÃO AUXILIAR: Gera um "seed" de cor (AGORA USADA APENAS PARA FALLBACK)
// =========================================================================
function getColorSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}


// =========================================================================
// 1. Componente Toast (Snackbar estilo Google)
// [código do Toast não alterado]
// =========================================================================

type ToastType = 'success' | 'error';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
    // Estilo Snackbar do Google: Fundo escuro, texto branco, bordas arredondadas, sem sombra pesada
    const baseClasses = "fixed bottom-6 left-6 py-3 px-6 rounded-md shadow-lg text-white text-sm flex items-center justify-between z-50 min-w-[300px] animate-in slide-in-from-bottom-5 fade-in duration-300";
    const colorClasses = type === 'success' ? "bg-[#323232]" : "bg-[#B3261E]"; // Cinza escuro ou Vermelho Material
    
    useEffect(() => {
        const timer = setTimeout(() => { onClose(); }, 5000);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    return (
        <div className={`${baseClasses} ${colorClasses}`}>
            <span className="font-medium">{message}</span>
            <button onClick={onClose} className="ml-4 text-[#A8C7FA] hover:text-white font-medium text-sm uppercase">
                Fechar
            </button>
        </div>
    );
}

// =========================================================================
// 2. Componente SubmitButton (Botão Pílula Azul Google)
// [código do SubmitButton não alterado]
// =========================================================================

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      aria-disabled={pending}
      disabled={pending} // Desabilita o botão enquanto o formulário está enviando
      // Estilo: Pílula (rounded-full), Azul Google (#0B57D0), Sombra suave
      className="w-full bg-[#0B57D0] text-white font-medium text-sm py-3 px-6 rounded-full 
                 hover:bg-[#09429E] hover:shadow-md transition-all duration-200
                 flex items-center justify-center gap-2
                 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
    >
      {pending ? (
        <span className="flex items-center justify-center space-x-2">
          {/* SVG Spinner Material */}
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Criando...</span>
        </span>
      ) : (
        <>
          {/* Ícone de + simples */}
          <span className="text-xl leading-none font-light mb-0.5">+</span>
          <span>Criar Galeria</span>
        </>
      )}
    </button>
  );
}

// =========================================================================
// 3. Componente Modal de Confirmação (Estilo Google Dialog)
// [código do ConfirmationModal não alterado]
// =========================================================================

function ConfirmationModal({ session, isOpen, onClose, onConfirm }: { 
    session: Session | null; 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: (id: string) => void;
}) {
    if (!isOpen || !session) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4 transition-opacity">
            {/* Modal com arredondamento alto (rounded-[28px]) */}
            <div className="bg-white p-6 rounded-[28px] shadow-xl max-w-sm w-full transform scale-100 transition-transform">
                <h3 className="text-xl text-[#1F1F1F] mb-3 px-2">Excluir galeria?</h3>
                
                {/* Texto: usa cores neutras do Material Design */}
                <p className="text-[#444746] text-sm mb-6 px-2 leading-relaxed">
                    Você tem certeza que deseja deletar a galeria 
                    <strong className="font-medium text-black mx-1">"{session.title}"</strong>
                    ? Esta ação não pode ser desfeita.
                </p>
                
                <div className="flex justify-end space-x-2">
                    {/* Botão Cancelar: Estilo Texto (sem fundo) Material Design */}
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-[#0B57D0] font-medium text-sm rounded-full hover:bg-[#F0F4F9] transition-colors"
                    >
                        Cancelar
                    </button>
                    {/* Botão Deletar: Estilo Texto (Cores de erro) Material Design */}
                    <button 
                        onClick={() => onConfirm(session.id)}
                        className="px-4 py-2 text-[#B3261E] font-medium text-sm rounded-full hover:bg-[#FFDAD6] transition-colors"
                    >
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 4. Componente AdminPage (Layout e Lógica)
// =========================================================================

export default function AdminPage() {
    // Referência ao formulário para poder resetá-lo
    const formRef = useRef<HTMLFormElement>(null);
    
    // Estados para a lista de sessões e carregamento
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para os filtros
    const [filterName, setFilterName] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterDate, setFilterDate] = useState('');
    
    // Estados para o TOAST (mensagem flutuante)
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<ToastType>('success'); 

    // Estados para a deleção
    const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Estado local para os dados do formulário (apenas para campos com máscara/formatação)
    const [formData, setFormData] = useState({
      clientWhatsapp: ""
    });

    // Paleta de cores para o placeholder (Hex codes)
    const coverColors = ["556B2F", "FF7F50", "4682B4", "9370DB", "20B2AA", "DC143C", "FFA07A", "40E0D0"];


    // Função para buscar os dados no servidor
    const fetchSessions = async () => {
        setLoading(true);
        const data = await getSessions();
        setSessions(data as Session[]);
        setLoading(false);
    };

    // Efeito para buscar as sessões ao carregar o componente
    useEffect(() => {
        fetchSessions();
    }, []);

    // Função que chama o Server Action, gerencia o sucesso e limpa o formulário
    const clientHandleCreateSession = async (formData: FormData) => {
        
        // Chamada à Server Action real
        const result = await createSession(formData);

        if (result.success) {
            // 1. Exibir Toast de sucesso
            setToastMessage(result.message || "Galeria criada com sucesso!");
            setToastType('success');
            
            // 2. Resetar campos do formulário
            if (formRef.current) {
                formRef.current.reset(); // Limpa todos os inputs nativos
            }
            // 3. Limpar o estado do WhatsApp (já que ele é controlado)
            setFormData({ clientWhatsapp: "" });
            
            // 4. Recarregar a lista de sessões para exibir a nova
            await fetchSessions(); 
            
            // Opcional: Redirecionar para a galeria recém-criada
            // router.push(`/galeria/${result.slug}`); // Se você tivesse o useRouter

        } else {
            // Exibir Toast de erro
            setToastMessage(result.error || "Erro ao criar a galeria.");
            setToastType('error');
        }
    }

    // NOVA FUNÇÃO: Limpar todos os filtros e estados
    const resetFilters = () => {
        setFilterName('');
        setFilterLocation('');
        setFilterDate('');
    };

    // Função de filtragem otimizada (COM NORMALIZAÇÃO DE STRING)
    const filteredSessions = useMemo(() => {
        if (!sessions) return [];
        
        // Normaliza os filtros antes de usar
        const nameLower = normalizeString(filterName);
        const locationLower = normalizeString(filterLocation);
        const dateFilter = filterDate; // Data não precisa de normalização

        return sessions.filter(session => {
            // NORMALIZA OS DADOS DA SESSÃO PARA COMPARAÇÃO
            const sessionTitle = normalizeString(session.title);
            const clientName = normalizeString(session.clientName || '');
            const sessionLocation = normalizeString(session.location || '');
            
            // Lógica de busca: O nome/título/cliente bate com o filtro de nome?
            const matchesName = nameLower === '' || 
                                sessionTitle.includes(nameLower) ||
                                clientName.includes(nameLower);

            // Localização bate?
            const matchesLocation = locationLower === '' || sessionLocation.includes(locationLower);
            
            // Data bate?
            const sessionDate = session.date.substring(0, 10);
            const matchesDate = dateFilter === '' || sessionDate === dateFilter;
            
            return matchesName && matchesLocation && matchesDate;
        });
    }, [sessions, filterName, filterLocation, filterDate]);

    // Função para formatar a data
    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'short', // Alterado para short para caber melhor no card (Jan, Fev, Mar)
            day: 'numeric',
        });
    };

    // Lógica para abrir o modal de confirmação
    const handleDeleteClick = (session: Session, e: React.MouseEvent) => {
        e.preventDefault(); 
        setSessionToDelete(session);
        setIsConfirmModalOpen(true);
    };

    // Lógica para confirmar e executar a deleção
    const handleConfirmDelete = async (sessionId: string) => {
        setIsDeleting(true);
        setIsConfirmModalOpen(false);
        
        const result = await deleteSession(sessionId);

        if (result.success) {
            setToastMessage(result.message || "Deleção realizada com sucesso!");
            setToastType('success');
        } else {
            setToastMessage(result.error || "Erro desconhecido ao deletar.");
            setToastType('error');
        }
        
        await fetchSessions(); 

        setIsDeleting(false);
        setSessionToDelete(null);
    };
    
    // Handler para aplicar a máscara e atualizar o estado
    const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const maskedValue = maskPhone(e);
        setFormData({ ...formData, clientWhatsapp: maskedValue });
    };

    // Estilos comuns para Inputs (Estilo Material Design Filled/Tonal)
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
                    <span className="text-2xl text-[#444746] font-normal">Portfólio <span className="text-[#1F1F1F] font-medium">Fotos</span></span>
                </div>
                
                {/* Barra de Pesquisa Simulada (Filtro Global) */}
                <div className="hidden md:flex bg-[#E9EEF6] rounded-full px-4 py-3 w-1/3 items-center text-[#444746]">
                     <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                     <span className="text-sm">Pesquisar...</span>
                </div>
            </div>

            {toastMessage && <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />}
            
            <ConfirmationModal session={sessionToDelete} isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} />

            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                
                {/* ==================== COLUNA ESQUERDA: CADASTRO ==================== */}
                <div className="order-2 lg:order-1">
                    {/* Botão Novo flutuante no Mobile ou Topo no Desktop */}
                    <div className="bg-white p-6 rounded-[16px] shadow-sm border border-[#E0E3E7] h-fit sticky top-8">
                        <h2 className="text-lg text-[#1F1F1F] mb-4 px-1">Novo registro</h2>
                        {/* AÇÃO CORRIGIDA: Usa a função client-side para Toast/Limpeza */}
                        <form action={clientHandleCreateSession} className="space-y-4" ref={formRef}>
                            
                            {/* CAMPO: Nome do Cliente */}
                            <div>
                                <label className={labelClass}>Nome do cliente</label>
                                <input name="clientName" type="text" required className={inputClass} placeholder="Ex: Ana Silva" />
                            </div>

                            {/* CAMPO: WhatsApp do Cliente (COM MÁSCARA) */}
                            <div>
                                <label className={labelClass}>WhatsApp do cliente</label>
                                <input type="text" className={inputClass} placeholder="(31) 99999-9999"
                                    value={formData.clientWhatsapp}
                                    onChange={handleWhatsappChange} // Usa o novo handler
                                    maxLength={15} // Define o tamanho máximo para a máscara (XX) XXXXX-XXXX
                                />
                                {/* CAMPO OCULTO (HIDDEN) PARA ENVIAR O VALOR DO WHATSAPP NA SUBMISSÃO */}
                                <input type="hidden" name="clientWhatsapp" value={formData.clientWhatsapp} />
                            </div>

                            {/* TÍTULO DA SESSÃO */}
                            <div>
                                <label className={labelClass}>Título da galeria</label>
                                <input name="title" type="text" required className={inputClass} placeholder="Ex: Casamento Silva" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Data</label>
                                    <input name="date" type="date" required className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Local</label>
                                    <input name="location" type="text" className={inputClass} placeholder="Cidade/Local" />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>ID da pasta do Google Drive</label>
                                <input name="driveFolderId" type="text" required className={inputClass} placeholder="ID da URL..." />
                            </div>

                            <div className="pt-2">
                                <SubmitButton />
                            </div>
                        </form>
                    </div>
                </div>

                {/* ==================== COLUNA DIREITA: LISTA (MEU DRIVE) ==================== */}
                <div className="order-1 lg:order-2">
                    {/* Barra de Ferramentas / Filtros */}
                    <div className="bg-white rounded-[16px] p-2 mb-4 shadow-sm border border-[#E0E3E7] flex flex-wrap gap-2 items-center">
                        <div className="px-4 py-2 text-sm font-medium text-[#444746]">Filtros</div>
                        <div className="h-6 w-px bg-[#E0E3E7] mx-2 hidden sm:block"></div>
                        
                        {/* Filtros Estilo "Chips" do Google */}
                        <input type="text" placeholder="Nome/Cliente/Título..." value={filterName} onChange={(e) => setFilterName(e.target.value)} 
                            className="bg-[#F8FAFD] border border-[#747775] text-sm rounded-lg px-3 py-1.5 outline-none focus:bg-[#E8F0FE] focus:border-[#0B57D0] focus:text-[#0B57D0] placeholder-gray-500 transition-colors w-full sm:w-auto flex-1" />
                        
                        <input type="text" placeholder="Local..." value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} 
                            className="bg-[#F8FAFD] border border-[#747775] text-sm rounded-lg px-3 py-1.5 outline-none focus:bg-[#E8F0FE] focus:focus:border-[#0B57D0] focus:text-[#0B57D0] placeholder-gray-500 transition-colors w-full sm:w-auto flex-1" />
                        
                        {/* CAMPO DE FILTRO POR DATA */}
                         <input type="date" placeholder="Data" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} 
                            className="bg-[#F8FAFD] border border-[#747775] text-sm rounded-lg px-3 py-1.5 outline-none focus:bg-[#E8F0FE] focus:border-[#0B57D0] focus:text-[#0B57D0] placeholder-gray-500 transition-colors w-full sm:w-auto" />
                        
                        {/* NOVO BOTÃO: Limpar Filtros */}
                        <button
                            onClick={resetFilters}
                            className="px-4 py-1.5 bg-[#E9EEF6] text-[#444746] text-sm rounded-full hover:bg-[#E2E7EB] transition-colors font-medium ml-auto"
                            title="Limpar todos os filtros de busca"
                        >
                            Limpar
                        </button>
                    </div>
                    
                    {/* Grid de Cards */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B57D0]"></div>
                            <p className="text-[#444746] mt-4 text-sm">Carregando seus arquivos...</p>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[16px] border border-[#E0E3E7]">
                             <svg className="w-24 h-24 text-[#B3261E] opacity-20 mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                            <p className="text-[#1F1F1F] font-medium">Nenhuma galeria cadastrada</p>
                            <p className="text-[#444746] text-sm">Use o formulário ao lado para adicionar novo conteúdo.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredSessions.map((session) => {
                                
                                // Lógica de Cores para Capa Aleatória
                                const seed = getColorSeed(session.id);
                                const color = coverColors[Math.abs(seed) % coverColors.length];
                                // Pega apenas a primeira palavra do título para exibir na capa
                                const titleText = encodeURIComponent(session.title.split(' ')[0]);
                                
                                // URL da Imagem de Capa (Placeholder colorido)
                                const placeholderUrl = `https://placehold.co/600x400/${color}/FFFFFF/png?text=${titleText}&font=roboto`;
                                
                                // Define a URL final da imagem: usa a URL real do Drive se existir, senão o placeholder
                                const imageUrl = session.coverImageUrl || placeholderUrl;
                                
                                return (
                                <Link 
                                    key={session.id} 
                                    href={`/galeria/${session.slug}`}
                                    target="_blank"
                                    // Card estilo Material (arredondamento 12px, fundo claro, sombra leve)
                                    className="group block bg-white rounded-[12px] hover:shadow-lg transition-all duration-200 border border-[#E0E3E7] hover:border-[#0B57D0] relative"
                                >
                                    {/* Topo do Card: Preview (IMAGEM DE CAPA) */}
                                    <div className="aspect-[16/10] bg-[#F0F4F9] flex items-center justify-center relative overflow-hidden rounded-t-[12px]">
                                        
                                        {/* Imagem de Capa (REAL DO DRIVE OU FALLBACK) */}
                                        {/* Usamos <img> simples, pois Next Image requer configuração especial para URLs dinâmicas do Drive */}
                                        <img 
                                            src={imageUrl} 
                                            alt={`Capa da galeria: ${session.title}`} 
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                            // Fallback caso a imagem do Drive ou placeholder falhe
                                            onError={(e) => {
                                                e.currentTarget.onerror = null; 
                                                e.currentTarget.src="https://placehold.co/600x400/CCCCCC/666666/png?text=Erro"; 
                                            }}
                                        />
                                        
                                        {/* Badge de Data */}
                                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                                            {formatDate(session.date)}
                                        </div>
                                    </div>

                                    {/* Corpo do Card: Info */}
                                    <div className="p-3">
                                        <div className="flex items-start justify-between">
                                            <div className="overflow-hidden">
                                                <h3 className="text-[#1F1F1F] font-medium text-sm truncate group-hover:text-[#0B57D0] transition-colors" title={session.title}>
                                                    {session.title}
                                                </h3>

                                                <div className="flex items-center gap-1 mt-1 text-[#444746]">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                                    <p className="text-xs truncate max-w-[150px] font-medium">{session.clientName || 'Cliente não informado'}</p>
                                                </div>
                                                {session.clientWhatsapp && (
                                                    <div className="flex items-center gap-1 mt-0.5 text-[#444746]">
                                                        <svg className="w-3 h-3 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h1.5v-4.5H10V17zm4.5 0H16v-4.5h-1.5V17z"/></svg>
                                                        <a href={`https://wa.me/${session.clientWhatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#25D366] hover:underline">{session.clientWhatsapp}</a>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1 mt-1 text-[#444746]">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                                    <p className="text-xs truncate max-w-[150px]">{session.location || 'Sem local'}</p>
                                                </div>
                                            </div>

                                            {/* Botão Deletar (Lixeira) */}
                                            <button 
                                                onClick={(e) => handleDeleteClick(session, e)}
                                                disabled={isDeleting}
                                                // Estilo do botão: Lixeira sutil
                                                className="p-1.5 rounded-full text-[#444746] hover:bg-[#FFDAD6] hover:text-[#B3261E] transition-colors" 
                                                title="Mover para lixeira"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            );})}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}