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
import PasswordInput from '@/components/ui/PasswordInput'; // Import PasswordInput
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { GalleryInteractionFields } from './GalleryInteractionFields';

import { getFolderPhotos } from '@/core/services/google-drive.service';
import {
  GalleryTypeToggle,
  type GalleryTypeValue,
} from '@/components/ui/GalleryTypeToggle';
import { normalizeContractType } from '@/core/types/galeria';

/** default_type do perfil (contract/event/ensaio) → código (CT/CB/ES) */
const DEFAULT_TYPE_TO_CODE: Record<string, GalleryTypeValue> = {
  contract: 'CT',
  event: 'CB',
  ensaio: 'ES',
};

// 🎯 Componente de seção simples (sem accordion) - Estilo Editorial
const FormSection = ({
  title,
  subtitle, // Nova prop para o subtítulo
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
        {icon && <div className="text-petroleum">{icon}</div>}{' '}
        {/* Ícones agora em Gold */}
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

  // Helpers para atualização manual se necessário
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
  const hasContractingClient = galleryType === 'CT';

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
  // 5. USEEFFECTS (LÓGICA DE INICIALIZAÇÃO E SINCRONIZAÇÃO)
  // =========================================================================

  // 🎯 UNIFICADO: Aplicação de padrões (Novas Galerias) e Edição
  useEffect(() => {
    if (profile?.settings?.defaults && !defaultsAppliedRef.current) {
      if (!isEdit) {
        // --- MODO CRIAÇÃO: Aplica Padrões do Perfil ---
        const d = profile.settings.defaults;
        setValue('is_public', d.is_public ?? true);
        setValue('show_on_profile', d.list_on_profile ?? false);
        setValue('leads_enabled', d.enable_guest_registration ?? false);
        setValue('lead_purpose', d.data_treatment_purpose ?? '');
        setValue('enable_favorites', d.enable_favorites ?? true); // 🎯 Preferência Favoritos
        setValue('enable_slideshow', d.enable_slideshow ?? true); // 🎯 Preferência Slideshow

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
        // --- MODO EDIÇÃO: Sincroniza com dados existentes ---
        setValue('enable_favorites', initialData.enable_favorites ?? true);
        setValue('enable_slideshow', initialData.enable_slideshow ?? true);
        setValue('leads_enabled', initialData.leads_enabled ?? false);
        // ... outros campos de edição aqui se necessário
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

  // Constantes de Limite
  const PLAN_LIMIT = permissions.maxPhotosPerGallery;
  const profileRootFolderId =
    profile?.settings?.defaults?.google_drive_root_id || null;
  const canUsePrivate = permissions.privacyLevel !== 'public';
  const canUsePassword = permissions.privacyLevel === 'password';

  // 🎯 PROTEÇÃO: Verifica se useSupabaseSession retorna getAuthDetails corretamente
  const sessionHook = useSupabaseSession();
  const getAuthDetails = sessionHook?.getAuthDetails;

  /**
   * 🎯 Função "cérebro": Valida e processa a seleção do Drive
   * Esta função contém toda a lógica de validação que foi removida do GooglePickerButton
   */

  const handleDriveSelection = async (
    selectedItems: Array<{ id: string; name: string; parentId?: string }>,
  ) => {
    // 1. Validação defensiva: Se o usuário fechar o Picker sem selecionar nada
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

      // 2. Extração de dados do item principal (o primeiro selecionado)
      const selection = selectedItems[0];
      const selectedId = selection.id;

      const isFolder =
        selection.mimeType === 'application/vnd.google-apps.folder';

      let driveFolderId: string | null = null;

      if (isFolder) {
        // Se selecionou uma pasta (comum nas abas Sugestões/Estrela), ela é o próprio alvo
        driveFolderId = selection.id;
      } else if (selection.parentId) {
        // Se selecionou um arquivo e o parentId veio no objeto
        driveFolderId = selection.parentId;
      } else {
        // Fallback total: busca no servidor
        const parentId = await getParentFolderIdServer(selection.id, userId);
        driveFolderId = parentId || selection.id;
      }
      // Validação final do ID da pasta para evitar o erro de 'undefined' no console
      if (!driveFolderId || driveFolderId === 'undefined') {
        throw new Error(
          'Não foi possível identificar a pasta de origem deste item.',
        );
      }

      // 3. 📸 Captura de IDs para Capas (Suporte a múltiplos arquivos)
      const coverIds = selectedItems.map((item) => item.id);

      // 4. 📂 Busca nome oficial da pasta (para exibir na UI)
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

      // 5. ⚖️ Verificação de Limites de Fotos por Galeria (ISR/Vercel Optimization)
      const limitData = await checkFolderLimits(
        driveFolderId,
        userId,
        permissions.maxPhotosPerGallery,
      );

      // 6. 🔒 Verificação de Permissões (LGPD e Segurança de Dados)
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

      // 🎯 LOG DE DEPURAÇÃO: Útil para o seu monitor de 20"
      // console.log('DEBUG DRIVE SELECTION:', {
      //   driveFolderId,
      //   folderPermissionInfo,
      //   coverIds,
      // });

      // if (!folderPermissionInfo.isOwner) {
      //   onPickerError(
      //     'Propriedade inválida: Vincule apenas pastas de sua própria conta.',
      //   );
      //   return;
      // }

      if (!folderPermissionInfo.isPublic) {
        onPickerError(
          `Pasta privada: Altere o acesso no Drive para "Qualquer pessoa com o link" antes de vincular.\nLink: ${folderPermissionInfo.folderLink}`,
        );
        return;
      }

      // 7. ✅ ATUALIZAÇÃO DO ESTADO GLOBAL
      setDriveData({
        id: driveFolderId,
        name: driveFolderName,
        coverId: coverIds[0], // Capa principal (compatibilidade)
        allCovers: coverIds, // Array para o novo carrossel de capas
        photoCount: limitData.totalInDrive || limitData.count,
      });

      setLimitInfo(limitData);
      setPhotoCount(limitData.totalInDrive || limitData.count);
      const photos = await getFolderPhotos(driveFolderId);

      if (limitData.hasMore) setShowLimitModal(true);
    } catch (error: any) {
      // console.error('[handleDriveSelection] Erro crítico:', error);
      onPickerError(
        error?.message || 'Erro ao processar a seleção do Google Drive.',
      );
    } finally {
      setIsValidatingDrive(false);
    }
  };
  /**
   * 🎯 Handler atualizado para receber o array de docs
   */
  const handleFolderSelect = async (items: any) => {
    // Verifique o que está chegando aqui com um log
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

  // Track title changes for header
  const [, setTitleValue] = useState(initialData?.title || '');

  // 🎯 5. APLICAÇÃO DOS PADRÕES NO FORMULÁRIO (Efeito de carregamento)
  useEffect(() => {
    if (!isEdit && profile?.settings?.defaults && !defaultsAppliedRef.current) {
      const defaults = profile.settings.defaults;

      // Sincroniza o estado do react-hook-form com os padrões do perfil
      setValue('is_public', defaults.is_public ?? true, { shouldDirty: false });
      setValue('show_on_profile', defaults.list_on_profile ?? false, {
        shouldDirty: false,
      });
      setValue('leads_enabled', defaults.enable_guest_registration ?? false, {
        shouldDirty: false,
      });
      setValue('lead_purpose', defaults.data_treatment_purpose ?? '', {
        shouldDirty: false,
      });

      setValue('enable_favorites', defaults.enable_favorites ?? true, {
        shouldDirty: false,
      });
      setValue('enable_slideshow', defaults.enable_slideshow ?? true, {
        shouldDirty: false,
      });
      // Design
      if (setCustomization) {
        setCustomization.setGridBgColor(defaults.background_color ?? '#FFFFFF');
        setCustomization.setShowCoverInGrid(!!defaults.background_photo);
        setCustomization.setColumns({
          mobile: defaults.grid_mobile ?? 2,
          tablet: defaults.grid_tablet ?? 3,
          desktop: defaults.grid_desktop ?? 4,
        });
      }
      defaultsAppliedRef.current = true;
    }
  }, [profile, isEdit, setValue, setCustomization]);

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

            {/* 🎯 NOVO: Array de IDs das fotos de capa selecionadas */}
            <input
              type="hidden"
              name="cover_image_ids"
              value={JSON.stringify(
                driveData.allCovers ||
                  (driveData.coverId ? [driveData.coverId] : []),
              )}
            />

            {/* 🎯 NOVO: Quantidade de fotos para salvar na tb_galerias */}
            <input
              type="hidden"
              name="photo_count"
              value={driveData.photoCount || 0}
            />

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
              icon={<Settings2 size={14} className="text-gold" />} // Ícone mais genérico de configuração
            >
              <fieldset>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  {/* Seletor de Tipo */}
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

                  {/* Área Dinâmica baseada no Tipo */}
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
              {/* Detalhes da Galeria - Primeira Linha */}
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
                    initialCustomCategories={customCategoriesFromProfile} // Dados vindos do JSON do banco
                  />
                </div>
              </div>

              {/* Segunda Linha */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-3">
                <div className="md:col-span-6">
                  <label className="mb-1.5">
                    <Calendar
                      size={12}
                      strokeWidth={2}
                      className=" text-gold"
                    />{' '}
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
            <fieldset>
              <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-x-12">
                {/* ACESSO */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label>
                      <Shield size={12} className=" text-gold" /> Acesso à
                      Galeria
                    </label>
                    <InfoTooltip
                      title="Acesso restrito"
                      content="Para acessar uma galeria protegida por senha, o visitante deve informar a senha cadastrada nesta tela. Sem senha, qualquer pessoa com o link pode acessar. Com senha, apenas quem informar a senha correta terá acesso."
                      width="w-48"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-slate-50 rounded-[0.4rem] border border-slate-200 p-1 gap-1 w-40 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsPublic(true)}
                        className={`flex-1 py-1 rounded-[0.3rem] text-[9px] font-semibold uppercase tracking-luxury-widest transition-all ${isPublic ? 'bg-champagne  shadow-sm' : 'text-slate-400'}`}
                      >
                        Público
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPublic(false);
                        }}
                        className={`flex-1 py-1 rounded-[0.3rem] text-[9px] font-semibold uppercase tracking-luxury-widest transition-all ${!isPublic ? 'bg-champagne  shadow-sm' : 'text-petroleum/60 dark:text-slate-400'}`}
                      >
                        Privado
                      </button>
                    </div>
                    {!isPublic && (
                      <PlanGuard
                        feature="privacyLevel"
                        label="Proteção por Senha"
                      >
                        <div className="relative group w-32">
                          <PasswordInput
                            name="password"
                            disabled={!canUsePassword}
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            minLength={4}
                            maxLength={6}
                            defaultValue={initialData?.password || ''}
                            required
                            placeholder="Senha"
                            onChange={(e) => {
                              e.target.value = e.target.value.replace(
                                /\D/g,
                                '',
                              );
                            }}
                          />
                        </div>
                      </PlanGuard>
                    )}
                  </div>
                </div>

                {/* LISTAGEM NO PERFIL - Também pode ser protegida pelo profileListLimit */}
                <PlanGuard
                  feature="profileLevel" // Planos básicos podem ter limitações aqui
                  label="Listar no Perfil"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label>
                        <Eye size={12} className="  text-gold" /> Listar no
                        Perfil
                      </label>
                      <InfoTooltip
                        title="Exibir galeria no seu perfil"
                        content="Se ativado, esta galeria será visível na sua página de perfil pública para todos os visitantes."
                        width="w-48"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowOnProfile(!showOnProfile)}
                      className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showOnProfile ? 'bg-gold' : 'bg-slate-200'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${showOnProfile ? 'translate-x-4' : ''}`}
                      />
                    </button>
                  </div>
                </PlanGuard>
              </div>
              {/* Renderizar o UpgradeModal no final do componente pai */}
              <UpgradeModal
                isOpen={!!upsellFeature}
                onClose={() => setUpsellFeature(null)}
                featureName={upsellFeature?.label || ''}
                featureKey={upsellFeature?.feature as any} // Passa a chave técnica
                scenarioType="feature"
              />
            </fieldset>
          </FormSection>

          {/* SEÇÃO NOVA: CAPTURA DE LEADS */}

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

          {/* SEÇÃO 4: CUSTOMIZAÇÃO VISUAL */}

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
          {/* SEÇÃO: INTERAÇÃO (Experiência do Visitante) */}
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
        <div className="w-full lg:w-[35%] border-t lg:border-t-0 lg:border-l border-slate-200 pl-0 lg:pl-2 space-y-4 bg-slate-50/30  px-2 pb-6">
          {/* GOOGLE DRIVE - Seção Principal */}
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
          />

          {/*LINKS E ARQUIVOS */}
          <div className="bg-white rounded-luxury border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Download size={14} className="text-gold" />
              <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
                links e arquivos de entrega
              </h3>
            </div>

            <div className="space-y-4">
              {/* input oculto para persistência em JSON */}
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
                      {/* 🎯 Uso do Mini PlanGuard no Input de Label */}
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

                      {/* Input de URL - 70% de largura (Sempre liberado por padrão) */}
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
    </>
  );
}
