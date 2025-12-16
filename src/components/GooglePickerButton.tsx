"use client";

import { useEffect, useState } from 'react';
// Importa a instância exportada do cliente Supabase para o cliente
import { supabase } from '@/lib/supabase.client'; 
// Importa as Server Actions para o lado do servidor
import { getParentFolderIdServer, getDriveFolderName } from '@/actions/google'; 

// Tipagem para as propriedades do componente
interface GooglePickerProps {
    // Retorna o ID e o Nome
    onFolderSelect: (folderId: string, folderName: string) => void;
    currentDriveId: string | null;
    // Propriedade para tratamento de erro
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
    const getAuthDetails = async (): Promise<{ accessToken: string | null, userId: string | null }> => {
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.provider_token && session.user.id) {
            return { accessToken: session.provider_token, userId: session.user.id };
        }
        return { accessToken: null, userId: null };
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
                    setLoading(true); // Reativa o loading durante o processamento do callback
                    if (data.action === window.google.picker.Action.PICKED) {
                        const coverFileId = data.docs[0].id; // ID do Arquivo Selecionado

                        // 3. CHAMA SERVER ACTION para obter a PASTA (Renova Token)
                        const driveFolderId = await getParentFolderIdServer(coverFileId, userId);

                        if (driveFolderId) {
                            // 4. CHAMA SERVER ACTION para obter o NOME DA PASTA
                            const driveFolderName = await getDriveFolderName(driveFolderId, userId);

                            // 5. Retorna o ID e o Nome (usando o ID como fallback se o nome falhar)
                            onFolderSelect(driveFolderId, driveFolderName || `ID: ${driveFolderId}`);
                        } else {
                            // Erro de falha de token/permissão
                            onError("Não foi possível determinar a pasta-mãe. Verifique as permissões do Drive.");
                        }
                    }
                    setLoading(false); // Finaliza o loading após o callback
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
            className={`flex items-center justify-center w-full p-3 rounded-lg font-medium text-white transition-colors
                ${isDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0B57D0] hover:bg-[#0848AA]'}
            `}
        >
            {loading ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                </>
            ) : (
                <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15.5l-4-4 1.41-1.41L11 14.6V7.5h2v7.19l1.59-1.59L16 13.5l-4 4z" /></svg>
                    {buttonText}
                </>
            )}
        </button>
    );
}