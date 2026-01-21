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
  Unlock,
  Calendar,
  MapPin,
  User,
  Type,
  FolderSync,
  X,
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
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { convertToDirectDownloadUrl, getDirectGoogleUrl } from '@/core/utils/url-helper';
import { LimitUpgradeModal } from '@/components/ui/LimitUpgradeModal';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
// 🎯 Componente de seção simples (sem accordion) - Estilo Editorial
const FormSection = ({ 
  title, 
  icon, 
  children 
}: { 
  title: string; 
  icon?: React.ReactNode; 
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-[0.5rem] border border-petroleum/40 p-4 space-y-3">
    <div className="flex items-center gap-2 pb-2 border-b border-petroleum/40">
      {icon && <div className="text-gold">{icon}</div>}
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-petroleum dark:text-slate-700">
        {title}
      </h3>
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
  const [limitInfo, setLimitInfo] = useState({ count: 0, hasMore: false });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showOnProfile, setShowOnProfile] = useState(() => {
    if (initialData)
      return (
        initialData.show_on_profile === true ||
        initialData.show_on_profile === 'true'
      );
    return false; // Por padrão, não exibe no perfil
  });
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
  
  // 🎯 PROTEÇÃO: Verifica se useSupabaseSession retorna getAuthDetails corretamente
  const sessionHook = useSupabaseSession();
  const getAuthDetails = sessionHook?.getAuthDetails;

  /**
   * 🎯 Função "cérebro": Valida e processa a seleção do Drive
   * Esta função contém toda a lógica de validação que foi removida do GooglePickerButton
   */
  const handleDriveSelection = async (selectedId: string, selectedName: string) => {
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
      } catch (error) {
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
    }
  };

  /**
   * 🎯 Handler simples que recebe do GooglePickerButton (componente "burro")
   */
  const handleFolderSelect = (folderId: string, folderName: string) => {
    handleDriveSelection(folderId, folderName);
  };

  // Preview de capa
  const { imgSrc: coverPreviewUrl } = useGoogleDriveImage({
    photoId: driveData.coverId || driveData.id || '',
    width: '400',
    priority: false,
    fallbackToProxy: false,
    useProxyDirectly: true,
  });

  // Track title changes for header
  const [titleValue, setTitleValue] = useState(initialData?.title || '');

  return (
    <div className="flex h-full overflow-hidden">
      {/* COLUNA PRINCIPAL (65%) */}
      <div className="w-[65%] overflow-y-auto pr-4 pl-0 space-y-2">

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
      </div>

      {/* SEÇÃO 1: IDENTIFICAÇÃO */}
      <FormSection title="Identificação" icon={<User size={14} />}>
        <fieldset>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-3 ">
            <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              <Briefcase size={12} strokeWidth={2} className="inline mr-1.5" /> Tipo
            </label>
            <div className="flex p-1 bg-slate-50 rounded-[0.5rem] border border-petroleum/40 h-10 items-center relative">
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
                  <User size={12} strokeWidth={2} className="inline mr-1.5" /> Cliente
                </label>
                <input
                  name="client_name"
                  defaultValue={initialData?.client_name}
                  required
                  placeholder="Nome do cliente"
                  className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-[0.5rem] text-petroleum/90 text-[13px] font-medium outline-none focus:border-gold transition-all"
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
                  <WhatsAppIcon className="w-3 h-3 inline mr-1.5" /> WhatsApp
                </label>
                <input
                  value={clientWhatsapp}
                  name="client_whatsapp"
                  onChange={(e) => setClientWhatsapp(maskPhone(e))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-[0.5rem] text-petroleum/90 text-[13px] font-medium outline-none focus:border-gold tracking-wider transition-all"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-9 h-10 flex items-center px-4 bg-slate-50 border border-dashed border-slate-200 rounded-[0.5rem]">
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
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
                className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-[0.5rem] text-petroleum/90 text-[13px] font-medium outline-none focus:border-gold transition-all"
              />
            </div>
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
                <Tag size={12} strokeWidth={2} className="inline mr-1.5" /> Categoria
              </label>
              <CategorySelect value={category} onChange={setCategory} />
            </div>
          </div>

          {/* Segunda Linha */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-3">
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
                <Calendar size={12} strokeWidth={2} className="inline mr-1.5" /> Data
              </label>
              <input
                name="date"
                type="date"
                defaultValue={initialData?.date}
                required
                className="w-full px-2 h-10 bg-white border border-petroleum/40 rounded-[0.5rem] text-petroleum/80 text-[12px] font-medium outline-none focus:border-gold"
              />
            </div>
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
                <MapPin size={12} strokeWidth={2} className="inline mr-1.5" /> Local
              </label>
              <input
                name="location"
                defaultValue={initialData?.location}
                placeholder="Cidade/UF"
                className="w-full px-3 h-10 bg-white border border-petroleum/40 rounded-[0.5rem] text-petroleum/80 text-[12px] font-medium outline-none focus:border-gold"
              />
            </div>
          </div>

        </fieldset>
      </FormSection>

      {/* SEÇÃO 3: CUSTOMIZAÇÃO VISUAL */}
      <FormSection title="Customização Visual" icon={<Layout size={14} />}>
        <fieldset>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-2">
          {/* FOTO DE FUNDO */}
          <div className="flex items-center justify-between md:justify-start gap-3 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">Foto de fundo</label>
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover:text-gold transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-2.5 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-[0.5rem] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-50 text-center border border-white/10">
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
          <div className="flex items-center justify-between md:justify-start gap-3 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <Layout size={13} className="text-gold" />
              <label> Cor de fundo</label>
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover:text-gold transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-[0.5rem] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-center border border-white/10">
                  <p>
                    Define a cor sólida do grid. Visível caso a{' '}
                    <strong className="text-champagne">"Foto de fundo"</strong>{' '}
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
          <div className="flex items-center justify-between md:justify-start gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum"> Grid</label>
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-petroleum/40 text-petroleum/60 dark:text-slate-400 group-hover:border-gold group-hover:text-gold transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-[0.5rem] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left border border-white/10">
                  <p>
                    Define o{' '}
                    <strong className="text-champagne">layout inicial</strong>{' '}
                    de colunas.
                  </p>
                  <div className="absolute top-full right-2 md:left-1/2 md:-translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3">
              {[
                { k: 'mobile', i: Smartphone },
                { k: 'tablet', i: Tablet },
                { k: 'desktop', i: Monitor },
              ].map((d) => (
                <div key={d.k} className="flex items-center gap-1">
                  <d.i size={14} className="text-gold" strokeWidth={2} />
                  <div className="relative">
                    <select
                      value={customization.columns[d.k]}
                      onChange={(e) =>
                        setCustomization.setColumns({
                          ...customization.columns,
                          [d.k]: Number(e.target.value),
                        })
                      }
                      className="appearance-none bg-slate-50 border border-petroleum/40 pl-2 pr-5 h-8 rounded-[0.5rem] text-xs font-bold text-petroleum/80 outline-none hover:border-gold cursor-pointer transition-all"
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

      {/* SEÇÃO 4: PRIVACIDADE */}
      <FormSection title="Privacidade" icon={<Lock size={14} />}>
        <fieldset>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* ACESSO */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              {' '}
              <Lock size={12} className="text-gold inline mr-1.5" /> Acesso à Galeria
            </label>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="flex bg-slate-50 rounded-[0.4rem] border border-petroleum/40 p-1 gap-1 w-40 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 py-1 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-widest transition-all ${isPublic ? 'bg-white text-gold shadow-sm' : 'text-slate-400'}`}
                >
                  Público
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 py-1 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-widest transition-all ${!isPublic ? 'bg-white text-gold shadow-sm' : 'text-petroleum/60 dark:text-slate-400'}`}
                >
                  Privado
                </button>
              </div>
              {!isPublic && (
                <div className="flex-1 relative group max-w-[120px]">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={4}
                    maxLength={8}
                    defaultValue={initialData?.password || ''}
                    className="w-full pl-3 pr-10 h-9 bg-white border border-champagne rounded-[0.4rem] text-xs font-medium tracking-[0.2em] outline-none"
                    required
                    placeholder="Senha"
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-gold transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* LISTAGEM NO PERFIL */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              {' '}
              <Eye size={12} className="text-gold inline mr-1.5" /> Listar no Perfil
            </label>
            <div className="flex items-center justify-between bg-slate-50 p-2 h-11 rounded-[0.4rem] border border-petroleum/40 flex-1">
              <span className="text-[10px] md:text-[12px]font-medium text-petroleum dark:text-slate-600 pl-1">
                Exibir esta galeria no meu perfil público?
              </span>
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
        </div>
        </fieldset>
      </FormSection>

      </div>

      {/* COLUNA LATERAL (35%) */}
      <div className="w-[35%] border-l border-petroleum/40 overflow-y-auto pl-4 pr-0 space-y-2 bg-slate-50/30">
        {/* GOOGLE DRIVE - Seção Principal */}
        <div className="bg-white rounded-[0.5rem] border border-petroleum/40 p-4 space-y-4 mt-2">
          <div className="flex items-center gap-2 pb-2 border-b border-petroleum/40">
            <FolderSync size={14} className="text-gold" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              Google Drive
            </h3>
          </div>

          {/* Subseção 1: Vincular Pasta do Google Drive */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-1.5">
              <FolderSync size={12} strokeWidth={2} className="inline" />
              Vincular Pasta do Google Drive
            </label>
            
            <div className="flex flex-col bg-slate-50 p-3 rounded-[0.5rem] border border-petroleum/40 space-y-3">
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
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-petroleum/40 rounded-[0.5rem] text-[11px] font-semibold text-petroleum/80 hover:text-petroleum transition-colors"
                >
                  <FolderSync size={14} className="text-gold" />
                  Abrir no Google Drive
                </a>
              )}
            </div>
          </div>

          {/* Subseção 2: Preview de Capa */}
          <div className="space-y-3 pt-3 border-t border-petroleum/40">
            <label className="text-[10px] font-bold uppercase tracking-widest text-petroleum flex items-center gap-1.5">
              <ImageIcon size={12} strokeWidth={2} className="inline" />
              Preview de Capa
            </label>
            
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[0.5rem] bg-slate-100 border border-petroleum/40">
              {coverPreviewUrl ? (
                <img
                  src={coverPreviewUrl}
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
        </div>

        {/* LINKS E ARQUIVOS */}
        <div className="bg-white rounded-[0.5rem] border border-petroleum/40 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-petroleum/40">
            <Download size={14} className="text-gold" />
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
                      className="w-full px-3 h-9 bg-white border border-petroleum/40 rounded-[0.5rem] text-petroleum/90 text-xs font-medium outline-none focus:border-gold transition-all pr-10"
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
                    className="p-2 text-petroleum/60 hover:text-red-500 hover:bg-red-50 border border-petroleum/40 hover:border-red-300 rounded-[0.5rem] transition-colors"
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
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-petroleum/40 hover:border-petroleum/60 rounded-[0.5rem] text-petroleum/80 hover:text-petroleum text-xs font-medium transition-colors"
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
