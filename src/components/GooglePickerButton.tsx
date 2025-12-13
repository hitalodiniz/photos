// components/GooglePickerButton.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
// Importa diretamente a instância exportada
import { supabase } from '@/lib/supabase.client';

// Tipagem para as propriedades do componente
interface GooglePickerProps {
    onFolderSelect: (folderId: string) => void;
    currentDriveId: string;
}

// Declaração de variáveis globais do Google
declare global {
    interface Window {
        gapi: any;
        google: any;
        onGoogleLibraryLoad: () => void;
    }
}

let isGoogleApiReady = false;

// Função que faz a chamada API no navegador
const getParentFolderIdClient = async (fileId: string, accessToken: string): Promise<string | null> => {
    if (!window.gapi || !window.gapi.client || !window.gapi.client.drive) {
        console.error("GAPI Drive Client não está carregado.");
        return null;
    }

    try {
        // Define o Access Token para a requisição
        window.gapi.client.setToken({ access_token: accessToken });

        // Faz a chamada files.get para obter os metadados do arquivo (APENAS o campo 'parents')
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'parents',
        });

        const parents = response.result.parents;
        
        if (parents && parents.length > 0) {
            // Retorna o ID da pasta-mãe
            return parents[0];
        }

        return null;

    } catch (error) {
        console.error('Erro ao obter pasta-mãe (Client):', error);
        return null;
    }
};

export default function GooglePickerButton({ onFolderSelect, currentDriveId }: GooglePickerProps) {
    const [loading, setLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(isGoogleApiReady);

    // NÃO PRECISAMOS DE useMemo PARA CRIAR O CLIENTE, POIS IMPORTAMOS DIRETAMENTE

    // --- Etapa 1: Carregar/Monitorar as bibliotecas do Google (GAPI e GSI) ---
    useEffect(() => {
        if (isGoogleApiReady) {
            setIsLoaded(true);
            return;
        }

        window.onGoogleLibraryLoad = () => {
            if (window.gapi) {
                // Carrega a biblioteca Picker
                window.gapi.load('picker', () => {
                    isGoogleApiReady = true;
                    setIsLoaded(true);
                });
            }
        };
    }, []);

    // --- Etapa 2: Funções para obter o token e construir o Picker ---

    // Obtém o Google Access Token do Supabase Session
    const getGoogleAccessToken = async (): Promise<string | null> => {
        // Usa a instância 'supabase' importada
        const { data: { session } } = await supabase.auth.getSession();

        // O Supabase armazena o token de acesso do Google como 'provider_token'
        if (session && session.provider_token) {
            return session.provider_token;
        }
        return null;
    };

    // Função principal que abre o modal do Picker
    const openPicker = async () => {
        if (!isLoaded) {
            alert('Bibliotecas do Google ainda não carregadas.');
            return;
        }

        setLoading(true);
        const accessToken = await getGoogleAccessToken();

        if (!accessToken) {
            alert('Erro: Não foi possível obter o token de acesso do Google. Refaça o login.');
            setLoading(false);
            return;
        }

       try {
        // --- 1. CONFIGURAÇÃO DA VIEW PARA PASTA E ARQUIVOS ---
        // Usamos DocsView com ViewId.DOCS, que lista tanto arquivos quanto pastas.
        const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
            // Filtra o que aparece na lista: Pasta e Tipos de Imagem (JPEG, PNG, etc.)
            .setMimeTypes('application/vnd.google-apps.folder,image/jpeg,image/png,image/tiff') 
            .setMode(window.google.picker.DocsViewMode.GRID) // Modo Grade é melhor para fotos (como na Imagem 7)
            // ESTA LINHA É CRÍTICA: Permite que o usuário selecione o objeto Pasta.
            .setSelectFolderEnabled(true); 

        // --- 2. CONSTRUÇÃO DO PICKER ---
        const picker = new window.google.picker.PickerBuilder()
            .setAppId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!) 
            .setOAuthToken(accessToken)
            .addView(view) 
            .enableFeature(window.google.picker.Feature.NAVIGATE_TO_DRIVE) 
            .setLocale('pt-BR')
            .setCallback(async (data: any) => {
                /*if (data.action === window.google.picker.Action.PICKED) {
                    const file = data.docs[0];
                    
                    // O item selecionado será uma Pasta (MimeType = 'application/vnd.google-apps.folder')
                    // ou um Arquivo (MimeType = 'image/jpeg').

                    // Se a intenção é SÓ pegar o ID da PASTA, você pode adicionar uma validação aqui
            /*        if (file.mimeType === 'application/vnd.google-apps.folder') {
                        onFolderSelect(file.id); 
                    } else {
                        // Opcional: Avisar o usuário que apenas pastas devem ser selecionadas
                        alert("Por favor, selecione uma pasta inteira, e não um arquivo de foto individual.");
                        // Não chamar onFolderSelect para manter o estado vazio
                    }
                        
                }*/
               if (data.action === window.google.picker.Action.PICKED) {
                    const coverFileId = data.docs[0].id; // ID do Arquivo

                    // Como você está no cliente, use a função que definimos para buscar a pasta:
                    const driveFolderId = await getParentFolderIdClient(coverFileId, accessToken);

                    if (driveFolderId) {
                        // O nome 'onFolderSelect' é confuso, mas passará o ID da PASTA
                        onFolderSelect(driveFolderId); 
                        
                        // Você precisará de outro callback para salvar o coverFileId no estado do componente pai
                        // Ex: onCoverFileSelect(coverFileId); 
                        
                    } else {
                        alert("Erro: Não foi possível determinar a pasta-mãe da foto selecionada.");
                    }
                }
            })
            .build();
        
        picker.setVisible(true);

    } catch (error) {
        // ...
    } finally {
        setLoading(false);
    }
    };

    // ... (restante do JSX para o botão)
    const buttonText = currentDriveId
        ? 'Pasta Selecionada'
        : 'Selecionar Pasta do Drive';

    return (
        <button
            type="button"
            onClick={openPicker}
            disabled={!isLoaded || loading}
            className={`flex items-center justify-center w-full p-3 rounded-lg font-medium text-white transition-colors
                ${!isLoaded || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0B57D0] hover:bg-[#0848AA]'}
            `}
        >
            {loading ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Carregando Picker...
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