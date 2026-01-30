'use client';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { GooglePickerButton } from '@/components/google-drive';
import { usePlan } from '@/hooks/usePlan';
import {
  FolderSync,
  ImageIcon,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export function GaleriaDriveSection({
  driveData,
  handleFolderSelect,
  onPickerError,
  onTokenExpired,
  isValidatingDrive,
  coverPreviewUrl,
  imgRef,
  handleLoad,
  handleError,
  renameFilesSequential,
  setRenameFilesSequential,
  setUpsellFeature, // Função para abrir o modal de upgrade global
}) {
  const { permissions } = usePlan();

  // 🛡️ Validação de Limite de Fotos
  const photoLimit = permissions.maxPhotosPerGallery;
  const isOverLimit = driveData.photoCount > photoLimit;

  return (
    <div className="relative bg-white rounded-luxury border border-petroleum/40 p-4 space-y-4 mt-2 overflow-hidden">
      {/* Overlay de Validação */}
      {isValidatingDrive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-2" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
            Validando Pasta...
          </p>
        </div>
      )}
      <div className="flex items-center gap-2 pb-2 border-b border-petroleum/40">
        <FolderSync size={14} className="" />
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
          Google Drive
        </h3>
      </div>

      {/* Subseção 1: Vincular Pasta do Google Drive */}
      <div className="space-y-3">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum flex items-center gap-1.5">
          <FolderSync size={12} strokeWidth={2} className="inline" />
          Vincular Pasta do Google Drive
        </label>

        <div className="flex flex-col bg-slate-50 p-3 rounded-luxury border border-petroleum/40 space-y-3">
          <p className="text-[13px] text-petroleum/90 dark:text-slate-500 font-semibold truncate bg-white/50 px-2 py-1.5 rounded border border-petroleum/40">
            {driveData.name || 'Nenhuma pasta selecionada'}
          </p>

          {/* Botão VINCULAR/ALTERAR PASTA */}
          <div>
            <GooglePickerButton
              onFolderSelect={handleFolderSelect}
              onError={onPickerError}
              currentDriveId={driveData.id}
              onTokenExpired={onTokenExpired}
            />
          </div>

          {/* ⚠️ ALERTA DE LIMITE DO PLANO */}
          {driveData.id && (
            <div
              className={`p-2.5 rounded-luxury border flex gap-2.5 ${isOverLimit ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}
            >
              <AlertTriangle
                size={14}
                className={isOverLimit ? 'text-red-500' : 'text-blue-500'}
              />
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold uppercase text-petroleum">
                  {driveData.photoCount || 0} fotos encontradas
                </p>
                <p className="text-[9px] text-petroleum/70 leading-tight">
                  Seu plano ({permissions.maxPhotosPerGallery} fotos){' '}
                  {isOverLimit ? 'não suporta esta pasta.' : 'é compatível.'}
                </p>
                {isOverLimit && (
                  <button
                    type="button"
                    onClick={() =>
                      setUpsellFeature('Aumento de Limite de Fotos')
                    }
                    className="text-[9px] font-bold text-red-600 underline uppercase"
                  >
                    Fazer Upgrade
                  </button>
                )}
              </div>
            </div>
          )}
          {driveData.id && (
            <a
              href={`https://drive.google.com/drive/folders/${driveData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-white w-full"
            >
              <FolderSync size={14} className="" />
              Abrir no Google Drive
            </a>
          )}
        </div>
      </div>

      {/* Subseção 2: Preview de Capa */}
      <div className="space-y-3 pt-3 border-t border-petroleum/40">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum flex items-center gap-1.5">
          <ImageIcon size={12} strokeWidth={2} className="inline" />
          Foto de capa selecionada
        </label>

        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-luxury bg-slate-100 border border-petroleum/40">
          {coverPreviewUrl ? (
            <img
              ref={imgRef}
              src={coverPreviewUrl}
              onLoad={handleLoad}
              onError={handleError}
              alt="Preview da capa"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon size={32} className="text-slate-300" />
            </div>
          )}
        </div>
      </div>

      {/* Subseção 3: Renomear Arquivos */}
      {/* 🛡️ Proteção: Renomear Arquivos */}
      <PlanGuard
        feature="keepOriginalFilenames"
        label="Renomear fotos"
        icon={ImageIcon}
        onClickLocked={setUpsellFeature}
      >
        <div className="space-y-3 pt-4 border-t border-petroleum/40">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum flex items-center gap-1.5">
              <ImageIcon size={12} strokeWidth={2} className="inline" />
              Renomear fotos (foto-001...)
            </label>
            <button
              type="button"
              onClick={() => setRenameFilesSequential(!renameFilesSequential)}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${renameFilesSequential ? 'bg-gold' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${renameFilesSequential ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>
          <p className="text-[10px] text-petroleum/60 dark:text-slate-400 italic leading-tight">
            Padroniza o nome das fotos para &quot;foto-1.jpg&quot;,
            &quot;foto-2.jpg&quot;, etc, facilitando a organização do cliente.
          </p>
        </div>
      </PlanGuard>
    </div>
  );
}
