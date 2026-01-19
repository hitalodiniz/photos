'use client';

import { useEffect, useRef, useState } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  getParentFolderIdServer,
  getDriveFolderName,
  checkFolderPublicPermission,
  checkFolderLimits,
  getGoogleClientId,
} from '@/actions/google.actions';
import { Loader2 } from 'lucide-react'; // Importado para manter o padrão de spinners

interface GooglePickerProps {
  onFolderSelect: (
    folderId: string,
    folderName: string,
    coverFileId: string,
    limitData: { count: number; hasMore: boolean }, // 🎯 Nova info
  ) => void;
  currentDriveId: string | null;
  onError: (message: string) => void;
  planLimit: number;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
    onGoogleLibraryLoad: (() => void) | undefined;
  }
}

let isPickerLoaded = false;
let isLoadingAttempted = false;

const loadGoogleLibraries = (callback: () => void) => {
  if (isPickerLoaded) {
    callback();
    return;
  }

  // 🎯 Verifica se ambas as bibliotecas estão disponíveis
  const checkAndLoad = () => {
    if (window.gapi && window.google && window.google.picker) {
      // Se já está carregado, apenas marca como pronto
      isPickerLoaded = true;
      callback();
      return;
    }

    if (window.gapi) {
      window.gapi.load('picker', () => {
        // Aguarda um pouco para garantir que window.google.picker está disponível
        setTimeout(() => {
          if (window.google && window.google.picker) {
            isPickerLoaded = true;
            callback();
          }
        }, 100);
      });
    }
  };

  // Tenta carregar imediatamente se já estiver disponível
  if (window.gapi && window.google && window.google.picker) {
    isPickerLoaded = true;
    callback();
    return;
  }

  // Se gapi está disponível, tenta carregar o picker
  if (window.gapi) {
    checkAndLoad();
  } else {
    // Configura callback para quando as bibliotecas carregarem
    if (!isLoadingAttempted) {
      isLoadingAttempted = true;
      window.onGoogleLibraryLoad = () => {
        checkAndLoad();
      };
    }
  }
};

export default function GooglePickerButton({
  onFolderSelect,
  currentDriveId,
  onError,
  planLimit,
}: GooglePickerProps) {
  const [loading, setLoading] = useState(false);
  const [isReadyToOpen, setIsReadyToOpen] = useState(isPickerLoaded);
  const onFolderSelectRef = useRef(onFolderSelect);
  const { getAuthDetails } = useSupabaseSession();

  useEffect(() => {
    onFolderSelectRef.current = onFolderSelect;
  }, [onFolderSelect]);

  useEffect(() => {
    if (isReadyToOpen) return;

    // 🎯 Verifica periodicamente se as bibliotecas carregaram
    const checkLibraries = () => {
      if (window.gapi && window.google && window.google.picker) {
        isPickerLoaded = true;
        setIsReadyToOpen(true);
        return;
      }
      loadGoogleLibraries(() => setIsReadyToOpen(true));
    };

    // Tenta imediatamente
    checkLibraries();

    // Se não carregou, tenta novamente após um delay
    const timeoutId = setTimeout(() => {
      if (!isReadyToOpen) {
        checkLibraries();
      }
    }, 1000);

    // Verifica periodicamente (máximo 5 tentativas)
    let attempts = 0;
    const intervalId = setInterval(() => {
      if (isReadyToOpen || attempts >= 5) {
        clearInterval(intervalId);
        return;
      }
      attempts++;
      checkLibraries();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      // Não remove o callback global para não quebrar outros componentes
    };
  }, [isReadyToOpen]);

  const openPicker = async () => {
    // 🎯 Verificação dupla antes de abrir
    if (!isReadyToOpen || !window.google || !window.google.picker) {
      console.error('[GooglePickerButton] Libraries not ready', {
        isReadyToOpen,
        hasGoogle: !!window.google,
        hasPicker: !!(window.google && window.google.picker),
        hasGapi: !!window.gapi,
      });
      onError('As bibliotecas do Google Drive não foram carregadas. Recarregue a página.');
      return;
    }

    setLoading(true);
    
    try {
      // 🎯 1. Busca o Client ID (sempre do servidor para garantir que funciona no Vercel)
      let googleClientId: string | null = null;
      try {
        googleClientId = await getGoogleClientId();
        console.log('[GooglePickerButton] Client ID obtido:', googleClientId ? 'OK' : 'NULL');
      } catch (error) {
        console.error('[GooglePickerButton] Erro ao buscar Client ID:', error);
      }
      
      if (!googleClientId) {
        console.error('[GooglePickerButton] Client ID não encontrado. Verifique NEXT_PUBLIC_GOOGLE_CLIENT_ID na Vercel.');
        onError('Configuração do Google não encontrada. Verifique NEXT_PUBLIC_GOOGLE_CLIENT_ID na Vercel.');
        setLoading(false);
        return;
      }

      // 🎯 2. Busca o token de autenticação
      const { accessToken, userId } = await getAuthDetails();

      if (!accessToken || !userId) {
        console.error('[GooglePickerButton] Token não disponível', { hasToken: !!accessToken, hasUserId: !!userId });
        onError('Erro de autenticação Google. Por favor, refaça o login.');
        setLoading(false);
        return;
      }
      const view = new window.google.picker.DocsView(
        window.google.picker.ViewId.DOCS,
      )
        .setMimeTypes(
          'application/vnd.google-apps.folder,image/jpeg,image/png,image/tiff',
        )
        .setMode(window.google.picker.DocsViewMode.GRID)
        .setSelectFolderEnabled(false);

      const picker = new window.google.picker.PickerBuilder()
        .setAppId(googleClientId)
        .setOAuthToken(accessToken)
        .addView(view)
        .enableFeature(window.google.picker.Feature.NAVIGATE_TO_DRIVE)
        .setLocale('pt-BR')
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            setLoading(true);

            const coverFileId = data.docs[0].id;
            const driveFolderId = await getParentFolderIdServer(
              coverFileId,
              userId,
            );

            if (driveFolderId) {
              //VALIDAÇÃO DE LIMITE
              const { count, hasMore } = await checkFolderLimits(
                driveFolderId,
                userId,
                planLimit,
              );
              const driveFolderName = await getDriveFolderName(
                driveFolderId,
                userId,
              );
              const isPublic = await checkFolderPublicPermission(
                driveFolderId,
                userId,
              );

              if (isPublic) {
                onFolderSelectRef.current(
                  driveFolderId,
                  driveFolderName,
                  coverFileId,
                  { count, hasMore }, // 🎯 Repassa o status do limite para o Form
                );
              } else {
                // const folderUrl = `https://drive.google.com/drive/folders/${driveFolderId}`;
                onError(
                  `Pasta privada. Mude o acesso para "Qualquer pessoa com o link".`,
                );
              }
            }
          }
          setLoading(false);
        })
        .build();

      picker.setVisible(true);
    } catch (error: any) {
      console.error('[GooglePickerButton] Error opening picker', {
        error: error?.message,
        stack: error?.stack,
        hasGoogle: !!window.google,
        hasPicker: !!(window.google && window.google.picker),
      });
      
      // 🎯 Tratamento de erro mais simples - apenas mostra mensagem
      const errorMessage = error?.message || 'Falha ao iniciar seleção do Drive. Recarregue a página.';
      
      // Se for erro de autenticação, sugere reconexão
      if (error?.message?.includes('AUTH_RECONNECT_REQUIRED') || 
          error?.message?.includes('token') ||
          error?.message?.includes('autenticação')) {
        onError('Erro de autenticação Google. Por favor, refaça o login.');
      } else {
        onError(errorMessage);
      }
      
      setLoading(false);
    }
  };

  const isDisabled = !isReadyToOpen || loading;
  const hasSelected = !!currentDriveId;

  return (
    <button
      type="button"
      onClick={openPicker}
      disabled={isDisabled}
      className={`
        /* Layout Compacto e Alinhamento */
        flex items-center justify-center h-9 px-4 rounded-[0.4rem] shrink-0
        transition-all duration-300 text-[10px] font-semibold uppercase tracking-widest
        border shadow-sm active:scale-[0.98]
        
        ${
          isDisabled
            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
            : hasSelected
              ? 'bg-[#F3E5AB]/20 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#F3E5AB]/40'
              : 'bg-[#F3E5AB] text-black border-[#F3E5AB] hover:bg-white shadow-[#D4AF37]/10'
        }
      `}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          <span>Aguarde</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 ${hasSelected ? 'text-[#D4AF37]' : 'text-slate-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <span>{hasSelected ? 'Alterar Pasta' : 'Vincular Drive'}</span>
        </div>
      )}
    </button>
  );
}
