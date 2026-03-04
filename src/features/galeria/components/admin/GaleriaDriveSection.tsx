'use client';

import { PlanGuard } from '@/components/auth/PlanGuard';
import { GooglePickerButton } from '@/components/google-drive';
import GoogleDriveImagePreview from '@/components/ui/GoogleDriveImagePreview';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { usePlan } from '@/core/context/PlanContext';
import { calcEffectiveMaxGalleries } from '@/core/config/plans';
import {
  FolderSync,
  ImageIcon,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Ban,
} from 'lucide-react';

// Número máximo de fotos de capa por galeria.
// Config visual — não relacionada a plano.
const MAX_COVERS_PER_GALLERY = 3;

interface DriveData {
  id?: string;
  name?: string;
  photoCount?: number;
  allCovers?: string[];
  coverId?: string;
}

interface GaleriaDriveSectionProps {
  driveData: DriveData;
  handleFolderSelect: (folder: any) => void;
  onPickerError: (error: any) => void;
  onTokenExpired: () => void;
  isValidatingDrive: boolean;
  renameFilesSequential: boolean;
  setRenameFilesSequential: (value: boolean) => void;
  setDriveData: (data: DriveData) => void;
  rootFolderId?: string;
  // Pool context — necessário para calcular impacto no pool de galerias
  usedPhotoCredits: number; // total de fotos publicadas em OUTRAS galerias
  activeGalleryCount: number; // número de galerias ativas atualmente
}

export function GaleriaDriveSection({
  driveData,
  handleFolderSelect,
  onPickerError,
  onTokenExpired,
  isValidatingDrive,
  renameFilesSequential,
  setRenameFilesSequential,
  setDriveData,
  rootFolderId,
  usedPhotoCredits,
  activeGalleryCount,
}: GaleriaDriveSectionProps) {
  const { permissions, planKey } = usePlan();

  const photoCount = driveData.photoCount ?? 0;
  const hardCap = permissions.maxPhotosPerGallery;
  const recommended = permissions.recommendedPhotosPerGallery;
  const maxCovers = MAX_COVERS_PER_GALLERY;

  // ── Estados de alerta de fotos ────────────────────────────────────────────
  const isOverHardCap = photoCount > hardCap;
  const isOverRecommended = !isOverHardCap && photoCount > recommended;
  const isCompatible = photoCount > 0 && !isOverHardCap && !isOverRecommended;

  // ── Impacto no pool de galerias ───────────────────────────────────────────
  // Quantas galerias o usuário pode criar AGORA (antes de salvar esta galeria)
  const galleriesNow = calcEffectiveMaxGalleries(
    planKey,
    usedPhotoCredits,
    activeGalleryCount,
  );
  // Quantas galerias o usuário poderá criar APÓS salvar esta galeria
  // (os créditos desta galeria serão descontados do pool)
  const galleriesAfterSave = calcEffectiveMaxGalleries(
    planKey,
    usedPhotoCredits + photoCount,
    activeGalleryCount,
  );
  const galleriesLost = Math.max(0, galleriesNow - galleriesAfterSave);
  const galleriesRemaining = Math.max(
    0,
    galleriesAfterSave - activeGalleryCount,
  );

  return (
    <div className="relative bg-white rounded-luxury border border-slate-200 p-4 space-y-4 mt-2 overflow-hidden">
      {/* Overlay de validação */}
      {isValidatingDrive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-2" />
          <p className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
            Carregando arquivos da pasta...
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <FolderSync size={14} className="text-gold" />
        <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
          Google Drive
        </h3>
      </div>

      {/* ── Subseção 1: Vincular Pasta ─────────────────────────────────────── */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-luxury text-petroleum flex items-center gap-1.5">
          <FolderSync size={12} strokeWidth={2} className="text-gold" />
          Vincular Pasta do Google Drive
        </label>

        <div className="flex flex-col bg-slate-50 p-3 rounded-luxury border border-slate-200 space-y-3">
          {/* Nome da pasta */}
          <p className="text-[13px] text-petroleum/90 font-semibold truncate bg-white/50 px-2 py-1.5 rounded border border-slate-200">
            {driveData.name || 'Nenhuma pasta selecionada'}
          </p>

          {/* Botões */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <GooglePickerButton
                onFolderSelect={handleFolderSelect}
                onError={onPickerError}
                currentDriveId={driveData.id}
                onTokenExpired={onTokenExpired}
                rootFolderId={driveData.id ? driveData.id : rootFolderId}
              />
            </div>

            {driveData.id && (
              <a
                href={`https://drive.google.com/drive/folders/${driveData.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir pasta no Google Drive"
                className="flex items-center justify-center h-9 w-9 shrink-0 rounded-luxury border border-slate-200 bg-white text-petroleum/60 hover:text-gold hover:border-gold/40 transition-all"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>

          {/* ── Alertas de fotos ─────────────────────────────────────────── */}
          {driveData.id && photoCount > 0 && (
            <>
              {/* Estado 1: acima do hard cap — BLOQUEIO */}
              {isOverHardCap && (
                <div className="p-2.5 rounded-luxury border bg-red-50 border-red-300 flex gap-2.5">
                  <Ban size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-red-700">
                      {photoCount} fotos — limite máximo excedido
                    </p>
                    <p className="text-[9px] text-red-600/80 leading-tight">
                      Seu plano suporta no máximo{' '}
                      <strong>{hardCap} fotos</strong> por galeria. Remova fotos
                      da pasta ou faça upgrade do plano para salvar esta
                      galeria.
                    </p>
                  </div>
                </div>
              )}

              {/* Estado 2: acima do recomendado — aviso de consumo de cota */}
              {isOverRecommended && (
                <div className="p-2.5 rounded-luxury border bg-amber-50 border-amber-200 flex gap-2.5">
                  <AlertTriangle
                    size={14}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-amber-700">
                      {photoCount} fotos — acima do recomendado
                    </p>
                    <p className="text-[9px] text-amber-700/80 leading-tight">
                      O recomendado é <strong>até {recommended} fotos</strong>{' '}
                      por galeria. Com {photoCount} fotos, esta galeria consome{' '}
                      {photoCount} créditos do seu pool de{' '}
                      <strong>
                        {permissions.photoCredits.toLocaleString('pt-BR')}
                      </strong>
                      {galleriesLost > 0 && (
                        <>
                          {' '}
                          — isso reduz em{' '}
                          <strong>
                            {galleriesLost} galeria
                            {galleriesLost > 1 ? 's' : ''}
                          </strong>{' '}
                          a capacidade disponível do seu plano
                        </>
                      )}
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Estado 3: compatível — confirmação com saldo restante */}
              {isCompatible && (
                <div className="p-2.5 rounded-luxury border bg-emerald-50 border-emerald-200 flex gap-2.5">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase text-emerald-700">
                      {photoCount} fotos — compatível com seu plano
                    </p>
                    <p className="text-[9px] text-emerald-700/70 leading-tight">
                      Dentro do limite recomendado de{' '}
                      <strong>{recommended} fotos</strong> por galeria.
                      {galleriesRemaining > 0 && (
                        <>
                          {' '}
                          Após salvar, você ainda poderá criar{' '}
                          <strong>
                            {galleriesRemaining} galeria
                            {galleriesRemaining > 1 ? 's' : ''}
                          </strong>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Pasta vinculada mas sem fotos */}
          {driveData.id && photoCount === 0 && !isValidatingDrive && (
            <div className="p-2.5 rounded-luxury border bg-slate-50 border-slate-200 flex gap-2.5">
              <AlertTriangle
                size={14}
                className="text-slate-400 shrink-0 mt-0.5"
              />
              <p className="text-[9px] text-slate-500 leading-tight">
                Nenhuma foto encontrada nesta pasta.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Subseção 2: Preview de Capas ───────────────────────────────────── */}
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
                key={`cover-${photoId}-${index}`}
                className="relative group animate-in zoom-in-95 duration-300"
              >
                <div className="w-20 h-20 rounded-md overflow-hidden border-2 border-gold/40 shadow-md bg-white">
                  <GoogleDriveImagePreview
                    photoId={photoId}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="absolute -top-2 -right-2 w-5 h-5 bg-petroleum text-gold text-[9px] font-black rounded-full flex items-center justify-center border border-gold/30 shadow-sm">
                  {index + 1}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const filtered = driveData.allCovers!.filter(
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

          {/* Slot vago */}
          {driveData.id && (driveData.allCovers?.length ?? 0) < maxCovers && (
            <div className="w-20 h-20 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-300 gap-1">
              <ImageIcon size={16} />
              <span className="text-[7px] font-black uppercase">Vago</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Subseção 3: Renomear Arquivos ──────────────────────────────────── */}
      {/* keepOriginalFilenames: false em FREE/START → guard bloqueia */}
      <PlanGuard
        feature="keepOriginalFilenames"
        label="Preservar nomes originais"
      >
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-[10px] font-bold uppercase tracking-luxury text-petroleum flex items-center gap-1.5">
                <ImageIcon size={12} strokeWidth={2} className="text-gold" />
                Renomear fotos (foto-001...)
              </label>
              <InfoTooltip
                title="Renomear fotos"
                content='Se habilitado, padroniza o nome das fotos para "foto-1.jpg", "foto-2.jpg", etc. Desabilitado, usa os nomes originais das fotos.'
              />
            </div>
            <button
              type="button"
              onClick={() => setRenameFilesSequential(!renameFilesSequential)}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
                renameFilesSequential ? 'bg-gold' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  renameFilesSequential ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </PlanGuard>
    </div>
  );
}
