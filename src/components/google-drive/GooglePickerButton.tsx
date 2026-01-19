'use client';

import { useEffect, useRef, useState } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  getParentFolderIdServer,
  getDriveFolderName,
  checkFolderPublicPermission,
  checkFolderLimits,
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
    loadGoogleLibraries(() => setIsReadyToOpen(true));
    return () => {
      window.onGoogleLibraryLoad = undefined;
    };
  }, [isReadyToOpen]);

  const openPicker = async () => {
    if (!isReadyToOpen) {
      onError('As bibliotecas do Google Drive não foram carregadas.');
      return;
    }
    setLoading(true);
    const { accessToken, userId } = await getAuthDetails();

    if (!accessToken || !userId) {
      onError('Erro de autenticação Google. Por favor, refaça o login.');
      setLoading(false);
      return;
    }

    try {
      const view = new window.google.picker.DocsView(
        window.google.picker.ViewId.DOCS,
      )
        .setMimeTypes(
          'application/vnd.google-apps.folder,image/jpeg,image/png,image/tiff',
        )
        .setMode(window.google.picker.DocsViewMode.GRID)
        .setSelectFolderEnabled(false);

      const picker = new window.google.picker.PickerBuilder()
        .setAppId(process.env.GOOGLE_CLIENT_ID!)
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
    } catch (error) {
      onError('Falha ao iniciar seleção do Drive.');
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
