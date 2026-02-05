'use client';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { GooglePickerButton } from '@/components/google-drive';
import GoogleDriveImagePreview from '@/components/ui/GoogleDriveImagePreview';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { usePlan } from '@/core/context/PlanContext';
import { profile } from 'console';
import {
  FolderSync,
  ImageIcon,
  Loader2,
  AlertTriangle,
  ExternalLink,
  X,
} from 'lucide-react';

export function GaleriaDriveSection({
  driveData,
  handleFolderSelect,
  onPickerError,
  onTokenExpired,
  isValidatingDrive,
  renameFilesSequential,
  setRenameFilesSequential,
  setDriveData,
}) {
  const { permissions } = usePlan();

  // 🛡️ Validação de Limite de Fotos
  const photoLimit = permissions.maxPhotosPerGallery;
  const isOverLimit = driveData.photoCount > photoLimit;
  const maxCovers = permissions.maxCoverPerGallery || 1;

  return (
    <div className="relative bg-white rounded-luxury border border-slate-200 p-4 space-y-4 mt-2 overflow-hidden">
      {/* Overlay de Validação */}
      {isValidatingDrive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-2" />
          <p className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
            Validando Pasta...
          </p>
        </div>
      )}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <FolderSync size={14} className="text-gold" />
        <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
          Google Drive
        </h3>
      </div>

      {/* Subseção 1: Vincular Pasta do Google Drive */}
      <div className="space-y-3">
        <label>
          <FolderSync size={12} strokeWidth={2} className="text-gold" />
          Vincular Pasta do Google Drive
        </label>

        <div className="flex flex-col bg-slate-50 p-3 rounded-luxury border border-slate-200 space-y-3">
          <p className="text-[13px] text-petroleum/90 dark:text-slate-500 font-semibold truncate bg-white/50 px-2 py-1.5 rounded border border-slate-200">
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
            <PlanGuard
              feature="maxPhotosPerGallery"
              label="Limite de Fotos por Galeria"
              scenarioType="limit"
              forceShowLock={isOverLimit}
            >
              <div
                className={`p-2.5 rounded-luxury border flex gap-2.5 ${
                  isOverLimit
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-100'
                }`}
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
                </div>
              </div>
            </PlanGuard>
          )}
          {driveData.id && (
            <a
              href={`https://drive.google.com/drive/folders/${driveData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-white w-full"
            >
              <FolderSync size={14} className="text-gold" />
              Abrir no Google Drive
            </a>
          )}
        </div>
      </div>

      {/* Subseção 2: Preview de Capa */}
      {/* 🎯 Subseção 2 Ajustada: Grid de Capas com GoogleDriveImagePreview */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <label className="text-[10px] font-bold uppercase tracking-luxury text-petroleum flex items-center gap-2">
          <ImageIcon size={12} strokeWidth={2} className="text-gold" />
          Fotos de capa selecionadas ({driveData.allCovers?.length || 0}/
          {maxCovers})
        </label>

        <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-luxury border border-slate-200 min-h-[100px] items-center justify-start">
          {driveData.allCovers && driveData.allCovers.length > 0 ? (
            driveData.allCovers.map((photoId, index) => (
              <div
                key={photoId}
                className="relative group animate-in zoom-in-95 duration-300"
              >
                <div className="w-20 h-20 rounded-md overflow-hidden border-2 border-gold/40 shadow-md bg-white">
                  <GoogleDriveImagePreview
                    photoId={photoId}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Badge de Ordem */}
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-petroleum text-gold text-[9px] font-black rounded-full flex items-center justify-center border border-gold/30 shadow-sm">
                  {index + 1}
                </div>

                {/* Botão Remover */}
                <button
                  type="button"
                  onClick={() => {
                    const filtered = driveData.allCovers.filter(
                      (id) => id !== photoId,
                    );
                    setDriveData({
                      ...driveData,
                      allCovers: filtered,
                      coverId: filtered[0] || '',
                    });
                  }}
                  className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-4 text-slate-400">
              <ImageIcon
                size={24}
                strokeWidth={1}
                className="mb-1 opacity-50"
              />
              <span className="text-[8px] font-bold uppercase tracking-widest">
                Aguardando seleção
              </span>
            </div>
          )}

          {/* Slot de Incentivo (Se ainda houver limite) */}
          {driveData.id && driveData.allCovers?.length < maxCovers && (
            <div className="w-20 h-20 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-300 gap-1">
              <ImageIcon size={16} />
              <span className="text-[7px] font-black uppercase">Vago</span>
            </div>
          )}
        </div>
      </div>

      {/* Subseção 3: Renomear Arquivos */}
      {/* 🛡️ Proteção: Renomear Arquivos */}
      <PlanGuard feature="keepOriginalFilenames" label="Renomear fotos">
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 shrink-0">
              <label>
                <ImageIcon size={12} strokeWidth={2} className="text-gold" />
                Renomear fotos (foto-001...)
              </label>
              <InfoTooltip
                content='Se habilitado, padroniza o nome das fotos para
            "foto-1.jpg", "foto-2.jpg",
            etc."foto-2.jpg", etc. Desabilitado, usa os nomes
            originais das fotos.'
                width="w-48"
              />
            </div>
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
        </div>
      </PlanGuard>
    </div>
  );
}
