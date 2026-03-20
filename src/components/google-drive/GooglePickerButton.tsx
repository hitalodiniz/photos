'use client';

import { useEffect, useRef, useState } from 'react';
import { useSupabaseSession } from '@photos/core-auth';
import {
  getGoogleClientId,
  getValidGoogleToken,
} from '@/actions/google.actions';
import { Loader2 } from 'lucide-react';
import { usePlan } from '@/core/context/PlanContext';
import { view } from 'framer-motion/client';

interface GooglePickerProps {
  onFolderSelect: (
    items: Array<{ id: string; name: string; parentId?: string }>,
  ) => void | Promise<void>;
  currentDriveId: string | null;
  onError: (message: string) => void;
  onTokenExpired?: () => void; // Callback quando o token expirar/for revogado
  // 🎯 Modo de operação: 'root' (selecionar pasta pai) ou 'covers' (selecionar fotos)
  mode?: 'root' | 'covers';
  rootFolderId?: string | null;
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
  rootFolderId,
  mode = 'covers',
}: GooglePickerProps) {
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [isReadyToOpen, setIsReadyToOpen] = useState(isPickerLoaded);

  const { getAuthDetails } = useSupabaseSession();
  const { permissions } = usePlan();
  //   A chave correta para "quantas fotos de capa o plano permite" é profileCarouselLimit.
  //   FREE=0, START=1, PLUS=1, PRO=3, PREMIUM=5.
  //   Usado com fallback 1 aqui (não 0) porque este componente só é renderizado
  //   para planos pagos — FREE não chega a abrir o picker de capas.
  const maxSelections = permissions.profileCarouselLimit || 1;
  //
  //o plano do usuário

  const onFolderSelectRef = useRef(onFolderSelect);

  useEffect(() => {
    onFolderSelectRef.current = onFolderSelect;
  }, [onFolderSelect]);

  // 🎯 Sincroniza o ref de loading para uso em timeouts (evita stale closure)
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

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
          console.warn(
            '[GooglePickerButton] ⚠️ Máximo de tentativas atingido. Bibliotecas podem não estar carregadas.',
          );
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
      onError(
        'As bibliotecas do Google Drive não foram carregadas. Recarregue a página.',
      );
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
      if (loadingRef.current) {
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
        onError(
          'Configuração do Google não encontrada. Verifique NEXT_PUBLIC_GOOGLE_CLIENT_ID.',
        );
        setLoading(false);
        return;
      }

      // 1) Busca dados de sessão (somente userId) com timeout de segurança
      let authDetails:
        | { userId?: string | null; accessToken?: string | null }
        | undefined;
      let authTimedOut = false;
      try {
        const authPromise = getAuthDetails();
        const timeoutPromise = new Promise<{ userId: null; timedOut: true }>(
          (resolve) => {
            setTimeout(() => {
              authTimedOut = true;
              resolve({ userId: null, timedOut: true });
            }, 12000);
          },
        );
        authDetails = (await Promise.race([authPromise, timeoutPromise])) as
          | { userId?: string | null; accessToken?: string | null }
          | undefined;
      } catch (error) {
        console.error('[GooglePickerButton] ❌ Erro ao buscar sessão:', error);
      }

      const userId = authDetails?.userId ?? null;

      // 2) Token OAuth deve vir do servidor (renova com refresh token automaticamente)
      //    Isso evita timeout/intermitência do getAuthDetails().accessToken no cliente.
      let accessToken: string | null = null;
      if (userId) {
        try {
          accessToken = await getValidGoogleToken(userId);
        } catch (error) {
          console.error(
            '[GooglePickerButton] ❌ Erro ao obter token Google no servidor:',
            error,
          );
        }
      }

      /* console.log('[GooglePickerButton] Access token recebido:', {
        hasAccessToken: !!accessToken,
        tokenLength: accessToken?.length ?? 0,
        userId,
        origin: window.location.origin,
        timedOut: authTimedOut || (!accessToken && !userId),
      }); */

      // Para o Picker funcionar, precisamos do token OAuth
      // A API Key não é necessária aqui pois estamos acessando dados privados do usuário
      // O Google Picker requer access token OAuth válido, que só pode ser gerado com um refresh token válido
      if (!accessToken) {
        let errorMessage =
          'Sua autorização do Google Drive expirou ou foi revogada. Conecte novamente sua conta Google para continuar.';

        // 🎯 Mensagem específica para timeout
        if (authTimedOut) {
          errorMessage =
            'Tempo de espera excedido ao validar sua sessão Google. Reconecte sua conta para renovar o token.';
        }

        onError(errorMessage);
        // Sempre que não houver token, tratamos como necessidade de reconexão.
        if (onTokenExpired) {
          onTokenExpired();
        }
        setLoading(false);
        return;
      }

      // 1. Definição de MimeTypes baseada no objetivo
      const folderMime = 'application/vnd.google-apps.folder';
      const imageMimes = 'image/jpeg,image/png,image/webp';
      const allMimes = `${folderMime},${imageMimes}`;

      // --- ABA 1: PASTA PADRÃO (Focada) ---
      const defaultView = new window.google.picker.DocsView(
        window.google.picker.ViewId.DOCS,
      )
        .setMimeTypes(mode === 'root' ? folderMime : allMimes)
        .setMode(window.google.picker.DocsViewMode.GRID)
        .setIncludeFolders(true)
        .setLabel('Google Drive'); // Nome da aba

      if (rootFolderId) {
        defaultView.setParent(rootFolderId); // Abre na pasta do fotógrafo
      }

      if (rootFolderId) {
        defaultView.setParent(rootFolderId);
      }

      // --- ABA 2: TODOS OS LOCAIS (Libera o Breadcrumb e Meu Drive) ---
      // 🎯 O segredo: Esta View NÃO tem setParent, o que força a navegação global.
      const globalView = new window.google.picker.DocsView(
        window.google.picker.ViewId.DOCS,
      )
        .setMimeTypes(mode === 'root' ? folderMime : allMimes)
        .setMode(window.google.picker.DocsViewMode.GRID)
        .setIncludeFolders(true)
        .setLabel('Todos os locais');

      if (mode === 'root') {
        defaultView.setSelectFolderEnabled(true);
        globalView.setSelectFolderEnabled(true);
      }

      // Usamos o ViewId.RECENT que puxa o histórico de uso do usuário
      const suggestionsView = new window.google.picker.DocsView(
        window.google.picker.ViewId.RECENT,
      )
        .setMimeTypes(mode === 'root' ? folderMime : allMimes)
        .setLabel('Sugestões'); // 🎯 Nome visual da aba igual à sua referência

      // 3. Inicialização do Builder
      const pickerBuilder = new window.google.picker.PickerBuilder()
        .setAppId(googleClientId.toString())
        .setOAuthToken(accessToken)
        .setLocale('pt-BR')
        .setOrigin(window.location.origin);

      // 3. Ordem das Views (Abas)
      pickerBuilder.addView(defaultView); // Aba 1
      pickerBuilder.addView(globalView); // Aba 2: 🎯 Ativa o breadcrumb global

      // 4. Features de Navegação
      pickerBuilder
        .enableFeature(window.google.picker.Feature.NAVIGATE_TO_DRIVE) // Permite subir nível
        .enableFeature(window.google.picker.Feature.NAVIGATION_HINT) // Exibe o caminho visual
        .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES); // Drives compartilhados

      if (mode !== 'root') {
        pickerBuilder.enableFeature(
          window.google.picker.Feature.MULTISELECT_ENABLED,
        );
      }
      //pickerBuilder.addView(suggestionsView); // Aba 2: Sugestões (Histórico)
      // Aba 3: Com Estrela (Favoritos do usuário no Drive)
      pickerBuilder.addView(
        new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
          .setMimeTypes(mode === 'root' ? folderMime : allMimes)
          .setStarred(true)
          .setLabel('Com Estrela'),
      );

      // 6. Lógica de Multiseleção Condicional (Corrigido para não duplicar)
      if (mode !== 'root') {
        pickerBuilder.enableFeature(
          window.google.picker.Feature.MULTISELECT_ENABLED,
        );
      }

      // 7. Configuração do Callback e Build Final
      const picker = pickerBuilder
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const selectedDocs = data.docs;

            // 🎯 Garante que não enviamos um array vazio para o SettingsForm
            if (!selectedDocs || selectedDocs.length === 0) {
              setLoading(false);
              return;
            }

            let finalItems = [];

            if (mode === 'root') {
              // 🎯 No modo ROOT, aceitamos apenas pastas
              finalItems = selectedDocs
                .filter(
                  (doc: any) =>
                    doc.mimeType === 'application/vnd.google-apps.folder',
                )
                .map((doc: any) => ({
                  id: doc.id,
                  name: doc.name,
                  parentId: doc.parentId,
                }));

              if (finalItems.length === 0) {
                onError('Por favor, selecione uma pasta válida.');
                setLoading(false);
                return;
              }
            } else {
              // 🎯 No modo COVERS (Padrão/Galeria), filtramos apenas arquivos (fotos)
              const selectedFiles = selectedDocs.filter(
                (doc: any) =>
                  doc.mimeType !== 'application/vnd.google-apps.folder' &&
                  doc.mimeType?.startsWith('image/'),
              );

              if (selectedFiles.length === 0) {
                onError(
                  'Por favor, selecione apenas imagens como foto de capa. Vídeos não são permitidos.',
                );
                setLoading(false);
                return;
              }

              // Validação de Limite por Plano (Apenas para capas)
              let filesToUse = selectedFiles;
              if (selectedFiles.length > maxSelections) {
                onError(
                  `Você selecionou ${selectedFiles.length} fotos, mas seu plano permite no máximo ${maxSelections} capas. Serão exibidas apenas as primeiras ${maxSelections} selecionadas.`,
                );
                filesToUse = selectedFiles.slice(0, maxSelections);
              }

              if (selectedFiles.length === 0) {
                onError(
                  'Por favor, selecione as fotos de capa dentro da pasta.',
                );
                setLoading(false);
                return;
              }

              finalItems = filesToUse.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                parentId: doc.parentId,
              }));
            }

            setLoading(true);
            try {
              // 🚀 CORREÇÃO AQUI:
              // Enviamos APENAS o array para o handleDriveSelection
              // pois ele agora espera: (selectedItems: Array<{id, name, parentId}>)
              await onFolderSelectRef.current(finalItems);
            } catch (error) {
              console.error(
                '[Picker Callback] Erro ao processar seleção:',
                error,
              );
              onError('Erro ao processar a seleção.');
            } finally {
              setLoading(false);
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            setLoading(false);
          }
        })
        .build();

      // console.log('[GooglePickerButton] Picker construído, abrindo...');
      picker.setVisible(true);
      // console.log('[GooglePickerButton] ✅ Picker.setVisible(true) chamado com sucesso');
      clearTimeout(timeoutId);
    } catch (error: any) {
      // 🎯 Log detalhado para identificar se o erro vem do Google ou da lógica interna
      console.error('[GooglePickerButton] ❌ Erro bruto:', error);
      console.error('[GooglePickerButton] ❌ Detalhes:', {
        message: error?.message || 'Sem mensagem',
        name: error?.name,
        details: error?.details, // Erros do Google costumam vir aqui
      });

      clearTimeout(timeoutId);

      const errorMessage =
        error?.message ||
        'Falha ao iniciar seleção do Drive. Recarregue a página.';

      if (
        error?.message?.includes('AUTH_RECONNECT_REQUIRED') ||
        error?.message?.includes('token') ||
        error?.message?.includes('autenticação')
      ) {
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
            ? 'bg-champagne/20 border-gold/40 text-champagnehover:bg-champagne/40'
            : 'bg-champagne text-black border-champagne hover:bg-white shadow-gold/10'
      }
    `}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          <span>Aguarde...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 ${hasSelected ? 'text-gold' : 'text-slate-400'}`}
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
          <span>
            {hasSelected
              ? // Se já existe um ID selecionado
                mode === 'root'
                ? 'Alterar Pasta Raiz'
                : 'Alterar Pasta/Foto de capa'
              : // Se o campo está vazio
                mode === 'root'
                ? 'Selecionar Pasta Raiz'
                : 'Vincular pasta do Drive e foto de capa'}
          </span>
        </div>
      )}
    </button>
  );
}
