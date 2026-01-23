'use client';

import { useEffect, useRef, useState } from 'react';
import { useSupabaseSession } from '@photos/core-auth';
import { getGoogleClientId } from '@/actions/google.actions';
import { Loader2 } from 'lucide-react';

interface GooglePickerProps {
  onFolderSelect: (folderId: string, folderName: string) => void;
  currentDriveId: string | null;
  onError: (message: string) => void;
  onTokenExpired?: () => void; // Callback quando o token expirar/for revogado
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
  onTokenExpired,
}: GooglePickerProps) {
  const [loading, setLoading] = useState(false);
  const [isReadyToOpen, setIsReadyToOpen] = useState(isPickerLoaded);
  const onFolderSelectRef = useRef(onFolderSelect);
  const { getAuthDetails } = useSupabaseSession();

  useEffect(() => {
    onFolderSelectRef.current = onFolderSelect;
  }, [onFolderSelect]);

  useEffect(() => {
    if (isReadyToOpen) {
      // console.log('[GooglePickerButton] Bibliotecas já prontas');
      return;
    }

    // 🎯 Verifica periodicamente se as bibliotecas carregaram
    const checkLibraries = () => {
      const hasGapi = !!window.gapi;
      const hasGoogle = !!window.google;
      const hasPicker = !!(window.google && window.google.picker);
      
      /* console.log('[GooglePickerButton] Verificando bibliotecas:', {
        hasGapi,
        hasGoogle,
        hasPicker,
        origin: window.location.origin,
      }); */

      if (hasGapi && hasGoogle && hasPicker) {
        // console.log('[GooglePickerButton] ✅ Todas as bibliotecas carregadas!');
        isPickerLoaded = true;
        setIsReadyToOpen(true);
        return;
      }
      loadGoogleLibraries(() => {
        // console.log('[GooglePickerButton] ✅ Bibliotecas carregadas via callback');
        setIsReadyToOpen(true);
      });
    };

    // Tenta imediatamente
    checkLibraries();

    // Se não carregou, tenta novamente após um delay
    const timeoutId = setTimeout(() => {
      if (!isReadyToOpen) {
        // console.log('[GooglePickerButton] Tentando novamente após 1s...');
        checkLibraries();
      }
    }, 1000);

    // Verifica periodicamente (máximo 5 tentativas)
    let attempts = 0;
    const intervalId = setInterval(() => {
      if (isReadyToOpen || attempts >= 5) {
        if (attempts >= 5) {
          console.warn('[GooglePickerButton] ⚠️ Máximo de tentativas atingido. Bibliotecas podem não estar carregadas.');
        }
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
    // Verificação antes de abrir
    if (!isReadyToOpen || !window.google || !window.google.picker) {
      console.error('[GooglePickerButton] Libraries not ready', {
        isReadyToOpen,
        hasGoogle: !!window.google,
        hasPicker: !!(window.google && window.google.picker),
        hasGapi: !!window.gapi,
        origin: window.location.origin,
      });
      onError('As bibliotecas do Google Drive não foram carregadas. Recarregue a página.');
      return;
    }

    /* console.log('[GooglePickerButton] Iniciando abertura do picker...', {
      isReadyToOpen,
      hasGoogle: !!window.google,
      hasPicker: !!(window.google && window.google.picker),
      origin: window.location.origin,
    }); */

    setLoading(true);
    
    // 🎯 Timeout de segurança: se demorar mais de 30s, cancela
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('[GooglePickerButton] ⚠️ Timeout ao abrir picker (30s)');
        onError('Tempo de espera excedido. Tente novamente.');
        setLoading(false);
      }
    }, 30000);
    
    try {
      // Busca o Client ID
      // console.log('[GooglePickerButton] Buscando Google Client ID...');
      const googleClientId = await getGoogleClientId();
      /* console.log('[GooglePickerButton] Client ID recebido:', {
        hasClientId: !!googleClientId,
        clientIdLength: googleClientId?.length || 0,
        clientIdPreview: googleClientId ? `${googleClientId.substring(0, 20)}...` : 'null',
        origin: window.location.origin,
      }); */
      
      if (!googleClientId) {
        console.error('[GooglePickerButton] ❌ Client ID não encontrado');
        clearTimeout(timeoutId);
        onError('Configuração do Google não encontrada. Verifique NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
        setLoading(false);
        return;
      }

      // Busca o token de autenticação com timeout
      // console.log('[GooglePickerButton] Buscando access token...');
      
      // 🎯 Timeout específico para getAuthDetails (20 segundos - aumentado para dar mais tempo)
      let authDetails: any = null;
      let retryCount = 0;
      const maxRetries = 1;
      
      while (retryCount <= maxRetries && !authDetails?.accessToken) {
        try {
          const tokenPromise = getAuthDetails();
          const timeoutPromise = new Promise<{ accessToken: null; userId: null; timedOut: true }>((resolve) => {
            setTimeout(() => {
              if (retryCount === 0) {
                console.warn('[GooglePickerButton] ⚠️ Timeout ao buscar access token (20s). Tentando novamente...');
              } else {
                console.error('[GooglePickerButton] ⚠️ Timeout ao buscar access token após retry (20s)');
              }
              resolve({ accessToken: null, userId: null, timedOut: true });
            }, 20000); // Aumentado para 20 segundos
          });
          
          authDetails = await Promise.race([tokenPromise, timeoutPromise]);
          
          // Se obteve token ou não é timeout, para o loop
          if (authDetails?.accessToken || !authDetails?.timedOut) {
            break;
          }
          
          // Se deu timeout e ainda temos tentativas, tenta novamente
          if (authDetails?.timedOut && retryCount < maxRetries) {
            retryCount++;
            // console.log(`[GooglePickerButton] Tentativa ${retryCount + 1} de ${maxRetries + 1}...`);
            // Aguarda um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        } catch (error: any) {
          console.error('[GooglePickerButton] ❌ Erro ao buscar auth details:', error);
          // Se é o último retry, mostra erro
          if (retryCount >= maxRetries) {
            onError('Erro ao verificar autenticação. Por favor, refaça o login.');
            setLoading(false);
            return;
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const { accessToken, timedOut } = authDetails || {};
      
      /* console.log('[GooglePickerButton] Access token recebido:', {
        hasAccessToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        userId: authDetails?.userId,
        origin: window.location.origin,
        timedOut: timedOut || (!accessToken && !authDetails?.userId),
      }); */

      // Para o Picker funcionar, precisamos do token OAuth
      // A API Key não é necessária aqui pois estamos acessando dados privados do usuário
      // O Google Picker requer access token OAuth válido, que só pode ser gerado com um refresh token válido
      if (!accessToken) {
        let errorMessage = 'Token do Google não encontrado. Seu refresh token expirou ou foi revogado. Por favor, faça login novamente com Google para renovar o acesso ao Google Drive.';
        
        // 🎯 Mensagem específica para timeout
        if (timedOut) {
          errorMessage = 'Tempo de espera excedido ao buscar token do Google. Por favor, tente novamente ou refaça o login.';
        }
        
        onError(errorMessage);
        // 🎯 Se há callback para token expirado, chama para abrir o modal de consent
        if (onTokenExpired && !timedOut) {
          onTokenExpired();
        }
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
        .setSelectFolderEnabled(false)
        .setOwnedByMe(true); // 🎯 Mostra apenas arquivos e pastas próprios, excluindo pastas compartilhadas

      const pickerBuilder = new window.google.picker.PickerBuilder()
        .setAppId(googleClientId)
        .setOAuthToken(accessToken)
        .addView(view)
        .enableFeature(window.google.picker.Feature.NAVIGATE_TO_DRIVE)
        .setLocale('pt-BR')
        .setOrigin(window.location.origin); // 🎯 Compatibilidade com Vercel

      const picker = pickerBuilder
        .setCallback((data: any) => {
          /* console.log('[GooglePickerButton] Picker callback recebido:', {
            action: data.action,
            hasDocs: !!data.docs,
            docsLength: data.docs?.length || 0,
          }); */

          if (data.action === window.google.picker.Action.PICKED) {
            const selectedItem = data.docs[0];
            
            /* console.log('[GooglePickerButton] Item selecionado:', {
              id: selectedItem?.id,
              name: selectedItem?.name,
              mimeType: selectedItem?.mimeType,
            }); */
            
            // 🎯 Componente "burro": apenas retorna o que foi selecionado
            // A validação será feita no componente pai
            if (selectedItem) {
              // Se selecionou uma pasta, retorna diretamente
              if (selectedItem.mimeType === 'application/vnd.google-apps.folder') {
                onFolderSelectRef.current(selectedItem.id, selectedItem.name);
              } else {
                // Se selecionou um arquivo, retorna o ID do arquivo (o pai vai buscar a pasta)
                // Por enquanto, retornamos o ID do arquivo e o nome
                onFolderSelectRef.current(selectedItem.id, selectedItem.name);
              }
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            // console.log('[GooglePickerButton] Usuário cancelou a seleção');
            // Usuário cancelou - apenas fecha o loading
          } else {
            // console.log('[GooglePickerButton] Ação desconhecida:', data.action);
          }
          setLoading(false);
        })
        .build();

      // console.log('[GooglePickerButton] Picker construído, abrindo...');
      picker.setVisible(true);
      // console.log('[GooglePickerButton] ✅ Picker.setVisible(true) chamado com sucesso');
      clearTimeout(timeoutId);
    } catch (error: any) {
      console.error('[GooglePickerButton] ❌ Erro ao abrir picker:', {
        error: error?.message,
        stack: error?.stack,
        name: error?.name,
        origin: window.location.origin,
      });
      
      clearTimeout(timeoutId);
      
      const errorMessage = error?.message || 'Falha ao iniciar seleção do Drive. Recarregue a página.';
      
      if (error?.message?.includes('AUTH_RECONNECT_REQUIRED') || 
          error?.message?.includes('token') ||
          error?.message?.includes('autenticação')) {
        onError('Erro de autenticação Google. Por favor, refaça o login.');
        // 🎯 Se há callback para token expirado, chama para abrir o modal de consent
        if (onTokenExpired) {
          onTokenExpired();
        }
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
