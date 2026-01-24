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

// 🎯 Componente de seção simples (sem accordion) - Estilo Editorial
const FormSection = ({ 
  title, 
  subtitle, // Nova prop para o subtítulo
  icon, 
  children 
}: { 
  title: string; 
  subtitle?: string; 
  icon?: React.ReactNode; 
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-luxury border border-petroleum/40 p-4 space-y-3">
    <div className="flex flex-col gap-1 pb-2 border-b border-petroleum/40">
      <div className="flex items-center gap-2">
        {icon && <div className="text-gold">{icon}</div>} {/* Ícones agora em Gold */}
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-petroleum dark:text-slate-700">
          {title}
        </h3>
        {subtitle && (
        <p className="text-[10px] text-petroleum italic font-semibold">
          {subtitle}
        </p>
      )}
      </div>

    </div>
    <div className="pl-0">
      {children}
    </div>
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
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLimitInfo] = useState({ count: 0, hasMore: false });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showOnProfile, setShowOnProfile] = useState(() => {
    if (initialData)
      return (
        initialData.show_on_profile === true ||
        initialData.show_on_profile === 'true'
      );
    return false; // Por padrão, não exibe no perfil
  });

  const [leadsEnabled, setLeadsEnabled] = useState(() => {
    if (initialData)
      return (
        initialData.leads_enabled === true ||
        initialData.leads_enabled === 'true'
      );
    return false;
  });

  const [leadsRequireName, setLeadsRequireName] = useState(() => {
    if (initialData)
      return (
        initialData.leads_require_name === true ||
        initialData.leads_require_name === 'true'
      );
    return true; // Padrão: Nome obrigatório se habilitado
  });

  const [leadsRequireEmail, setLeadsRequireEmail] = useState(() => {
    if (initialData)
      return (
        initialData.leads_require_email === true ||
        initialData.leads_require_email === 'true'
      );
    return false;
  });

  const [leadsRequireWhatsapp, setLeadsRequireWhatsapp] = useState(() => {
    if (initialData)
      return (
        initialData.leads_require_whatsapp === true ||
        initialData.leads_require_whatsapp === 'true'
      );
    return true; // Padrão: WhatsApp obrigatório se habilitado
  });

  const [renameFilesSequential, setRenameFilesSequential] = useState(() => {
    if (initialData)
      return (
        initialData.rename_files_sequential === true ||
        initialData.rename_files_sequential === 'true'
      );
    return false; // Padrão: Habilitado
  });

  // 🎯 Lógica para garantir pelo menos um campo obrigatório na captura de leads
  const toggleLeadField = (field: 'name' | 'email' | 'whatsapp') => {
    const activeFields = [
      field === 'name' ? !leadsRequireName : leadsRequireName,
      field === 'email' ? !leadsRequireEmail : leadsRequireEmail,
      field === 'whatsapp' ? !leadsRequireWhatsapp : leadsRequireWhatsapp,
    ].filter(Boolean).length;

    if (activeFields === 0) return; // Não permite desativar se for o último

    if (field === 'name') setLeadsRequireName(!leadsRequireName);
    if (field === 'email') setLeadsRequireEmail(!leadsRequireEmail);
    if (field === 'whatsapp') setLeadsRequireWhatsapp(!leadsRequireWhatsapp);
  };

  // 🎯 Garantia de consistência: se leads habilitados, pelo menos um deve ser true
  useEffect(() => {
    if (leadsEnabled && !leadsRequireName && !leadsRequireEmail && !leadsRequireWhatsapp) {
      setLeadsRequireName(true);
      setLeadsRequireWhatsapp(true);
    }
  }, [leadsEnabled, leadsRequireName, leadsRequireEmail, leadsRequireWhatsapp]);

  const PLAN_LIMIT = 500; // Este valor deve vir da sua lógica de planos/sessão

  const [hasContractingClient, setHasContractingClient] = useState(() => {
    if (isEdit)
      return (
        initialData.has_contracting_client === true ||
        initialData.has_contracting_client === 'true'
      );
    return true;
  });
  const [isPublic, setIsPublic] = useState(() => {
    if (initialData)
      return initialData.is_public === true || initialData.is_public === 'true';
    return true;
  });
  const [category, setCategory] = useState(() => initialData?.category ?? '');
  const [clientWhatsapp, setClientWhatsapp] = useState(() =>
    initialData?.client_whatsapp
      ? maskPhone({ target: { value: initialData.client_whatsapp } } as any)
      : '',
  );
  const [driveData, setDriveData] = useState({
    id: initialData?.drive_folder_id ?? '',
    name: initialData?.drive_folder_name ?? 'Nenhuma pasta selecionada',
    coverId: initialData?.cover_image_url ?? '',
  });

  // 🎯 ESTADO PARA MÚLTIPLOS LINKS (JSON)
  // Converte dados iniciais (zip_url_full e zip_url_social) para array
  const parseInitialLinks = () => {
    const links: string[] = [];
    // Se há zip_url_full, adiciona
    if (initialData?.zip_url_full) {
      try {
        // Tenta parsear como JSON primeiro
        const parsed = JSON.parse(initialData.zip_url_full);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // Se não é array, trata como string única
        links.push(initialData.zip_url_full);
      } catch {
        // Se não é JSON válido, trata como string única
        links.push(initialData.zip_url_full);
      }
    }
    // Se há zip_url_social, adiciona
    if (initialData?.zip_url_social) {
      links.push(initialData.zip_url_social);
    }
    return links;
  };

  const [links, setLinks] = useState<string[]>(parseInitialLinks());

  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const [isValidatingDrive, setIsValidatingDrive] = useState(false);
  
  // 🎯 PROTEÇÃO: Verifica se useSupabaseSession retorna getAuthDetails corretamente
  const sessionHook = useSupabaseSession();
  const getAuthDetails = sessionHook?.getAuthDetails;

  /**
   * 🎯 Função "cérebro": Valida e processa a seleção do Drive
   * Esta função contém toda a lógica de validação que foi removida do GooglePickerButton
   */
  const handleDriveSelection = async (selectedId: string, selectedName: string) => {
    setIsValidatingDrive(true);
    try {
      // 🎯 PROTEÇÃO: Verifica se getAuthDetails está disponível
      if (!getAuthDetails || typeof getAuthDetails !== 'function') {
        console.error('[GaleriaFormContent] getAuthDetails não está disponível');
        onPickerError('Erro de autenticação. Por favor, refaça o login.');
        return;
      }
      
      // 🎯 PROTEÇÃO: Verifica se getAuthDetails está disponível e retorna dados válidos
      let authDetails;
      try {
        authDetails = await getAuthDetails();
      } catch (authError) {
        console.error('[GaleriaFormContent] Erro ao obter detalhes de autenticação:', authError);
        onPickerError('Erro de autenticação. Por favor, refaça o login.');
        return;
      }
      
      // 🎯 PROTEÇÃO: Verifica se authDetails não é null/undefined e tem userId
      if (!authDetails || !authDetails.userId) {
        console.error('[GaleriaFormContent] authDetails inválido:', authDetails);
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
        const parentFolderId = await getParentFolderIdServer(selectedId, userId);
        
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
        console.warn('[handleDriveSelection] Erro ao buscar nome da pasta:', error);
        // Continua com o nome selecionado
      }

      // 🎯 PASSO 3: Verifica limites do plano
      let limitData = { count: 0, hasMore: false, totalInDrive: 0 };
      try {
        limitData = await checkFolderLimits(driveFolderId, userId, PLAN_LIMIT);
      } catch (error) {
        console.warn('[handleDriveSelection] Erro ao verificar limites:', error);
        // Continua mesmo com erro na verificação de limites
      }

      // 🎯 PASSO 4: Verifica se a pasta é pública e se pertence ao usuário
      let folderPermissionInfo = { isPublic: false, isOwner: false, folderLink: '' };
      try {
        folderPermissionInfo = await checkFolderPublicPermission(driveFolderId, userId);
      } catch (error) {
        console.warn('[handleDriveSelection] Erro ao verificar permissões:', error);
        // Por segurança, assume que não é pública se houver erro
        folderPermissionInfo.folderLink = `https://drive.google.com/drive/folders/${driveFolderId}`;
      }

      // 🎯 Verifica se a pasta pertence ao usuário
      if (!folderPermissionInfo.isOwner) {
        onPickerError(
          `Esta pasta foi compartilhada por outro usuário. Só é possível vincular pastas de sua propriedade.\n\n` +
          `Link da pasta: ${folderPermissionInfo.folderLink}`
        );
        return;
      }

      // 🎯 Verifica se a pasta é pública
      if (!folderPermissionInfo.isPublic) {
        onPickerError(
          `Pasta privada. Mude o acesso para "Qualquer pessoa com o link".\n\n` +
          `Link da pasta: ${folderPermissionInfo.folderLink}`
        );
        return;
      }

      // 🎯 PASSO 5: Todas as validações passaram - atualiza o estado
      setDriveData({ 
        id: driveFolderId, 
        name: driveFolderName, 
        coverId: coverFileId 
      });
      setLimitInfo(limitData);

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
        error?.message || 'Erro ao processar a seleção do Google Drive. Tente novamente.'
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
  const { imgSrc: coverPreviewUrl, imgRef, handleLoad, handleError } = useGoogleDriveImage({
    photoId: driveData.coverId || driveData.id || '',
    width: '400',
    priority: false,
    fallbackToProxy: false,
    useProxyDirectly: true,
  });

  // Track title changes for header
  const [, setTitleValue] = useState(initialData?.title || '');

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* COLUNA PRINCIPAL (65%) */}
      <div className="w-full lg:w-[65%] relative z-10 lg:overflow-y-auto pr-0 lg:pr-4 pl-0 space-y-2 pb-4
      ">

      {/* INPUTS OCULTOS */}
      <div className="hidden">
      <input type="hidden" name="drive_folder_id" value={driveData.id} />
      <input type="hidden" name="drive_folder_name" value={driveData.name} />
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
        value={String(leadsRequireName)}
      />
      <input
        type="hidden"
        name="leads_require_email"
        data-testid="leads_require_email"
        value={String(leadsRequireEmail)}
      />
      <input
        type="hidden"
        name="leads_require_whatsapp"
        data-testid="leads_require_whatsapp"
        value={String(leadsRequireWhatsapp)}
      />
      <input
        type="hidden"
        name="rename_files_sequential"
        value={String(renameFilesSequential)}
      />
      </div>

      {/* SEÇÃO 1: IDENTIFICAÇÃO */}
      <FormSection title="Identificação" icon={<User size={14} />}>
        <fieldset>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-3 ">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
              <Briefcase size={12} strokeWidth={2} className="inline mr-1.5" /> Tipo
            </label>
            <div className="flex p-1 bg-slate-50 rounded-luxury border border-petroleum/40 h-10 items-center relative">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[0.35rem] transition-all duration-300 bg-champagne border border-gold/20 shadow-sm ${hasContractingClient ? 'left-1' : 'left-[calc(50%+1px)]'}`}
              />
              <button
                type="button"
                onClick={() => setHasContractingClient(true)}
                className={`relative z-10 flex-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${hasContractingClient ? 'text-black' : 'text-petroleum/60 dark:text-slate-400'}`}
              >
                Contrato
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasContractingClient(false);
                  setIsPublic(true);
                }}
                className={`relative z-10 flex-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${!hasContractingClient ? 'text-black' : 'text-petroleum/60 dark:text-slate-400'}`}
              >
                Cobertura
              </button>
            </div>
          </div>
          {hasContractingClient ? (
            <>
              <div className="md:col-span-6 space-y-1.5 animate-in slide-in-from-left-2">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                  <User size={12} strokeWidth={2} className="inline mr-1.5" /> Cliente
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
                <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                  <WhatsAppIcon className="w-3 h-3 inline mr-1.5" /> WhatsApp
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
              <p className="text-[10px] font-semibold uppercase tracking-widest text-petroleum/60 dark:text-slate-400 italic">
                Identificação de cliente opcional em coberturas.
              </p>
            </div>
          )}
          </div>
        </fieldset>
      </FormSection>

      {/* SEÇÃO 2: GALERIA & SINCRONIZAÇÃO */}
      <FormSection title="Galeria & Sincronização" icon={<FolderSync size={14} />}>
        <fieldset>
          {/* Detalhes da Galeria - Primeira Linha */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-3">
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                <Type size={12} strokeWidth={2} className="inline mr-1.5" /> Título
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
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                <Tag size={12} strokeWidth={2} className="inline mr-1.5" /> Categoria
              </label>
              <CategorySelect value={category} onChange={setCategory} />
            </div>
          </div>

          {/* Segunda Linha */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-3">
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                <Calendar size={12} strokeWidth={2} className="inline mr-1.5" /> Data
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
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                <MapPin size={12} strokeWidth={2} className="inline mr-1.5" /> Local
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
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                <Lock size={12} className="inline mr-1.5" /> Acesso à Galeria
              </label>
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover: transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full left-0 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left border border-white/10">
                  <p>
                    Para acessar uma galeria <strong className="text-champagne">Privada</strong>, o usuário deve informar a senha cadastrada nesta tela. Sem senha, qualquer pessoa com o link pode acessar. Com senha, apenas quem informar a senha correta terá acesso.
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
                  className={`flex-1 py-1 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-widest transition-all ${isPublic ? 'bg-white  shadow-sm' : 'text-slate-400'}`}
                >
                  Público
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 py-1 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-widest transition-all ${!isPublic ? 'bg-white  shadow-sm' : 'text-petroleum/60 dark:text-slate-400'}`}
                >
                  Privado
                </button>
              </div>
              {!isPublic && (
                <div className="relative group w-32">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={4}
                    maxLength={8}
                    defaultValue={initialData?.password || ''}
                    className="w-full pl-3 pr-10 h-9 bg-white border border-champagne rounded-[0.4rem] text-xs font-medium tracking-[0.2em] outline-none focus:border-gold shadow-sm"
                    required
                    placeholder="Senha"
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover: transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* LISTAGEM NO PERFIL */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                <Eye size={12} className=" inline mr-1.5" /> Listar no Perfil
              </label>
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover: transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full left-0 lg:left-auto lg:right-0 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left border border-white/10">
                  <p>
                    Se ativado, esta galeria será visível na sua <strong className="text-champagne">página de perfil pública</strong> para todos os visitantes.
                  </p>
                  <div className="absolute top-full left-2 lg:left-auto lg:right-2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOnProfile(!showOnProfile)}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showOnProfile ? 'bg-green-500' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${showOnProfile ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>
        </div>
        </fieldset>
      </FormSection>

      {/* SEÇÃO NOVA: CAPTURA DE LEADS */}
      <FormSection title="Captura de Leads" icon={<Users size={14} />}>
        <fieldset>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">
                  Habilitar Captura de Leads
                </label>
                <button
                  type="button"
                  onClick={() => setLeadsEnabled(!leadsEnabled)}
                  className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${leadsEnabled ? 'bg-gold' : 'bg-slate-200'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${leadsEnabled ? 'translate-x-4' : ''}`}
                  />
                </button>
              </div>
              {!isEdit && (
                <p className="text-[10px] text-petroleum/60 dark:text-slate-400 italic">
                  Aumente sua base de contatos exigindo dados básicos antes dos clientes visualizarem as fotos.
                </p>
              )}
            </div>

            {leadsEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-luxury border border-petroleum/20 animate-in fade-in slide-in-from-top-2 duration-300">
                <div 
                  onClick={() => toggleLeadField('name')}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <div 
                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${leadsRequireName ? 'bg-gold border-gold' : 'bg-white border-petroleum/40'}`}
                  >
                    {leadsRequireName && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-petroleum/80 group-hover:text-petroleum">Exigir Nome</span>
                </div>

                <div 
                  onClick={() => toggleLeadField('email')}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <div 
                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${leadsRequireEmail ? 'bg-gold border-gold' : 'bg-white border-petroleum/40'}`}
                  >
                    {leadsRequireEmail && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-petroleum/80 group-hover:text-petroleum">Exigir E-mail</span>
                </div>

                <div 
                  onClick={() => toggleLeadField('whatsapp')}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <div 
                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${leadsRequireWhatsapp ? 'bg-gold border-gold' : 'bg-white border-petroleum/40'}`}
                  >
                    {leadsRequireWhatsapp && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-petroleum/80 group-hover:text-petroleum">Exigir WhatsApp</span>
                </div>
              </div>
            )}
          </div>
        </fieldset>
      </FormSection>

      {/* SEÇÃO 4: CUSTOMIZAÇÃO VISUAL */}
      <FormSection 
          title="Design da Galeria" 
          subtitle="Personalize a experiência visual do usuário final"
          icon={<Layout size={14} />}
        >
        <fieldset>
        <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr_auto] gap-4 items-center">
          {/* FOTO DE FUNDO */}
          <div className="flex items-center gap-4 pb-4 xl:pb-0 xl:border-r border-slate-200 xl:pr-2 w-max">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum">Foto de fundo</label>
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover: transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-2.5 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-50 text-center border border-white/10">
                  <p>
                    Usa a foto selecionada no Google Drive como fundo da grade
                    de fotos galeria.
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setCustomization.setShowCoverInGrid(
                  !customization.showCoverInGrid,
                )
              }
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${customization.showCoverInGrid ? 'bg-gold' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${customization.showCoverInGrid ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>

          {/* COR DE FUNDO */}
          <div className="flex items-center justify-between gap-3 xl:pb-0 pb-4 xl:border-r border-slate-200 xl:pr-4">
            <div className="flex items-center gap-1.5">
              <Layout size={13} className="" />
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum"> Cor de fundo</label>
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover: transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-center border border-white/10">
                  <p>
                    Define a cor sólida do grid. Visível caso a{' '}
                    <strong className="text-champagne">&quot;Foto de fundo&quot;</strong>{' '}
                    esteja desativada.
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {['#F3E5AB', '#FFFFFF', '#000000'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCustomization.setGridBgColor(c)}
                    className={`w-5 h-5 rounded-[0.3rem] border transition-all ${customization.gridBgColor === c ? 'border-gold scale-110 shadow-sm' : 'border-slate-200'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-petroleum/40 rounded-[0.4rem] px-1.5 h-8">
                <div
                  className="w-4 h-4 rounded-[0.2rem] border border-petroleum/40 relative overflow-hidden shadow-sm"
                  style={{ backgroundColor: customization.gridBgColor }}
                >
                  <input
                    type="color"
                    value={customization.gridBgColor}
                    onChange={(e) =>
                      setCustomization.setGridBgColor(
                        e.target.value.toUpperCase(),
                      )
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer scale-150"
                  />
                </div>
                <input
                  type="text"
                  maxLength={7}
                  value={customization.gridBgColor}
                  onChange={(e) =>
                    setCustomization.setGridBgColor(
                      e.target.value.toUpperCase(),
                    )
                  }
                  className="w-14 bg-transparent text-[12px] font-mono font-medium text-petroleum dark:text-slate-600 outline-none uppercase"
                />
              </div>
            </div>
          </div>

          {/* GRID COLUNAS */}
          <div className="flex items-center justify-between gap-3 w-max">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-petroleum"> Grid</label>
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover: transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full right-0 xl:left-1/2 xl:-translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left border border-white/10">
                  <p>
                    Define o{' '}
                    <strong className="text-champagne">layout inicial</strong>{' '}
                    de colunas.
                  </p>
                  <div className="absolute top-full right-2 xl:left-1/2 xl:-translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { k: 'mobile', i: Smartphone },
                { k: 'tablet', i: Tablet },
                { k: 'desktop', i: Monitor },
              ].map((d) => (
                <div key={d.k} className="flex items-center gap-1">
                  <d.i size={14} className="" strokeWidth={2} />
                  <div className="relative">
                    <select
                      value={customization.columns[d.k]}
                      onChange={(e) =>
                        setCustomization.setColumns({
                          ...customization.columns,
                          [d.k]: Number(e.target.value),
                        })
                      }
                      className="appearance-none bg-slate-50 border rounded-[0.3rem] border-petroleum/40 pl-2 pr-5 h-8 text-xs font-semibold text-petroleum/80 outline-none hover:border-gold cursor-pointer transition-all"
                    >
                      {[1, 2, 3, 4, 5, 6].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-petroleum/60 dark:text-slate-400">
                      <svg width="6" height="6" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M1 3L5 7L9 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </fieldset>
      </FormSection>

      </div>

      {/* COLUNA LATERAL (35%) */}
      <div className="w-full lg:w-[35%] border-t lg:border-t-0 lg:border-l border-petroleum/40 lg:overflow-y-auto pl-0 lg:pl-4 pr-0 py-6 lg:py-0 space-y-2 bg-slate-50/30">
        {/* GOOGLE DRIVE - Seção Principal */}
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
              Preview de Capa
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
              Padroniza o nome das fotos para &quot;foto-1.jpg&quot;, &quot;foto-2.jpg&quot;, etc, facilitando a organização do cliente.
            </p>
          </div>
        </div>

        {/* LINKS E ARQUIVOS */}
        <div className="bg-white rounded-luxury border border-petroleum/40 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-petroleum/40">
            <Download size={14} className="" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              Links e Arquivos - Alta Resolução (Full)
            </h3>
          </div>
          
          <div className="space-y-3">
            {/* Input oculto para salvar como JSON */}
            <input
              type="hidden"
              name="zip_url_full"
              value={links.length > 0 ? JSON.stringify(links) : ''}
            />
            
            {/* Lista de Links */}
            <div className="space-y-2">
              {links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[index] = convertToDirectDownloadUrl(e.target.value);
                        setLinks(newLinks);
                      }}
                      placeholder="Link para qualquer arquivo ou recurso"
                      className="w-full px-3 h-9 bg-white border border-petroleum/40 rounded-luxury text-petroleum/90 text-xs font-medium outline-none focus:border-gold transition-all pr-10"
                    />
                    {link && link.length > 0 && (
                      <CheckCircle2
                        size={14}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newLinks = links.filter((_, i) => i !== index);
                      setLinks(newLinks);
                    }}
                    className="p-2 text-petroleum/60 hover:text-red-500 hover:bg-red-50 border border-petroleum/40 hover:border-red-300 rounded-luxury transition-colors"
                    aria-label="Remover link"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Botão Adicionar Link */}
            <button
              type="button"
              onClick={() => setLinks([...links, ''])}
              className="btn-secondary-white w-full"
            >
              <Plus size={14} />
              Adicionar Link
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
  );
}
