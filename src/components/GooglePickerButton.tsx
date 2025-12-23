"use client";

import { useEffect, useState } from 'react';
// Importa a instância exportada do cliente Supabase para o cliente
import { supabase } from '@/lib/supabase.client';
// Importa as Server Actions para o lado do servidor
import { getParentFolderIdServer, getDriveFolderName } from '@/actions/google';

// Tipagem para as propriedades do componente
interface GooglePickerProps {
    // Agora envia: folderId, folderName, coverFileId
    onFolderSelect: (folderId: string, folderName: string, coverFileId: string) => void;
    currentDriveId: string | null;
    onError: (message: string) => void;
}

// Declarações globais (mantidas)
declare global {
    interface Window {
        gapi: any;
        google: any;
        onGoogleLibraryLoad: (() => void) | undefined; // Definido como opcional
    }
}

// Variáveis estáticas para controle de carregamento (limpas)
let isPickerLoaded = false;

// Função de carregamento do GAPI e Picker (simplificada, focada em reatividade)
const loadGoogleLibraries = (callback: () => void) => {
    if (isPickerLoaded) {
        callback();
        return;
    }

    if (window.gapi) {
        window.gapi.load('picker', () => {
            isPickerLoaded = true;
            callback();
        });
    } else {
        // Assume que o script está carregando e espera o evento global
        window.onGoogleLibraryLoad = () => {
            if (window.gapi) {
                window.gapi.load('picker', () => {
                    isPickerLoaded = true;
                    callback();
                });
            }
        };
    }
};

// ====================================================================
// COMPONENTE PRINCIPAL
// ====================================================================

// Funções obsoletas (getParentFolderIdClient e getGoogleAccessToken) foram removidas daqui.

export default function GooglePickerButton({ onFolderSelect, currentDriveId, onError }: GooglePickerProps) {
    const [loading, setLoading] = useState(false);
    // Estado que reflete a capacidade real de ABRIR o Picker
    const [isReadyToOpen, setIsReadyToOpen] = useState(isPickerLoaded);

    // --- 1. Monitorar o Evento de Carregamento Global ---
    useEffect(() => {
        if (isReadyToOpen) return;

        loadGoogleLibraries(() => {
            setIsReadyToOpen(true);
        });

        return () => {
            // Limpeza do listener global para evitar vazamento de memória.
            window.onGoogleLibraryLoad = undefined;
        };

    }, [isReadyToOpen]);


    // Obtém o Access Token e User ID necessários (Client-Side)
    const getAuthDetails = async () => {
        // Força o Supabase a verificar/atualizar a sessão atual
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.provider_token) {
            // Se o token não existir, o usuário precisa fazer login novamente 
            // com o Google para gerar um novo provider_token
            return { accessToken: null, userId: null };
        }

        return {
            accessToken: session.provider_token,
            userId: session.user.id
        };
    };


    // Função principal que abre o modal do Picker
    const openPicker = async () => {
        if (!isReadyToOpen) {
            // Usa o novo prop onError
            onError('As bibliotecas do Google Drive não foram carregadas completamente.');
            return;
        }

        setLoading(true);
        const { accessToken, userId } = await getAuthDetails();

        if (!accessToken || !userId) {
            // Usa o novo prop onError
            onError('Erro: Usuário não autenticado ou token de acesso Google expirado. Por favor, refaça o login.');
            setLoading(false);
            return;
        }

        try {
            // --- 1. CONFIGURAÇÃO DA VIEW ---
            const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
                .setMimeTypes('application/vnd.google-apps.folder,image/jpeg,image/png,image/tiff')
                .setMode(window.google.picker.DocsViewMode.GRID)
                .setSelectFolderEnabled(false); // O Picker seleciona um ARQUIVO, e o servidor busca a PASTA PAI.

            // --- 2. CONSTRUÇÃO DO PICKER ---
            const picker = new window.google.picker.PickerBuilder()
                .setAppId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!)
                .setOAuthToken(accessToken)
                .addView(view)
                .enableFeature(window.google.picker.Feature.NAVIGATE_TO_DRIVE)
                .setLocale('pt-BR')
                .setCallback(async (data: any) => {
                    setLoading(true);
                    if (data.action === window.google.picker.Action.PICKED) {
                        // Este é o ID da foto específica que o usuário clicou
                        const coverFileId = data.docs[0].id;

                        // 3. Busca a pasta pai no servidor
                        const driveFolderId = await getParentFolderIdServer(coverFileId, userId);

                        if (driveFolderId) {
                            // 4. Busca o nome da pasta no servidor
                            const driveFolderName = await getDriveFolderName(driveFolderId, userId);

                            // 5. Envia as TRÊS informações para o formulário
                            onFolderSelect(
                                driveFolderId,
                                driveFolderName || `ID: ${driveFolderId}`,
                                coverFileId // <--- Envia o ID da foto aqui
                            );
                        } else {
                            onError("Não foi possível determinar a pasta-mãe. Verifique as permissões do Drive.");
                        }
                    }
                    setLoading(false);
                })
                .build();

            picker.setVisible(true);

        } catch (error) {
            console.error("Erro geral ao abrir/configurar o Google Picker:", error);
            onError("Falha ao iniciar a seleção do Drive. Verifique a consola para detalhes.");
        } finally {
            // ATENÇÃO: Se o picker for aberto com sucesso, não limpe o loading aqui. 
            // O loading deve ser limpo DENTRO do setCallback.
            // Apenas limpa se a abertura inicial falhar.
            if (!isReadyToOpen) {
                setLoading(false);
            }
        }
    };

    // --- JSX DO BOTÃO ---
    // Inclui o loading no disabled do botão
    const isDisabled = !isReadyToOpen || loading;

    const buttonText = currentDriveId
        ? 'Pasta Selecionada'
        : 'Selecionar Pasta do Drive';

    return (
        <button
            type="button"
            onClick={openPicker}
            disabled={isDisabled}
            className={`
        flex items-center justify-center w-full p-3 rounded-xl transition-all duration-300
        text-[11px] font-bold uppercase shadow-sm
        ${isDisabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                    : 'bg-white border border-[#D4AF37]/30 text-slate-900 hover:bg-[#F3E5AB] hover:border-[#D4AF37] active:scale-[0.98]'
                }
    `}
        >
            {loading ? (
                <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-900 mr-2"></div>
                    <span>Processando</span>
                </div>
            ) : (
                <>
                    {/* Ícone sutil em Dourado */}
                    <svg
                        className={`w-4 h-4 mr-2 ${isDisabled ? 'text-slate-300' : 'text-[#D4AF37]'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15.5l-4-4 1.41-1.41L11 14.6V7.5h2v7.19l1.59-1.59L16 13.5l-4 4z" />
                    </svg>
                    <span>{buttonText}</span>
                </>
            )}
        </button>
    );
}