'use client';

import { useEffect, useState } from 'react';
import { maskPhone } from '@/core/utils/masks-helpers';
import { GooglePickerButton } from '@/components/google-drive';
import { CategorySelect } from '@/components/gallery';
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
  Settings2,
  Camera,
  Tag,
  ShieldCheck,
  Layout,
  Monitor,
  Palette,
  Smartphone,
  Tablet,
  Eye,
  EyeOff,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export default function GalleryFormContent({
  initialData = null,
  isEdit = false,
  customization,
  setCustomization,
  onPickerError,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [hasContractingClient, setHasContractingClient] = useState(
    () =>
      initialData?.has_contracting_client === true ||
      initialData?.has_contracting_client === 'true',
  );
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

  const SectionHeader = ({ title }: { icon: any; title: string }) => (
    <legend className="flex items-center gap-2 px-2 ml-2 bg-white">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-800">
        {title}
      </span>
    </legend>
  );

  return (
    <div className="space-y-2 animate-in fade-in duration-500 pb-2">
      {/* INPUTS OCULTOS MANTIDOS */}
      <input type="hidden" name="drive_folder_id" value={driveData.id} />
      <input type="hidden" name="drive_folder_name" value={driveData.name} />
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

      {/* Customizações Visuais */}
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

      {/* BLOCO 1: IDENTIFICAÇÃO */}
      <fieldset className="p-3 bg-white border border-slate-200 rounded-[0.5rem] shadow-sm mt-4">
        <SectionHeader title="Identificação" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-3 space-y-1.5">
            <label>
              <Briefcase size={12} strokeWidth={2} /> Tipo
            </label>
            <div className="flex p-1 bg-slate-50 rounded-[0.5rem] border border-slate-200 h-10 items-center relative">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[0.35rem] transition-all duration-300 bg-[#F3E5AB] border border-[#D4AF37]/20 shadow-sm ${hasContractingClient ? 'left-1' : 'left-[calc(50%+1px)]'}`}
              />
              <button
                type="button"
                onClick={() => setHasContractingClient(true)}
                className={`relative z-10 flex-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${hasContractingClient ? 'text-black' : 'text-slate-400'}`}
              >
                Contrato
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasContractingClient(false);
                  setIsPublic(true);
                }}
                className={`relative z-10 flex-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${!hasContractingClient ? 'text-black' : 'text-slate-400'}`}
              >
                Cobertura
              </button>
            </div>
          </div>

          {hasContractingClient ? (
            <>
              <div className="md:col-span-6 space-y-1.5 animate-in slide-in-from-left-2">
                <label>
                  <User size={12} strokeWidth={2} /> Cliente
                </label>
                <input
                  name="client_name"
                  defaultValue={initialData?.client_name}
                  required={!!hasContractingClient}
                  placeholder="Nome do cliente"
                  className="w-full px-3 h-10 bg-white border border-slate-200 rounded-[0.5rem] text-[13px] font-medium outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <label>
                  <WhatsAppIcon className="w-3 h-3 text-slate-400" /> WhatsApp
                </label>
                <input
                  value={clientWhatsapp}
                  name="client_whatsapp"
                  onChange={(e) => setClientWhatsapp(maskPhone(e))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 h-10 bg-white border border-slate-200 rounded-[0.5rem] text-[13px] font-medium outline-none focus:border-[#D4AF37] tracking-wider transition-all"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-9 h-10 flex items-center px-4 bg-slate-50 border border-dashed border-slate-200 rounded-[0.5rem]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 italic">
                Identificação de cliente opcional em coberturas.
              </p>
            </div>
          )}
        </div>
      </fieldset>

      {/* BLOCO 2: ENTREGA */}
      <fieldset className="p-3 bg-white border border-slate-200 rounded-[0.5rem] shadow-sm mt-4">
        <SectionHeader title="Galeria" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label>
              <Type size={12} strokeWidth={2} /> Título
            </label>
            <input
              name="title"
              defaultValue={initialData?.title}
              required
              placeholder="Ex: Wedding Day"
              className="w-full px-3 h-10 bg-white border border-slate-200 rounded-[0.5rem] text-[13px] font-medium outline-none focus:border-[#D4AF37] transition-all"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <label>
              <Tag size={12} strokeWidth={2} /> Categoria
            </label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>
          <div className="md:col-span-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label>
                <Calendar size={12} strokeWidth={2} /> Data
              </label>
              <input
                name="date"
                type="date"
                defaultValue={initialData?.date}
                required
                className="w-full px-2 h-10 bg-white border border-slate-200 rounded-[0.5rem] text-[12px] font-medium outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="space-y-1.5">
              <label>
                <MapPin size={12} strokeWidth={2} /> Local
              </label>
              <input
                name="location"
                defaultValue={initialData?.location}
                placeholder="Cidade/UF"
                className="w-full px-3 h-10 bg-white border border-slate-200 rounded-[0.5rem] text-[12px] font-medium outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* BLOCO 3: APARÊNCIA */}

      <fieldset className="relative px-4 py-3 bg-white border border-slate-200 rounded-[0.5rem] shadow-sm mt-4">
        <SectionHeader title="Customização Visual" />

        {/* Ajuste: flex-col para mobile, md:flex-row para desktop */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-2">
          {/* 1. SEÇÃO: FOTO DE FUNDO */}
          {/* Ajuste: border-b no mobile, md:border-r no desktop */}
          <div className="flex items-center justify-between md:justify-start gap-3 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500 font-bold uppercase tracking-widest text-[10px] whitespace-nowrap">
                Foto de fundo
              </label>

              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-2.5 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-50 text-center border border-white/10">
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
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${customization.showCoverInGrid ? 'bg-[#D4AF37]' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${customization.showCoverInGrid ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>

          {/* 2. SEÇÃO: COR DE FUNDO */}
          {/* Ajuste: border-b no mobile, md:border-r no desktop */}
          <div className="flex items-center justify-between md:justify-start gap-3 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <Layout size={13} className="text-[#D4AF37]" />
              <label className="text-slate-500 font-bold uppercase tracking-widest text-[10px] whitespace-nowrap">
                Cor de fundo
              </label>

              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-center border border-white/10">
                  <p>
                    Define a cor sólida do grid. Esta cor será visível caso a
                    opção{' '}
                    <strong className="text-[#F3E5AB]">"Foto de fundo"</strong>{' '}
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
                    className={`w-5 h-5 rounded-[0.3rem] border transition-all ${customization.gridBgColor === c ? 'border-[#D4AF37] scale-110 shadow-sm' : 'border-slate-200'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-[0.4rem] px-1.5 h-8">
                <div
                  className="w-4 h-4 rounded-[0.2rem] border border-slate-200 relative overflow-hidden shadow-sm"
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
                  className="w-14 bg-transparent text-[12px] font-mono font-medium text-slate-600 outline-none uppercase"
                />
              </div>
            </div>
          </div>

          {/* 3. SEÇÃO: GRID DE COLUNAS */}
          <div className="flex items-center justify-between md:justify-start gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500 font-bold uppercase tracking-widest text-[10px] whitespace-nowrap">
                Grid
              </label>

              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>
                <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left border border-white/10">
                  <p>
                    Define o{' '}
                    <strong className="text-[#F3E5AB]">layout inicial</strong>{' '}
                    de colunas. O cliente ainda poderá alterar manualmente na
                    galeria.
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
                  <d.i size={14} className="text-[#D4AF37]" strokeWidth={2} />
                  <div className="relative">
                    <select
                      value={customization.columns[d.k]}
                      onChange={(e) =>
                        setCustomization.setColumns({
                          ...customization.columns,
                          [d.k]: Number(e.target.value),
                        })
                      }
                      className="appearance-none bg-slate-50 border border-slate-200 pl-2 pr-5 h-8 rounded-[0.3rem] text-[11px] font-bold text-slate-700 outline-none hover:border-[#D4AF37] cursor-pointer transition-all"
                    >
                      {[1, 2, 3, 4, 5, 6].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
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

      {/* BLOCO 4: DRIVE E SEGURANÇA */}

      <fieldset className="p-2 bg-white border border-slate-200 rounded-[0.5rem] mt-4">
        <SectionHeader title="Drive e Segurança" />
        <div className="flex flex-wrap border-0 border-slate-200 rounded-[0.5rem] shadow-sm">
          {/* 1. BLOCO DE ARMAZENAMENTO - Ocupa metade (flex-1) */}
          <div className="flex-1 min-w-[300px] p-3 space-y-3 border-r border-slate-200">
            <div className="flex items-center gap-2">
              <label className="!mb-0 flex items-center gap-2">
                <FolderSync
                  size={13}
                  strokeWidth={2}
                  className="text-[#D4AF37]"
                />
                <span className="text-slate-500 font-semibold uppercase tracking-widest text-[10px]">
                  Armazenamento
                </span>
              </label>

              {/* Tooltip Ajustado para não cortar */}
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>

                {/* Alterado: top-full em vez de bottom-full para abrir para baixo se estiver no topo da seção */}
                <div className="absolute top-full left-0 mt-2 w-56 p-2.5 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left">
                  <p>
                    A foto que você selecionar nesta pasta será usada como a
                    capa principal da galeria.
                  </p>
                  {/* Setinha ajustada para o topo do balão */}
                  <div className="absolute bottom-full left-4 border-8 border-transparent border-b-slate-900" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <GooglePickerButton
                onError={onPickerError}
                onFolderSelect={(id, name, coverId) =>
                  setDriveData({ id, name, coverId })
                }
                currentDriveId={driveData.id}
              />
              <div className="flex-1 bg-slate-50 px-3 h-9 rounded-[0.4rem] border border-slate-200 flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${driveData.id ? 'bg-[#34D399] animate-pulse' : 'bg-slate-300'}`}
                  />
                  <span className="text-[10px] font-medium truncate text-slate-600 leading-none">
                    {driveData.name}
                  </span>
                </div>
                {driveData.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setDriveData({
                        id: '',
                        name: 'Nenhuma pasta selecionada',
                        coverId: '',
                      })
                    }
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* PRIVACIDADE */}
          <div className="md:col-span-5 p-2 space-y-3">
            <div className="flex items-center gap-2">
              <label className="!mb-0 flex items-center gap-2">
                <Lock size={13} strokeWidth={2} className="text-[#D4AF37]" />
                Privacidade
              </label>

              {/* Tooltip Customizado Editorial para Privacidade */}
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] transition-colors cursor-help">
                  <span className="text-[10px] font-bold">?</span>
                </div>

                {/* Balão do Tooltip - Posicionado para não cortar à direita */}
                <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-50">
                  <p>
                    <strong className="text-[#F3E5AB]">Público:</strong>{' '}
                    Acessível a qualquer pessoa com o link.
                    <br />
                    <strong className="text-[#F3E5AB]">Privado:</strong> Exige a
                    senha definida ao lado para visualizar as fotos.
                  </p>
                  {/* Setinha do balão alinhada à esquerda com o ícone */}
                  <div className="absolute top-full left-2 border-8 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Este input garante que o valor chegue ao handleSubmit no Modal Pai */}
              <input type="hidden" name="is_public" value={String(isPublic)} />
              {/* Seletor de modo (Público/Privado) */}
              <div className="flex items-center bg-slate-50 rounded-[0.4rem] border border-slate-200 p-1 gap-1 w-full max-w-[200px] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-wider transition-all ${isPublic ? 'bg-white text-[#D4AF37] shadow-sm' : 'text-slate-400'}`}
                >
                  <Unlock size={11} strokeWidth={2} /> Público
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[0.3rem] text-[10px] font-semibold uppercase tracking-wider transition-all ${!isPublic ? 'bg-white text-[#D4AF37] shadow-sm' : 'text-slate-400'}`}
                >
                  <Lock size={11} strokeWidth={2} /> Privado
                </button>
              </div>

              {/* Campo de Senha */}
              {!isPublic && (
                <div className="flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="relative group">
                    <input
                      name="password"
                      // Altera dinamicamente entre password e text
                      type={showPassword ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      minLength={4}
                      maxLength={8}
                      defaultValue={initialData?.password || ''}
                      className="w-full pl-3 pr-10 h-9 bg-white border border-[#F3E5AB] rounded-[0.4rem] text-[11px] font-medium tracking-[0.2em] outline-none focus:border-[#D4AF37] shadow-sm transition-all"
                      // Na edição, se já existe senha, o required pode ser opcional
                      // para não obrigar a redigitar se não mudar nada
                      required={!isPublic} // Sempre obrigatório se for privado
                      placeholder="Senha (4-8 dígitos)"
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '');
                      }}
                    />

                    {/* Botão de alternar visibilidade (Ver/Ocultar) */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#D4AF37] transition-colors p-1"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
