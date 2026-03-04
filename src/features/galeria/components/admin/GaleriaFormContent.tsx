'use client';

import { useEffect, useState, useRef } from 'react';
import { maskPhone } from '@/core/utils/masks-helpers';
import { CategorySelect } from '@/components/galeria';
import { useSupabaseSession } from '@photos/core-auth';
import {
  getParentFolderIdServer,
  getDriveFolderName,
  checkFolderPublicPermission,
  checkFolderLimits,
} from '@/actions/google.actions';
import {
  Lock,
  Calendar,
  MapPin,
  User,
  Type,
  FolderSync,
  Tag,
  Layout,
  Eye,
  CheckCircle2,
  Download,
  Plus,
  Trash2,
  Users,
  Shield,
  ShieldCheck,
  PlayCircle,
  Settings2,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { convertToDirectDownloadUrl } from '@/core/utils/url-helper';
import { LimitUpgradeModal } from '@/components/ui/LimitUpgradeModal';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { GalleryDesignFields } from './GaleriaDesignFields';
import { LeadCaptureSection } from '@/components/ui/LeadCaptureSection';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { GaleriaDriveSection } from './GaleriaDriveSection';
import { usePlan } from '@/core/context/PlanContext';
import UpgradeModal from '@/components/ui/UpgradeModal';
import PasswordInput from '@/components/ui/PasswordInput';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { GalleryInteractionFields } from './GalleryInteractionFields';
import { getFolderPhotos } from '@/core/services/google-drive.service';
import {
  GalleryTypeToggle,
  type GalleryTypeValue,
} from '@/components/ui/GalleryTypeToggle';
import { normalizeContractType } from '@/core/types/galeria';
import { ThemeKey, ThemeSelector } from '@/components/ui/ThemeSelector';

/** default_type do perfil (contract/event/ensaio) → código (CT/CB/ES) */
const DEFAULT_TYPE_TO_CODE: Record<string, GalleryTypeValue> = {
  contract: 'CT',
  event: 'CB',
  ensaio: 'ES',
};

// Componente de seção simples — Estilo Editorial
const FormSection = ({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-luxury border border-slate-400 p-4 space-y-3">
    <div className="flex flex-col gap-1 pb-2 border-b border-slate-200">
      <div className="flex items-center gap-2">
        {icon && <div className="text-petroleum">{icon}</div>}
        <h3 className="text-[10px] font-bold uppercase tracking-luxury-wide text-petroleum dark:text-slate-700">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] text-petroleum italic font-semibold">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    <div className="pl-0">{children}</div>
  </div>
);

export default function GaleriaFormContent({
  initialData = null,
  isEdit = false,
  customization,
  setCustomization,
  onPickerError,
  onTokenExpired,
  onTitleChange,
  profile,
  register,
  setValue,
  watch,
  // ─── Pool de cota ────────────────────────────────────────────────────────
  // Total de fotos publicadas em TODAS as galerias do usuário.
  // Usado por GaleriaDriveSection para calcular o impacto desta galeria no
  // pool dinâmico de galerias (calcEffectiveMaxGalleries).
  // Fallback 0 para não quebrar enquanto o pai não implementa a prop.
  usedPhotoCredits = 0,
  // Número de galerias ativas atualmente.
  // Fallback 0 para o mesmo motivo.
  activeGalleryCount = 0,
}) {
  // =========================================================================
  // 1. REFS E CONTEXTOS
  // =========================================================================
  const defaultsAppliedRef = useRef(false);
  const { permissions, canAddMore } = usePlan();

  // =========================================================================
  // 2. ESTADOS DE INTERFACE E MODAIS
  // =========================================================================
  const [upsellFeature, setUpsellFeature] = useState<{
    label: string;
    feature: string;
  } | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [, setLimitInfo] = useState({ count: 0, hasMore: false });
  const [isValidatingDrive, setIsValidatingDrive] = useState(false);

  // =========================================================================
  // 3. ESTADOS SINCRONIZADOS (WATCH / REACT-HOOK-FORM)
  // =========================================================================
  const leadsEnabled = watch('leads_enabled');
  const enableFavorites = watch('enable_favorites');
  const enableSlideshow = watch('enable_slideshow');

  const setLeadsEnabled = (val: boolean) =>
    setValue('leads_enabled', val, { shouldDirty: true });
  const setEnableFavorites = (val: boolean) =>
    setValue('enable_favorites', val, { shouldDirty: true });
  const setEnableSlideshow = (val: boolean) =>
    setValue('enable_slideshow', val, { shouldDirty: true });

  // =========================================================================
  // 4. ESTADOS LOCAIS DE DADOS (UI STATE)
  // =========================================================================
  const [showOnProfile, setShowOnProfile] = useState(() => {
    if (initialData)
      return (
        initialData.show_on_profile === true ||
        initialData.show_on_profile === 'true'
      );
    return profile?.settings?.defaults?.list_on_profile ?? false;
  });

  const [requiredGuestFields, setRequiredGuestFields] = useState<string[]>(
    () => {
      if (initialData) {
        const fields = [];
        if (initialData.leads_require_name) fields.push('name');
        if (initialData.leads_require_email) fields.push('email');
        if (initialData.leads_require_whatsapp) fields.push('whatsapp');
        return fields.length > 0 ? fields : ['name', 'whatsapp'];
      }
      return (
        profile?.settings?.defaults?.required_guest_fields ?? [
          'name',
          'whatsapp',
        ]
      );
    },
  );

  const [galleryTheme, setGalleryTheme] = useState<ThemeKey>(
    initialData?.theme_key ||
      process.env.NEXT_PUBLIC_APP_SEGMENT ||
      'PHOTOGRAPHER',
  );

  const [renameFilesSequential, setRenameFilesSequential] = useState(() => {
    if (initialData)
      return (
        initialData.rename_files_sequential === true ||
        initialData.rename_files_sequential === 'true'
      );
    return profile?.settings?.defaults?.rename_files_sequential ?? true;
  });

  const [galleryType, setGalleryType] = useState<GalleryTypeValue>(() => {
    if (isEdit) {
      return normalizeContractType(initialData?.has_contracting_client);
    }
    const defaultType = profile?.settings?.display?.default_type;
    return (defaultType && DEFAULT_TYPE_TO_CODE[defaultType]) || 'CT';
  });

  const today = new Date().toISOString().split('T')[0];

  const [isPublic, setIsPublic] = useState(() => {
    if (initialData)
      return initialData.is_public === true || initialData.is_public === 'true';
    return profile?.settings?.defaults?.is_public ?? true;
  });

  const [category, setCategory] = useState(() => initialData?.category ?? '');
  const customCategoriesFromProfile = profile?.custom_categories || [];

  const [clientWhatsapp, setClientWhatsapp] = useState(() =>
    initialData?.client_whatsapp
      ? maskPhone({ target: { value: initialData.client_whatsapp } } as any)
      : '',
  );

  const [driveData, setDriveData] = useState({
    id: initialData?.drive_folder_id ?? '',
    name: initialData?.drive_folder_name ?? 'Nenhuma pasta selecionada',
    coverId: initialData?.cover_image_url ?? '',
    allCovers: initialData?.cover_image_ids || [],
    photoCount: initialData?.photo_count || 0,
  });

  const [links, setLinks] = useState<{ url: string; label: string }[]>(() => {
    if (initialData?.zip_url_full) {
      try {
        const parsed = JSON.parse(initialData.zip_url_full);
        return Array.isArray(parsed)
          ? parsed.map((item, idx) => ({
              url: typeof item === 'string' ? item : item.url || '',
              label:
                typeof item === 'string'
                  ? `LINK ${idx + 1}`
                  : item.label || `LINK ${idx + 1}`,
            }))
          : [];
      } catch {
        return [{ url: initialData.zip_url_full, label: 'LINK 1' }];
      }
    }
    return [];
  });

  const [photoCount, setPhotoCount] = useState<number | null>(
    initialData?.photo_count ?? null,
  );

  // =========================================================================
  // 5. USEEFFECTS
  // =========================================================================

  useEffect(() => {
    if (profile?.settings?.defaults && !defaultsAppliedRef.current) {
      if (!isEdit) {
        const d = profile.settings.defaults;
        setValue('is_public', d.is_public ?? true);
        setValue('show_on_profile', d.list_on_profile ?? false);
        setValue('leads_enabled', d.enable_guest_registration ?? false);
        setValue('lead_purpose', d.data_treatment_purpose ?? '');
        setValue('enable_favorites', d.enable_favorites ?? true);
        setValue('enable_slideshow', d.enable_slideshow ?? true);

        if (setCustomization) {
          setCustomization.setGridBgColor(d.background_color ?? '#FFFFFF');
          setCustomization.setShowCoverInGrid(!!d.background_photo);
          setCustomization.setColumns({
            mobile: d.grid_mobile ?? 2,
            tablet: d.grid_tablet ?? 3,
            desktop: d.grid_desktop ?? 4,
          });
        }
      } else if (initialData) {
        setValue('enable_favorites', initialData.enable_favorites ?? true);
        setValue('enable_slideshow', initialData.enable_slideshow ?? true);
        setValue('leads_enabled', initialData.leads_enabled ?? false);
      }
      defaultsAppliedRef.current = true;
    }
  }, [profile, isEdit, initialData, setValue, setCustomization]);

  // Consistência de Leads
  useEffect(() => {
    if (leadsEnabled && requiredGuestFields.length === 0) {
      setRequiredGuestFields(['name', 'whatsapp']);
    }
  }, [leadsEnabled, requiredGuestFields]);

  // Sincronização de fotos na edição
  useEffect(() => {
    if (isEdit && initialData?.photo_count) {
      setPhotoCount(initialData.photo_count);
      setDriveData((prev) => ({
        ...prev,
        photoCount: initialData.photo_count,
      }));
    }
  }, [initialData, isEdit]);

  // =========================================================================
  // 6. CONSTANTES DERIVADAS
  // =========================================================================
  const PLAN_LIMIT = permissions.maxPhotosPerGallery;
  const profileRootFolderId =
    profile?.settings?.defaults?.google_drive_root_id || null;
  const canUsePrivate = permissions.privacyLevel !== 'public';
  const canUsePassword = permissions.privacyLevel === 'password';

  // ─── Pool: créditos usados por OUTRAS galerias ───────────────────────────
  // Em modo edição, as fotos desta galeria já estão contadas em usedPhotoCredits
  // (passados pelo pai), portanto subtraímos para evitar dupla contagem.
  const usedCreditsExcludingThis = isEdit
    ? Math.max(0, usedPhotoCredits - (initialData?.photo_count ?? 0))
    : usedPhotoCredits;

  // ─── Pool: galerias ativas excluindo esta em modo edição ─────────────────
  // Em edição, esta galeria já existe no total — não deve ser contada como "nova".
  const activeGalleriesExcludingThis = isEdit
    ? Math.max(0, activeGalleryCount - 1)
    : activeGalleryCount;

  const sessionHook = useSupabaseSession();
  const getAuthDetails = sessionHook?.getAuthDetails;

  // =========================================================================
  // 7. HANDLERS
  // =========================================================================

  const handleDriveSelection = async (
    selectedItems: Array<{ id: string; name: string; parentId?: string }>,
  ) => {
    if (
      !selectedItems ||
      !Array.isArray(selectedItems) ||
      selectedItems.length === 0
    ) {
      console.warn('[handleDriveSelection] Seleção vazia ou cancelada');
      return;
    }

    setIsValidatingDrive(true);

    try {
      if (!getAuthDetails) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }

      const { userId } = await getAuthDetails();
      const selection = selectedItems[0];
      const selectedId = selection.id;

      const isFolder =
        selection.mimeType === 'application/vnd.google-apps.folder';

      let driveFolderId: string | null = null;

      if (isFolder) {
        driveFolderId = selection.id;
      } else if (selection.parentId) {
        driveFolderId = selection.parentId;
      } else {
        const parentId = await getParentFolderIdServer(selection.id, userId);
        driveFolderId = parentId || selection.id;
      }

      if (!driveFolderId || driveFolderId === 'undefined') {
        throw new Error(
          'Não foi possível identificar a pasta de origem deste item.',
        );
      }

      const coverIds = selectedItems.map((item) => item.id);

      let driveFolderName = selection.name;
      try {
        const folderName = await getDriveFolderName(driveFolderId, userId);
        if (folderName) driveFolderName = folderName;
      } catch (error) {
        console.warn(
          '[handleDriveSelection] Erro ao buscar nome oficial, usando nome do item.',
          error,
        );
      }

      const limitData = await checkFolderLimits(
        driveFolderId,
        userId,
        permissions.maxPhotosPerGallery,
      );

      let folderPermissionInfo;
      try {
        folderPermissionInfo = await checkFolderPublicPermission(
          driveFolderId,
          userId,
        );
      } catch (error) {
        folderPermissionInfo = {
          isPublic: false,
          isOwner: false,
          folderLink: `https://drive.google.com/drive/folders/${driveFolderId}`,
        };
      }

      if (!folderPermissionInfo.isPublic) {
        onPickerError(
          'Pasta privada: Altere o acesso no Drive para "Qualquer pessoa com o link" antes de vincular.',
          folderPermissionInfo.folderLink,
        );
        return;
      }

      setDriveData({
        id: driveFolderId,
        name: driveFolderName,
        coverId: coverIds[0],
        allCovers: coverIds,
        photoCount: limitData.totalInDrive || limitData.count,
      });

      setLimitInfo(limitData);
      setPhotoCount(limitData.totalInDrive || limitData.count);
      await getFolderPhotos(driveFolderId);

      if (limitData.hasMore) setShowLimitModal(true);
    } catch (error: any) {
      onPickerError(
        error?.message || 'Erro ao processar a seleção do Google Drive.',
      );
    } finally {
      setIsValidatingDrive(false);
    }
  };

  const handleFolderSelect = async (items: any) => {
    console.log('Dados chegando no handleFolderSelect:', items);
    return await handleDriveSelection(items);
  };

  // Preview de capa
  const {
    imgSrc: coverPreviewUrl,
    imgRef,
    handleLoad,
    handleError,
  } = useGoogleDriveImage({
    photoId: driveData.coverId || driveData.id || '',
    width: '400',
    priority: false,
    fallbackToProxy: false,
    useProxyDirectly: true,
  });

  const [, setTitleValue] = useState(initialData?.title || '');

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-2">
        {/* COLUNA PRINCIPAL (65%) */}
        <div className="w-full lg:w-[65%] relative z-10 space-y-3 pb-2">
          {/* INPUTS OCULTOS */}
          <div className="hidden">
            <input type="hidden" name="drive_folder_id" value={driveData.id} />
            <input
              type="hidden"
              name="drive_folder_name"
              value={driveData.name}
            />
            <input
              type="hidden"
              name="show_on_profile"
              value={String(showOnProfile)}
            />
            <input
              type="hidden"
              name="cover_image_url"
              value={driveData.coverId || driveData.id}
            />
            <input
              type="hidden"
              name="cover_image_ids"
              value={JSON.stringify(
                driveData.allCovers ||
                  (driveData.coverId ? [driveData.coverId] : []),
              )}
            />
            <input
              type="hidden"
              name="photo_count"
              value={driveData.photoCount || 0}
            />
            <input type="hidden" name="theme_key" value={galleryTheme} />
            <input type="hidden" name="is_public" value={String(isPublic)} />
            <input type="hidden" name="category" value={category} />
            <input
              type="hidden"
              name="has_contracting_client"
              value={galleryType}
            />
            <input
              type="hidden"
              name="show_cover_in_grid"
              value={String(customization.showCoverInGrid)}
            />
            <input
              type="hidden"
              name="grid_bg_color"
              value={customization.gridBgColor}
            />
            <input
              type="hidden"
              name="columns_mobile"
              value={String(customization.columns.mobile)}
            />
            <input
              type="hidden"
              name="columns_tablet"
              value={String(customization.columns.tablet)}
            />
            <input
              type="hidden"
              name="columns_desktop"
              value={String(customization.columns.desktop)}
            />
            <input
              type="hidden"
              name="leads_enabled"
              value={String(leadsEnabled)}
            />
            <input
              type="hidden"
              name="leads_require_name"
              data-testid="leads_require_name"
              value={String(requiredGuestFields.includes('name'))}
            />
            <input
              type="hidden"
              name="leads_require_email"
              data-testid="leads_require_email"
              value={String(requiredGuestFields.includes('email'))}
            />
            <input
              type="hidden"
              name="leads_require_whatsapp"
              data-testid="leads_require_whatsapp"
              value={String(requiredGuestFields.includes('whatsapp'))}
            />
            <input
              type="hidden"
              name="rename_files_sequential"
              value={String(renameFilesSequential)}
            />
            <input
              type="hidden"
              name="enable_favorites"
              value={String(enableFavorites)}
            />
            <input
              type="hidden"
              name="enable_slideshow"
              value={String(enableSlideshow)}
            />
          </div>

          {/* SEÇÃO 1: IDENTIFICAÇÃO */}
          {profile?.settings?.display?.show_contract_type !== false && (
            <FormSection
              title="Modalidade"
              icon={<Settings2 size={14} className="text-gold" />}
            >
              <fieldset>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-4">
                    <GalleryTypeToggle
                      label="Tipo de galeria"
                      value={galleryType}
                      onChange={setGalleryType}
                      disabledContract={
                        profile?.settings?.display?.show_contract_type === false
                      }
                    />
                  </div>

                  {galleryType === 'CB' ? (
                    <div className="md:col-span-8 h-11 flex items-center px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-lg">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 italic">
                        Esta modalidade gera um link público. Vinculação de
                        cliente desativada.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="md:col-span-5 animate-in fade-in slide-in-from-left-2 duration-300">
                        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                          <User size={12} className="text-gold" /> Cliente
                        </label>
                        <input
                          name="client_name"
                          defaultValue={initialData?.client_name}
                          required
                          placeholder="Nome do cliente"
                          className="input-luxury"
                        />
                      </div>
                      <div className="md:col-span-3 animate-in fade-in slide-in-from-left-3 duration-500">
                        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                          <WhatsAppIcon className="w-3 h-3 text-gold" />{' '}
                          WhatsApp
                        </label>
                        <input
                          value={clientWhatsapp}
                          name="client_whatsapp"
                          onChange={(e) => setClientWhatsapp(maskPhone(e))}
                          placeholder="(00) 00000-0000"
                          className="input-luxury"
                        />
                      </div>
                    </>
                  )}
                </div>
              </fieldset>
            </FormSection>
          )}

          {/* SEÇÃO 2: GALERIA & SINCRONIZAÇÃO */}
          <FormSection
            title="Galeria & Sincronização"
            icon={<FolderSync size={14} className="text-gold" />}
          >
            <fieldset>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-3">
                <div className="md:col-span-6">
                  <label className="mb-1.5">
                    <Type size={12} className="text-gold" /> Título
                  </label>
                  <input
                    name="title"
                    defaultValue={initialData?.title}
                    required
                    placeholder="Ex: Wedding Day"
                    onChange={(e) => {
                      setTitleValue(e.target.value);
                      onTitleChange?.(e.target.value);
                    }}
                    className="w-full px-3 h-10 bg-white border border-slate-200 rounded-luxury text-petroleum/90 text-[13px] font-medium outline-none focus:border-gold transition-all"
                  />
                </div>
                <div className="md:col-span-6">
                  <label className="mb-1.5">
                    <Tag size={12} className="text-gold" /> Categoria
                  </label>
                  <CategorySelect
                    value={category}
                    onChange={setCategory}
                    initialCustomCategories={customCategoriesFromProfile}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-3">
                <div className="md:col-span-6">
                  <label className="mb-1.5">
                    <Calendar size={12} strokeWidth={2} className="text-gold" />{' '}
                    Data
                  </label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={initialData?.date}
                    required
                    className="input-luxury"
                  />
                </div>
                <div className="md:col-span-6">
                  <label className="mb-1.5">
                    <MapPin size={12} className="text-gold" /> Local
                  </label>
                  <input
                    name="location"
                    defaultValue={initialData?.location}
                    placeholder="Cidade/UF"
                    className="input-luxury"
                  />
                </div>
              </div>
            </fieldset>
          </FormSection>

          {/* SEÇÃO 3: PRIVACIDADE */}
          <FormSection
            title="Privacidade"
            icon={<ShieldCheck size={14} className="text-gold" />}
          >
            <fieldset className="w-full">
              <div className="flex flex-wrap items-stretch gap-2 w-full">
                <div className="flex-[1.8] flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-14 w-full">
                  <div className="flex items-center gap-2 shrink-0">
                    <label>
                      <Shield
                        size={14}
                        className={
                          !isPublic ? 'text-gold' : 'text-petroleum/40'
                        }
                      />
                      Acesso
                    </label>
                    <InfoTooltip
                      title="Acesso restrito"
                      content="Para acessar uma galeria protegida por senha, o visitante deve informar a senha cadastrada nesta tela. Sem senha, qualquer pessoa com o link pode acessar. Com senha, apenas quem informar a senha correta terá acesso."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 rounded-[0.4rem] p-0.5 gap-0.5 w-[150px] shrink-0 h-9">
                      <button
                        type="button"
                        onClick={() => setIsPublic(true)}
                        className={`flex-1 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-tighter ${isPublic ? 'bg-champagne shadow-sm' : 'text-slate-400'}`}
                      >
                        Público
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPublic(false)}
                        className={`flex-1 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-tighter ${!isPublic ? 'bg-champagne shadow-sm' : 'text-petroleum/60'}`}
                      >
                        Privado
                      </button>
                    </div>

                    <div
                      className={`flex items-center gap-1 transition-all duration-300 w-[100px] ${isPublic ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100'}`}
                    >
                      <PlanGuard feature="privacyLevel" label="Senha">
                        <PasswordInput
                          name="password"
                          disabled={isPublic}
                          defaultValue={initialData?.password || ''}
                          placeholder="PIN"
                          className="h-9"
                          style={{ width: '64px', minWidth: '64px' }}
                        />
                      </PlanGuard>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-14 w-full gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <label>
                      <Calendar size={14} className="text-gold" />
                      Expiração
                    </label>
                    <InfoTooltip
                      content="Se ativada, a galeria ficará indisponível para acesso após esta data."
                      title="Expiração"
                    />
                  </div>

                  <PlanGuard feature="expiresAt" label="Expiração">
                    <input
                      type="date"
                      name="expires_at"
                      min={today}
                      defaultValue={
                        initialData?.expires_at
                          ? String(initialData.expires_at).slice(0, 10)
                          : ''
                      }
                      disabled={!permissions.expiresAt}
                      className="input-luxury w-[115px] !px-2"
                    />
                  </PlanGuard>
                </div>

                <div className="flex-none w-full md:w-[230px] flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-14">
                  <div className="flex items-center gap-2 shrink-0">
                    <label>
                      <Eye
                        size={14}
                        className={
                          showOnProfile ? 'text-gold' : 'text-petroleum/40'
                        }
                      />
                      Listar no Perfil
                    </label>
                    <InfoTooltip
                      content="Se ativado, esta galeria será visível na sua página de perfil pública para todos os visitantes."
                      title="Listar no Perfil"
                    />
                  </div>

                  <PlanGuard feature="profileLevel" label="Perfil">
                    <button
                      type="button"
                      onClick={() => setShowOnProfile(!showOnProfile)}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${showOnProfile ? 'bg-gold' : 'bg-slate-200'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${showOnProfile ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  </PlanGuard>
                </div>
              </div>
            </fieldset>
          </FormSection>

          {/* SEÇÃO: CADASTRO DE VISITANTE */}
          <FormSection
            title="Cadastro de visitante"
            icon={<Users size={14} className="text-gold" />}
          >
            <fieldset>
              <LeadCaptureSection
                enabled={leadsEnabled}
                setEnabled={setLeadsEnabled}
                requiredFields={requiredGuestFields}
                setRequiredFields={setRequiredGuestFields}
                register={register}
                setValue={setValue}
                watch={watch}
                purposeFieldName="lead_purpose"
                initialPurposeValue={initialData?.lead_purpose}
                toggleLabel="Habilitar cadastro de visitante para visualizar a galeria"
                description="Aumente sua base de contatos exigindo dados básicos antes dos clientes visualizarem as fotos."
                isEdit={isEdit}
                showLayout="stacked"
              />
            </fieldset>
          </FormSection>

          {/* SEÇÃO: DESIGN DA GALERIA */}
          <FormSection
            title="Design da Galeria"
            subtitle="Personalize a experiência visual do visitante"
            icon={<Layout size={14} className="text-gold" />}
          >
            <fieldset>
              <GalleryDesignFields
                showBackgroundPhoto={customization.showCoverInGrid}
                setShowBackgroundPhoto={setCustomization.setShowCoverInGrid}
                backgroundColor={customization.gridBgColor}
                setBackgroundColor={setCustomization.setGridBgColor}
                columns={customization.columns}
                setColumns={setCustomization.setColumns}
              />
            </fieldset>
          </FormSection>

          {/* SEÇÃO: INTERAÇÃO & EXPERIÊNCIA */}
          <FormSection
            title="Interação & Experiência"
            subtitle="Recursos para o visitante usar na galeria"
            icon={<PlayCircle size={14} className="text-gold" />}
          >
            <fieldset>
              <GalleryInteractionFields
                enableFavorites={enableFavorites}
                setEnableFavorites={setEnableFavorites}
                enableSlideshow={enableSlideshow}
                setEnableSlideshow={setEnableSlideshow}
              />
            </fieldset>
          </FormSection>
        </div>

        {/* COLUNA LATERAL (35%) */}
        <div className="w-full lg:w-[35%] border-t lg:border-t-0 lg:border-l border-slate-200 pl-0 lg:pl-2 space-y-4 bg-slate-50/30 px-2 pb-6">
          {/* GOOGLE DRIVE */}
          <GaleriaDriveSection
            driveData={driveData}
            handleFolderSelect={handleFolderSelect}
            onPickerError={onPickerError}
            onTokenExpired={onTokenExpired}
            isValidatingDrive={isValidatingDrive}
            renameFilesSequential={renameFilesSequential}
            setRenameFilesSequential={setRenameFilesSequential}
            setDriveData={setDriveData}
            rootFolderId={profileRootFolderId}
            // ── Pool de cota ────────────────────────────────────────────────
            // Em edição, subtraímos as fotos desta galeria para não contar em dobro:
            // o pai passa o total geral, e ajustamos aqui para refletir o estado
            // "antes de salvar esta galeria".
            usedPhotoCredits={usedCreditsExcludingThis}
            activeGalleryCount={activeGalleriesExcludingThis}
          />

          {/* TEMA VISUAL */}
          <div className="bg-white rounded-luxury border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Sparkles size={14} className="text-gold" />
              <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
                Tema Visual
              </h3>
            </div>
            <ThemeSelector
              currentTheme={galleryTheme}
              onConfirm={(theme) => setGalleryTheme(theme)}
              confirmLabel="Aplicar à Galeria"
              compact
            />
          </div>

          {/* LINKS E ARQUIVOS */}
          <div className="bg-white rounded-luxury border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Download size={14} className="text-gold" />
              <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
                links e arquivos de entrega
              </h3>
            </div>

            <div className="space-y-4">
              <input
                type="hidden"
                name="zip_url_full"
                value={links.length > 0 ? JSON.stringify(links) : ''}
              />

              <div className="space-y-3">
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 space-y-2 animate-in fade-in slide-in-from-right-2 duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-petroleum uppercase tracking-luxury-widest">
                        recurso #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setLinks(links.filter((_, i) => i !== index))
                        }
                        className="text-petroleum/70 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex flex-row items-center gap-2">
                      <div className="w-[30%]">
                        <PlanGuard
                          feature="canCustomLinkLabel"
                          variant="mini"
                          label="Nome Customizado"
                        >
                          <input
                            type="text"
                            required
                            value={link.label}
                            minLength={3}
                            maxLength={20}
                            placeholder={`LINK ${index + 1}`}
                            onChange={(e) => {
                              const newLinks = [...links];
                              newLinks[index].label = e.target.value;
                              setLinks(newLinks);
                            }}
                            className="input-luxury"
                          />
                        </PlanGuard>
                      </div>

                      <div className="relative w-[70%]">
                        <input
                          type="url"
                          required
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...links];
                            newLinks[index].url = convertToDirectDownloadUrl(
                              e.target.value,
                            );
                            setLinks(newLinks);
                          }}
                          placeholder="https://link..."
                          className="input-luxury"
                        />
                        {link.url && (
                          <CheckCircle2
                            size={12}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn-luxury-primary text-[9px]"
                onClick={() => {
                  if (canAddMore('maxExternalLinks', links.length)) {
                    setLinks([
                      ...links,
                      { url: '', label: `LINK ${links.length + 1}` },
                    ]);
                  } else {
                    setUpsellFeature({
                      label: 'Mais Links de Entrega',
                      feature: 'maxExternalLinks',
                    });
                  }
                }}
              >
                {canAddMore('maxExternalLinks', links.length) ? (
                  <>
                    <Plus size={14} /> adicionar link
                  </>
                ) : (
                  <>
                    <Lock size={14} className="text-gold" /> Limite atingido
                    (Upgrade)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <LimitUpgradeModal
          isOpen={showLimitModal}
          photoCount={photoCount}
          onClose={() => setShowLimitModal(false)}
          planLimit={PLAN_LIMIT}
        />
      </div>

      {upsellFeature && (
        <UpgradeModal
          isOpen={!!upsellFeature}
          onClose={() => setUpsellFeature(null)}
          featureName={upsellFeature.label}
          featureKey={upsellFeature.feature as any}
          scenarioType="limit"
        />
      )}
    </>
  );
}
