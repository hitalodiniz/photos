'use client';

import { useEffect, useRef } from 'react';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { GooglePickerButton } from '@/components/google-drive';
import GoogleDriveImagePreview from '@/components/ui/GoogleDriveImagePreview';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { usePlan } from '@/core/context/PlanContext';
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
  /** Teto real do plano (MAX_PHOTOS_PER_GALLERY_BY_PLAN). Quando informado, o alerta vermelho usa este valor em vez de permissions.maxPhotosPerGallery. */
  planHardCap?: number;
  /** Quando true, indica que a pasta excede o teto e o modal de upgrade foi aberto (alerta vermelho deve aparecer mesmo se photoCount vier capado). */
  isOverHardCap?: boolean;
  /** Máximo de fotos que esta galeria pode ter conforme o pool (totalPool - usedPhotoCredits). Quando a pasta tem mais, exibimos alerta e chamamos onPoolExceeded. */
  maxPhotosByPool?: number;
  /** Créditos restantes no pool (global): max(0, totalPool - SUM(photo_count)). Igual ao "restantes" do SidebarStorage. Quando 0, a mensagem deve mostrar "0 créditos no pool". */
  poolRemainingCredits?: number;
  /** Chamado quando a pasta tem mais fotos do que o pool permite (para o pai abrir o modal de cota do pool). */
  onPoolExceeded?: () => void;
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
  planHardCap,
  isOverHardCap: isOverHardCapProp,
  maxPhotosByPool,
  poolRemainingCredits,
  onPoolExceeded,
}: GaleriaDriveSectionProps) {
  const { permissions, planKey } = usePlan();

  const photoCount = driveData.photoCount ?? 0;
  // Usar o mesmo teto do plano que o form (MAX_PHOTOS_PER_GALLERY_BY_PLAN) para alinhar alerta vermelho e modal.
  const hardCap = planHardCap ?? permissions.maxPhotosPerGallery;
  const recommended = permissions.recommendedPhotosPerGallery; // base do pool (cálculo dinâmico)
  const alertThreshold = permissions.filesAlertThreshold ?? recommended; // aviso UX (ex: PRO=750, não 1000)
  const maxCovers = MAX_COVERS_PER_GALLERY;

  // ── Pool: máximo que esta galeria pode usar (não exceder cota total)
  // Fonte da verdade: usedPhotoCredits = SUM(photo_count) em tb_galerias (não arquivadas/deletadas).
  // Quando o pai passa maxPhotosByPool, ele já foi calculado como totalPool - usado; senão calculamos aqui.
  const totalPool = permissions.photoCredits ?? 0;
  const maxAllowedByPool =
    maxPhotosByPool ?? Math.max(0, totalPool - usedPhotoCredits);
  // Para a mensagem "só X créditos no pool": usar o restante global (como SidebarStorage), não o limite desta galeria
  const creditsInPoolForMessage = poolRemainingCredits ?? maxAllowedByPool;
  const isOverPoolCap = photoCount > maxAllowedByPool && photoCount <= hardCap;

  // ── Estados de alerta de fotos ────────────────────────────────────────────
  // Quando o pai abre o modal (pasta > teto), passamos isOverHardCap para exibir o vermelho mesmo com photoCount capado.
  const isOverHardCap = isOverHardCapProp ?? photoCount > hardCap;
  const isOverRecommended =
    !isOverHardCap && !isOverPoolCap && photoCount > alertThreshold; // usa alertThreshold
  const isCompatible =
    photoCount > 0 && !isOverHardCap && !isOverPoolCap && !isOverRecommended;

  // ── Créditos restantes no pool (dinâmico) ─────────────────────────────────
  const remainingCreditsAfterThis = Math.max(
    0,
    totalPool - usedPhotoCredits - photoCount,
  );
  const maxGalleriesInPlan = permissions.maxGalleriesHardCap ?? 3;

  const lastFiredPoolExceededRef = useRef<string | null>(null);
  // Abre o modal de cota do pool uma vez por pasta quando excede o disponível (ex.: 230 na pasta, 220 no pool).
  useEffect(() => {
    if (driveData.id && isOverPoolCap && onPoolExceeded) {
      if (lastFiredPoolExceededRef.current !== driveData.id) {
        lastFiredPoolExceededRef.current = driveData.id;
        onPoolExceeded();
      }
    }
  }, [driveData.id, isOverPoolCap, onPoolExceeded]);

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
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-luxury text-petroleum flex items-center gap-1.5">
          <FolderSync size={12} strokeWidth={2} className="text-gold" />
          Vincular Pasta do Google Drive
        </label>

        <p className="text-[10px] text-slate-800 leading-tight">
          Máximo de <strong>{permissions.maxVideoCount ?? 1}</strong> vídeos por
          galeria de até <strong>{permissions.maxVideoSizeMB ?? 15} MB</strong>{' '}
          cada (por performance). Acima disso os vídeos não são listados e
          contados.
        </p>

        <div className="flex flex-col bg-slate-50 p-3 rounded-luxury border border-slate-200 space-y-3">
          {/* Nome da pasta + Botões lado a lado */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <p className="text-[13px] text-petroleum/90 font-semibold truncate bg-white/50 px-2 py-1.5 rounded border border-slate-200 sm:min-w-0 sm:flex-1">
              {driveData.name || 'Nenhuma pasta selecionada'}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex-1 min-w-0">
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
                      {photoCount} arquivos — limite excedido
                    </p>
                    <p className="text-[9px] text-red-600/80 leading-tight">
                      Seu plano suporta até <strong>{hardCap} arquivos</strong>{' '}
                      por galeria. Remova arquivos da pasta ou faça upgrade para
                      continuar.
                    </p>
                  </div>
                </div>
              )}

              {/* Estado 1b: cota do pool insuficiente — limitar a maxAllowedByPool e abrir modal */}
              {isOverPoolCap && (
                <div className="p-2.5 rounded-luxury border bg-red-50 border-red-300 flex gap-2.5">
                  <Ban size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-red-700">
                      {photoCount.toLocaleString('pt-BR')} arquivos na pasta —{' '}
                      {creditsInPoolForMessage.toLocaleString('pt-BR')} créditos
                      na cota de arquivos
                    </p>
                    <p className="text-[10px] text-red-600/80 leading-tight font-medium">
                      Sua pasta tem{' '}
                      <strong>
                        {photoCount.toLocaleString('pt-BR')} fotos
                      </strong>
                      , mas você tem{' '}
                      <strong>
                        {creditsInPoolForMessage.toLocaleString('pt-BR')}{' '}
                        créditos
                      </strong>{' '}
                      disponíveis na cota de arquivos.
                      {creditsInPoolForMessage === 0 ? (
                        ' Nenhuma foto a mais será exibida'
                      ) : (
                        <>
                          Apenas{' '}
                          <strong>
                            {creditsInPoolForMessage.toLocaleString('pt-BR')}{' '}
                            fotos
                          </strong>{' '}
                          serão exibidas
                        </>
                      )}{' '}
                      nesta galeria.
                    </p>
                  </div>
                </div>
              )}

              {/* Estado 2: acima do alertThreshold — aviso de consumo de cota */}
              {isOverRecommended && (
                <div className="p-2.5 rounded-luxury border bg-amber-50 border-amber-200 flex gap-2.5">
                  <AlertTriangle
                    size={14}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-amber-700">
                      {photoCount} arquivos — acima do recomendado
                    </p>
                    <p className="text-[10px] text-amber-700 leading-tight">
                      O recomendado é{' '}
                      <strong>até {alertThreshold} arquivos</strong> por galeria
                      (máximo do plano: <strong>{hardCap}</strong> por galeria).
                      Com {photoCount} fotos, esta galeria consome {photoCount}{' '}
                      créditos do seu pool de{' '}
                      <strong>{totalPool.toLocaleString('pt-BR')}</strong>.
                      Restam{' '}
                      <strong>
                        {remainingCreditsAfterThis.toLocaleString('pt-BR')}{' '}
                        créditos
                      </strong>{' '}
                      no pool para as próximas galerias. O limite é dinâmico:
                      você pode distribuir esses créditos entre até{' '}
                      {maxGalleriesInPlan} galerias (ex.:{' '}
                      {remainingCreditsAfterThis > 0
                        ? Math.floor(
                            remainingCreditsAfterThis / maxGalleriesInPlan,
                          )
                        : 0}{' '}
                      em cada) ou usar tudo em uma só — aí não haverá cota para
                      novas galerias.
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
                    <p className="text-[9px] font-semibold uppercase text-emerald-700">
                      {photoCount} arquivos — compatível com seu plano
                    </p>
                    <p className="text-[10px] text-emerald-700 leading-tight">
                      Dentro do limite recomendado de{' '}
                      <strong>{alertThreshold} arquivos</strong> por galeria.
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
          <PlanGuard
            feature="keepOriginalFilenames"
            label="Preservar nomes originais"
            variant="mini"
            scenarioType="feature"
            forceShowLock={true}
          >
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
          </PlanGuard>
        </div>
      </div>
    </div>
  );
}
