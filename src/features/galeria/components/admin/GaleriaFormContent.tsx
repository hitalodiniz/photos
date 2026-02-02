'use client';

import { useEffect, useState } from 'react';
import { maskPhone } from '@/core/utils/masks-helpers';
import { GooglePickerButton } from '@/components/google-drive';
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
  Briefcase,
  Tag,
  Layout,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  EyeOff,
  CheckCircle2,
  Download,
  Database,
  Image as ImageIcon,
  Plus,
  Trash2,
  Users,
  Loader2,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { convertToDirectDownloadUrl } from '@/core/utils/url-helper';
import { LimitUpgradeModal } from '@/components/ui/LimitUpgradeModal';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { GalleryDesignFields } from './GaleriaDesignFields';
import { LGPDPurposeField } from '@/components/ui/LGPDPurposeField';
import { LeadCaptureSection } from '@/components/ui/LeadCaptureSection';
import { div } from 'framer-motion/client';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { GaleriaDriveSection } from './GaleriaDriveSection';
import { usePlan } from '@/core/context/PlanContext';
import UpgradeModal from '@/components/ui/UpgradeModal';

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
  <div className="bg-white rounded-luxury border border-petroleum/40 p-4 space-y-3">
    <div className="flex flex-col gap-1 pb-2 border-b border-petroleum/40">
      <div className="flex items-center gap-2">
        {icon && <div className="text-petroleum">{icon}</div>}{' '}
        {/* Ícones agora em Gold */}
        <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum dark:text-slate-700">
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
  // Lógica de permissão de acesso
  const { permissions, canAddMore } = usePlan(profile?.plan_key);
  const [upsellFeature, setUpsellFeature] = useState<{
    label: string;
    feature: string;
  } | null>(null);
  const canUsePrivate = permissions.privacyLevel !== 'public';
  const canUsePassword = ['password', 'expiration'].includes(
    permissions.privacyLevel,
  );

  const [showPassword, setShowPassword] = useState(false);
  const [, setLimitInfo] = useState({ count: 0, hasMore: false });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showOnProfile, setShowOnProfile] = useState(() => {
    if (initialData)
      return (
        initialData.show_on_profile === true ||
        initialData.show_on_profile === 'true'
      );
    return profile?.settings?.defaults?.list_on_profile ?? false; // Por padrão, não exibe no perfil
  });

  const leadsEnabled = watch('leads_enabled');
  const setLeadsEnabled = (val: boolean) =>
    setValue('leads_enabled', val, { shouldDirty: true });

  const [requiredGuestFields, setRequiredGuestFields] = useState<string[]>(
    () => {
      if (initialData) {
        const fields = [];
        if (
          initialData.leads_require_name === true ||
          initialData.leads_require_name === 'true'
        )
          fields.push('name');
        if (
          initialData.leads_require_email === true ||
          initialData.leads_require_email === 'true'
        )
          fields.push('email');
        if (
          initialData.leads_require_whatsapp === true ||
          initialData.leads_require_whatsapp === 'true'
        )
          fields.push('whatsapp');
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
    return false; // Padrão: Habilitado
  });

  // 🎯 Garantia de consistência: se leads habilitados, pelo menos um deve ser true
  useEffect(() => {
    if (leadsEnabled && requiredGuestFields.length === 0) {
      setRequiredGuestFields(['name', 'whatsapp']);
    }
  }, [leadsEnabled, requiredGuestFields]);

  const PLAN_LIMIT = permissions.maxPhotosPerGallery; // 🎯 Dinâmico pelo plano

  const [hasContractingClient, setHasContractingClient] = useState(() => {
    if (isEdit)
      return (
        initialData.has_contracting_client === true ||
        initialData.has_contracting_client === 'true'
      );
    // Se não estiver em edição, verifica a preferência do usuário
    if (profile?.settings?.display?.show_contract_type === false) return false;
    return true;
  });
  const [isPublic, setIsPublic] = useState(() => {
    if (initialData)
      return initialData.is_public === true || initialData.is_public === 'true';
    return true;
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
    photoCount: 0,
  });

  // 🎯 ESTADO PARA MÚLTIPLOS LINKS (JSON)
  // Converte dados iniciais (zip_url_full e zip_url_social) para array
  // 🎯 parseInitialLinks atualizado para objetos
  const parseInitialLinks = () => {
    if (initialData?.zip_url_full) {
      try {
        const parsed = JSON.parse(initialData.zip_url_full);
        if (Array.isArray(parsed)) {
          // Garante que cada item tenha label e url
          return parsed.map((item, index) => ({
            url: typeof item === 'string' ? item : item.url || '',
            label:
              typeof item === 'string'
                ? `LINK ${index + 1}`
                : item.label || `LINK ${index + 1}`,
          }));
        }
      } catch {
        return [{ url: initialData.zip_url_full, label: 'LINK 1' }];
      }
    }
    return [];
  };

  const [links, setLinks] =
    useState<{ url: string; label: string }[]>(parseInitialLinks());

  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const [isValidatingDrive, setIsValidatingDrive] = useState(false);

  // 🎯 PROTEÇÃO: Verifica se useSupabaseSession retorna getAuthDetails corretamente
  const sessionHook = useSupabaseSession();
  const getAuthDetails = sessionHook?.getAuthDetails;

  /**
   * 🎯 Função "cérebro": Valida e processa a seleção do Drive
   * Esta função contém toda a lógica de validação que foi removida do GooglePickerButton
   */
  const handleDriveSelection = async (
    selectedId: string,
    selectedName: string,
  ) => {
    setIsValidatingDrive(true);
    try {
      // 🎯 PROTEÇÃO: Verifica se getAuthDetails está disponível
      if (!getAuthDetails || typeof getAuthDetails !== 'function') {
        console.error(
          '[GaleriaFormContent] getAuthDetails não está disponível',
        );
        onPickerError('Erro de autenticação. Por favor, refaça o login.');
        return;
      }

      // 🎯 PROTEÇÃO: Verifica se getAuthDetails está disponível e retorna dados válidos
      let authDetails;
      try {
        authDetails = await getAuthDetails();
      } catch (authError) {
        console.error(
          '[GaleriaFormContent] Erro ao obter detalhes de autenticação:',
          authError,
        );
        onPickerError('Erro de autenticação. Por favor, refaça o login.');
        return;
      }

      // 🎯 PROTEÇÃO: Verifica se authDetails não é null/undefined e tem userId
      if (!authDetails || !authDetails.userId) {
        console.error(
          '[GaleriaFormContent] authDetails inválido:',
          authDetails,
        );
        onPickerError('Erro de autenticação. Por favor, refaça o login.');
        return;
      }

      const { userId } = authDetails;

      // 🎯 PASSO 1: Determina se é pasta ou arquivo e obtém o folderId
      let driveFolderId: string | null = null;
      let coverFileId: string = '';

      // Verifica se o item selecionado é uma pasta
      // Se for arquivo, busca a pasta pai
      try {
        // Tenta buscar a pasta pai (caso seja arquivo)
        const parentFolderId = await getParentFolderIdServer(
          selectedId,
          userId,
        );

        if (parentFolderId) {
          // É um arquivo, usa a pasta pai
          driveFolderId = parentFolderId;
          coverFileId = selectedId;
        } else {
          // Provavelmente é uma pasta, usa diretamente
          driveFolderId = selectedId;
          coverFileId = selectedId; // Para pasta, usamos o próprio ID como cover
        }
      } catch {
        // Se falhar ao buscar pasta pai, assume que é uma pasta
        driveFolderId = selectedId;
        coverFileId = selectedId;
      }

      if (!driveFolderId) {
        onPickerError('Não foi possível identificar a pasta do Google Drive.');
        return;
      }

      // 🎯 PASSO 2: Busca o nome da pasta
      let driveFolderName = selectedName;
      try {
        const folderName = await getDriveFolderName(driveFolderId, userId);
        if (folderName) {
          driveFolderName = folderName;
        }
      } catch (error) {
        console.warn(
          '[handleDriveSelection] Erro ao buscar nome da pasta:',
          error,
        );
        // Continua com o nome selecionado
      }

      // 🎯 PASSO 3: Verifica limites do plano
      let limitData = { count: 0, hasMore: false, totalInDrive: 0 };
      try {
        limitData = await checkFolderLimits(
          driveFolderId,
          userId,
          permissions.maxPhotosPerGallery,
        );
      } catch (error) {
        console.warn(
          '[handleDriveSelection] Erro ao verificar limites:',
          error,
        );
        // Continua mesmo com erro na verificação de limites
      }

      // 🎯 PASSO 4: Verifica se a pasta é pública e se pertence ao usuário
      let folderPermissionInfo = {
        isPublic: false,
        isOwner: false,
        folderLink: '',
      };
      try {
        folderPermissionInfo = await checkFolderPublicPermission(
          driveFolderId,
          userId,
        );
      } catch (error) {
        console.warn(
          '[handleDriveSelection] Erro ao verificar permissões:',
          error,
        );
        // Por segurança, assume que não é pública se houver erro
        folderPermissionInfo.folderLink = `https://drive.google.com/drive/folders/${driveFolderId}`;
      }

      // 🎯 Verifica se a pasta pertence ao usuário
      if (!folderPermissionInfo.isOwner) {
        onPickerError(
          `Esta pasta foi compartilhada por outro usuário. Só é possível vincular pastas de sua propriedade.\n\n` +
            `Link da pasta: ${folderPermissionInfo.folderLink}`,
        );
        return;
      }

      // 🎯 Verifica se a pasta é pública
      if (!folderPermissionInfo.isPublic) {
        onPickerError(
          `Pasta privada. Mude o acesso para "Qualquer pessoa com o link".\n\n` +
            `Link da pasta: ${folderPermissionInfo.folderLink}`,
        );
        return;
      }

      // 🎯 PASSO 5: Todas as validações passaram - atualiza o estado
      setDriveData({
        id: driveFolderId,
        name: driveFolderName,
        coverId: coverFileId,
        photoCount: limitData.totalInDrive || limitData.count,
      });
      setLimitInfo(limitData);

      setPhotoCount(limitData.totalInDrive || limitData.count);
      // Atualiza a contagem de fotos
      if (limitData.totalInDrive) {
        setPhotoCount(limitData.totalInDrive);
      } else {
        setPhotoCount(limitData.count);
      }

      // Se detectou que tem mais fotos, abre o modal
      if (limitData.hasMore) {
        setShowLimitModal(true);
      }
    } catch (error: any) {
      console.error('[handleDriveSelection] Erro ao processar seleção:', error);
      onPickerError(
        error?.message ||
          'Erro ao processar a seleção do Google Drive. Tente novamente.',
      );
    } finally {
      setIsValidatingDrive(false);
    }
  };

  /**
   * 🎯 Handler simples que recebe do GooglePickerButton (componente "burro")
   */
  const handleFolderSelect = async (folderId: string, folderName: string) => {
    return await handleDriveSelection(folderId, folderName);
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

  return (
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
          <input type="hidden" name="is_public" value={String(isPublic)} />
          <input type="hidden" name="category" value={category} />
          <input
            type="hidden"
            name="has_contracting_client"
            value={String(hasContractingClient)}
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
        </div>

        {/* SEÇÃO 1: IDENTIFICAÇÃO */}
        {(profile?.settings?.display?.show_contract_type !== false ||
          hasContractingClient) && (
          <FormSection title="Identificação" icon={<User size={14} />}>
            <fieldset>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-3 ">
                  <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                    <Briefcase
                      size={12}
                      strokeWidth={2}
                      className="inline mr-1.5"
                    />{' '}
                    Tipo
                  </label>
                  <div className="flex p-1 bg-slate-50 rounded-luxury border border-petroleum/40 h-10 items-center relative">
                    <div
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[0.35rem] transition-all duration-300 bg-champagne border border-gold/20 shadow-sm ${hasContractingClient ? 'left-1' : 'left-[calc(50%+1px)]'}`}
                    />
                    <button
                      type="button"
                      disabled={
                        profile?.settings?.display?.show_contract_type === false
                      }
                      onClick={() => setHasContractingClient(true)}
                      className={`relative z-10 flex-1 text-[10px] font-semibold uppercase tracking-luxury-widest transition-colors ${hasContractingClient ? 'text-black' : 'text-petroleum/60 dark:text-slate-400'}`}
                    >
                      Contrato
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasContractingClient(false);
                        setIsPublic(true);
                      }}
                      className={`relative z-10 flex-1 text-[10px] font-semibold uppercase tracking-luxury-widest transition-colors ${!hasContractingClient ? 'text-black' : 'text-petroleum/60 dark:text-slate-400'}`}
                    >
                      Cobertura
                    </button>
                  </div>
                </div>
                {hasContractingClient ? (
                  <>
                    <div className="md:col-span-6 space-y-1.5 animate-in slide-in-from-left-2">
                      <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                        <User
                          size={12}
                          strokeWidth={2}
                          className="inline mr-1.5"
                        />{' '}
                        Cliente
                      </label>
                      <input
                        name="client_name"
                        defaultValue={initialData?.client_name}
                        required
                        placeholder="Nome do cliente"
                        className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-petroleum/90 text-[13px] font-medium outline-none focus:border-gold transition-all"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                        <WhatsAppIcon className="w-3 h-3 inline mr-1.5" />{' '}
                        WhatsApp
                      </label>
                      <input
                        value={clientWhatsapp}
                        name="client_whatsapp"
                        onChange={(e) => setClientWhatsapp(maskPhone(e))}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-petroleum/90 text-[13px] font-medium outline-none focus:border-gold tracking-wider transition-all"
                      />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-9 h-10 flex items-center px-4 bg-slate-50 border border-dashed border-slate-200 rounded-luxury">
                    <p className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum/60 dark:text-slate-400 italic">
                      Identificação de cliente opcional em coberturas.
                    </p>
                  </div>
                )}
              </div>
            </fieldset>
          </FormSection>
        )}

        {/* SEÇÃO 2: GALERIA & SINCRONIZAÇÃO */}
        <FormSection
          title="Galeria & Sincronização"
          icon={<FolderSync size={14} />}
        >
          <fieldset>
            {/* Detalhes da Galeria - Primeira Linha */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-3">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                  <Type size={12} strokeWidth={2} className="inline mr-1.5" />{' '}
                  Título
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
                  className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-petroleum/90 text-[13px] font-medium outline-none focus:border-gold transition-all"
                />
              </div>
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                  <Tag size={12} strokeWidth={2} className="inline mr-1.5" />{' '}
                  Categoria
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
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                  <Calendar
                    size={12}
                    strokeWidth={2}
                    className="inline mr-1.5"
                  />{' '}
                  Data
                </label>
                <input
                  name="date"
                  type="date"
                  defaultValue={initialData?.date}
                  required
                  className="w-full px-2 h-10 bg-white border border-petroleum/40 rounded-luxury text-petroleum/80 text-[12px] font-medium outline-none focus:border-gold"
                />
              </div>
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                  <MapPin size={12} strokeWidth={2} className="inline mr-1.5" />{' '}
                  Local
                </label>
                <input
                  name="location"
                  defaultValue={initialData?.location}
                  placeholder="Cidade/UF"
                  className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-luxury text-petroleum/80 text-[12px] font-medium outline-none focus:border-gold"
                />
              </div>
            </div>
          </fieldset>
        </FormSection>

        {/* SEÇÃO 3: PRIVACIDADE */}
        <FormSection title="Privacidade" icon={<Lock size={14} />}>
          <fieldset>
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-x-12">
              {/* ACESSO */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                    <Lock size={12} className="inline mr-1.5" /> Acesso à
                    Galeria
                  </label>
                  <div className="group relative flex items-center">
                    <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover: transition-colors cursor-help">
                      <span className="text-[10px] font-semibold">?</span>
                    </div>
                    <div className="absolute bottom-full left-0 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left border border-white/10">
                      <p>
                        Para acessar uma galeria{' '}
                        <strong className="text-champagne">Privada</strong>, o
                        visitante deve informar a senha cadastrada nesta tela.
                        Sem senha, qualquer pessoa com o link pode acessar. Com
                        senha, apenas quem informar a senha correta terá acesso.
                      </p>
                      <div className="absolute top-full left-2 border-8 border-transparent border-t-slate-900" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex bg-slate-50 rounded-[0.4rem] border border-petroleum/40 p-1 gap-1 w-40 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 py-1 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-luxury-widest transition-all ${isPublic ? 'bg-champagne  shadow-sm' : 'text-slate-400'}`}
                    >
                      Público
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 py-1 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-luxury-widest transition-all ${!isPublic ? 'bg-champagne  shadow-sm' : 'text-petroleum/60 dark:text-slate-400'}`}
                    >
                      Privado
                    </button>
                  </div>
                  {!isPublic && (
                    <div className="relative group w-32">
                      {/* 🛡️ PlanGuard para o campo de Senha */}
                      {!canUsePassword && (
                        <div
                          onClick={() =>
                            setUpsellFeature({
                              label: 'Proteção por Senha',
                              feature: 'privacyLevel',
                            })
                          }
                          className="absolute inset-0 z-20 cursor-pointer bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-[0.4rem]"
                        >
                          <Lock size={12} className="text-gold" />
                        </div>
                      )}
                      <input
                        name="password"
                        disabled={!canUsePassword}
                        type={showPassword ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        minLength={4}
                        maxLength={8}
                        defaultValue={initialData?.password || ''}
                        className="w-full pl-3 pr-10 h-9 bg-white border border-champagne rounded-[0.4rem] text-xs font-medium tracking-luxury-widest outline-none focus:border-gold shadow-sm"
                        required
                        placeholder="Senha"
                        onChange={(e) => {
                          e.target.value = e.target.value.replace(/\D/g, '');
                        }}
                      />
                      <button
                        type="button"
                        disabled={!canUsePassword}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover: transition-colors p-1"
                      >
                        {showPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* LISTAGEM NO PERFIL - Também pode ser protegida pelo profileListLimit */}
              <PlanGuard
                feature="profileLevel" // Planos básicos podem ter limitações aqui
                label="Listar no Perfil"
                icon={Eye}
                onClickLocked={setUpsellFeature}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="text-[10px] font-semibold uppercase tracking-luxury-widest text-petroleum">
                      <Eye size={12} className=" inline mr-1.5" /> Listar no
                      Perfil
                    </label>
                    <div className="group relative flex items-center">
                      <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover: transition-colors cursor-help">
                        <span className="text-[10px] font-semibold">?</span>
                      </div>
                      <div className="absolute bottom-full left-0 lg:left-auto lg:right-0 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left border border-white/10">
                        <p>
                          Se ativado, esta galeria será visível na sua{' '}
                          <strong className="text-champagne">
                            página de perfil pública
                          </strong>{' '}
                          para todos os visitantes.
                        </p>
                        <div className="absolute top-full left-2 lg:left-auto lg:right-2 border-8 border-transparent border-t-slate-900" />
                      </div>
                    </div>
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
            />
          </fieldset>
        </FormSection>

        {/* SEÇÃO NOVA: CAPTURA DE LEADS */}

        <FormSection title="Cadastro de visitante" icon={<Users size={14} />}>
          <fieldset>
            <PlanGuard
              feature="canCaptureLeads"
              label="Cadastro de visitante"
              icon={Users}
              onClickLocked={setUpsellFeature}
            >
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
            </PlanGuard>
          </fieldset>
        </FormSection>

        {/* SEÇÃO 4: CUSTOMIZAÇÃO VISUAL */}

        <FormSection
          title="Design da Galeria"
          subtitle="Personalize a experiência visual do visitante"
          icon={<Layout size={14} />}
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
      </div>

      {/* COLUNA LATERAL (35%) */}
      <div className="w-full lg:w-[35%] border-t lg:border-t-0 lg:border-l border-petroleum/40 pl-0 lg:pl-2 space-y-4 bg-slate-50/30  px-2 pb-6">
        {/* GOOGLE DRIVE - Seção Principal */}
        <GaleriaDriveSection
          driveData={driveData}
          handleFolderSelect={handleFolderSelect}
          onPickerError={onPickerError}
          onTokenExpired={onTokenExpired}
          isValidatingDrive={isValidatingDrive}
          coverPreviewUrl={coverPreviewUrl}
          imgRef={imgRef}
          handleLoad={handleLoad}
          handleError={handleError}
          renameFilesSequential={renameFilesSequential}
          setRenameFilesSequential={setRenameFilesSequential}
          setUpsellFeature={setUpsellFeature}
        />

        {/* LINKS E ARQUIVOS */}
        <div className="bg-white rounded-luxury border border-petroleum/40 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-petroleum/40">
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
                    {/* Input de Descrição/Label - 30% de largura */}
                    <div className="relative w-[30%]">
                      {!permissions.canCustomLinkLabel && (
                        <div
                          onClick={() =>
                            setUpsellFeature({
                              label: 'Nome do Link Customizado',
                              feature: 'canCustomLinkLabel',
                            })
                          }
                          className="absolute inset-0 z-10 cursor-pointer bg-slate-50/50 flex items-center justify-center"
                        >
                          <Lock size={10} className="text-petroleum/30" />
                        </div>
                      )}

                      <input
                        type="text"
                        disabled={!permissions.canCustomLinkLabel}
                        required // 🎯 Torna obrigatório
                        value={link.label}
                        minLength={3} // 🎯 Mínimo de caracteres (ajustado de 5 para 3 para ser mais flexível)
                        maxLength={20} // 🎯 Máximo de caracteres
                        placeholder={`LINK ${index + 1}`}
                        onChange={(e) => {
                          const newLinks = [...links];
                          newLinks[index].label = e.target.value;
                          setLinks(newLinks);
                        }}
                        className="w-full px-2 h-8 bg-white border border-petroleum rounded-luxury text-petroleum text-[11px] font-semibold outline-none focus:border-gold transition-all invalid:border-red-500/50"
                      />
                    </div>

                    {/* Input de URL - 70% de largura */}
                    <div className="relative w-[70%]">
                      <input
                        type="url"
                        required // 🎯 Torna obrigatório
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...links];
                          newLinks[index].url = convertToDirectDownloadUrl(
                            e.target.value,
                          );
                          setLinks(newLinks);
                        }}
                        placeholder="https://link..."
                        className="w-full px-2 pr-7 h-8 bg-white border border-petroleum/20 rounded-luxury text-petroleum/70 text-[11px] outline-none focus:border-gold transition-all invalid:border-red-500/50"
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
              className="btn-secondary-white w-full h-9 group border-dashed"
            >
              {canAddMore('maxExternalLinks', links.length) ? (
                <>
                  <Plus size={14} /> adicionar novo link
                </>
              ) : (
                <>
                  <Lock size={14} className="text-gold" /> Limite atingido
                  (Upgrade)
                </>
              )}
              adicionar novo link
            </button>
          </div>
        </div>
      </div>
      {/* MODAL DE UPGRADE ÚNICO */}
      <UpgradeModal
        isOpen={!!upsellFeature}
        onClose={() => setUpsellFeature(null)}
        featureName={upsellFeature?.label || ''}
        featureKey={upsellFeature?.feature as any} // Passa a chave técnica
      />

      <LimitUpgradeModal
        isOpen={showLimitModal}
        photoCount={photoCount}
        onClose={() => setShowLimitModal(false)}
        planLimit={PLAN_LIMIT}
      />
    </div>
  );
}
