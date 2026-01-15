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
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export default function GalleryFormContent({
  initialData = null,
  isEdit = false,
  customization,
  setCustomization,
  onPickerError,
}) {
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

  const SectionHeader = ({
    icon: Icon,
    title,
  }: {
    icon: any;
    title: string;
  }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-[0.4rem] bg-[#F3E5AB]/30 text-[#D4AF37] shrink-0 border border-[#D4AF37]/10">
        <Icon size={14} strokeWidth={2} />
      </div>
      <h4 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-800 whitespace-nowrap">
        {title}
      </h4>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-[#F3E5AB] to-transparent opacity-40" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-4">
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
      <section>
        <SectionHeader icon={ShieldCheck} title="Identificação" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
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
                className={`relative z-10 flex-1 text-[9px] font-semibold uppercase tracking-widest transition-colors ${hasContractingClient ? 'text-black' : 'text-slate-400'}`}
              >
                Contrato
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasContractingClient(false);
                  setIsPublic(true);
                }}
                className={`relative z-10 flex-1 text-[9px] font-semibold uppercase tracking-widest transition-colors ${!hasContractingClient ? 'text-black' : 'text-slate-400'}`}
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
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 italic">
                Identificação de cliente opcional em coberturas.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* BLOCO 2: ENTREGA */}
      <section>
        <SectionHeader icon={Camera} title="Galeria de Fotos" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label>
              <Type size={12} strokeWidth={2} /> Título Editorial
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
      </section>

      {/* BLOCO 3: APARÊNCIA */}
      <section>
        <SectionHeader icon={Palette} title="Customização Visual" />
        <div className="flex flex-wrap p-3 bg-white border border-slate-200 rounded-[0.5rem] gap-6 items-center shadow-sm">
          <div className="flex items-center gap-4 pr-6 md:border-r border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <label className="!mb-0 text-slate-500 font-semibold uppercase tracking-widest text-[9px] whitespace-nowrap">
                Foto de fundo
              </label>

              {/* Tooltip Customizado Editorial */}
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] transition-colors cursor-help">
                  <span className="text-[9px] font-bold">?</span>
                </div>

                {/* Balão do Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-50">
                  <p>
                    Usa a foto selecionada no Google Drive como fundo da grade
                    de fotos galeria.
                  </p>
                  {/* Setinha do balão */}
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
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ease-in-out ${
                customization.showCoverInGrid ? 'bg-[#D4AF37]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  customization.showCoverInGrid ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-4 pr-6 md:border-r border-slate-100 shrink-0">
            <label className="!mb-0 flex items-center gap-2">
              <Layout size={13} strokeWidth={2} className="text-[#D4AF37]" />
              <span className="text-slate-500 font-semibold uppercase tracking-widest text-[9px]">
                Cor
              </span>
            </label>

            <div className="flex items-center gap-3">
              {/* Cores rápidas (Paleta Principal) */}
              <div className="flex gap-1.5 border-r border-slate-100 pr-3">
                {['#F3E5AB', '#FFFFFF', '#000000'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCustomization.setGridBgColor(c)}
                    className={`w-5 h-5 rounded-[0.3rem] border transition-all ${
                      customization.gridBgColor === c
                        ? 'border-[#D4AF37] scale-110 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Seletor Customizado + Input Teclado */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[0.4rem] px-1.5 h-8">
                {/* Container do Color Picker Nativo */}
                <div
                  className="w-5 h-5 rounded-[0.3rem] border border-slate-200 overflow-hidden relative shadow-sm shrink-0"
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
                    className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer opacity-0"
                  />
                </div>

                {/* Input de Texto para RGB/HEX */}
                <input
                  type="text"
                  maxLength={7}
                  value={customization.gridBgColor}
                  onChange={(e) => {
                    let val = e.target.value.toUpperCase();
                    // Garante que comece com # e aceite apenas hex válido
                    if (!val.startsWith('#')) val = '#' + val;
                    setCustomization.setGridBgColor(val);
                  }}
                  className="w-16 bg-transparent text-[10px] font-mono font-semibold text-slate-600 outline-none uppercase tracking-tighter"
                  placeholder="#HEX"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="!mb-0 text-slate-500 font-semibold uppercase tracking-widest text-[9px]">
              Grid
            </label>
            <div className="flex gap-4">
              {[
                { k: 'mobile', i: Smartphone },
                { k: 'tablet', i: Tablet },
                { k: 'desktop', i: Monitor },
              ].map((d) => (
                /* Alterado para flex-row e items-center para alinhar à esquerda */
                <div key={d.k} className="flex flex-row items-center gap-1.5">
                  <d.i
                    size={11}
                    className="text-slate-300 shrink-0"
                    strokeWidth={2}
                  />
                  <select
                    value={customization.columns[d.k]}
                    onChange={(e) =>
                      setCustomization.setColumns({
                        ...customization.columns,
                        [d.k]: Number(e.target.value),
                      })
                    }
                    className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-[0.3rem] text-[9px] font-semibold text-slate-800 outline-none hover:border-[#D4AF37] cursor-pointer transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 4: DRIVE E SEGURANÇA */}
      <section>
        <SectionHeader icon={Settings2} title="Drive e Segurança" />
        <div className="bg-white border border-slate-200 rounded-[0.5rem] divide-y md:divide-y-0 md:divide-x divide-slate-100 grid grid-cols-1 md:grid-cols-12 items-stretch overflow-hidden shadow-sm">
          {/* ARMAZENAMENTO */}
          <div className="md:col-span-7 p-4 space-y-3 min-w-0">
            <div className="flex items-center gap-2">
              <label className="!mb-0 flex items-center gap-2">
                <FolderSync
                  size={13}
                  strokeWidth={2}
                  className="text-[#D4AF37]"
                />
                <span className="text-slate-500 font-semibold uppercase tracking-widest text-[9px]">
                  Armazenamento
                </span>
              </label>

              {/* Tooltip Ajustado para não cortar */}
              <div className="group relative flex items-center">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] transition-colors cursor-help">
                  <span className="text-[9px] font-bold">?</span>
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
          <div className="md:col-span-5 p-4 space-y-3">
            <label className="!mb-0">
              <Lock size={13} strokeWidth={2} className="text-[#D4AF37]" />{' '}
              Privacidade
            </label>
            <div className="space-y-3">
              {/* Seletor de modo */}
              <div className="flex items-center bg-slate-50 rounded-[0.4rem] border border-slate-200 p-1 gap-1 w-full max-w-[200px]">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[0.3rem] text-[9px] font-semibold uppercase tracking-wider transition-all ${isPublic ? 'bg-white text-[#D4AF37] shadow-sm' : 'text-slate-400'}`}
                >
                  <Unlock size={11} strokeWidth={2} /> Público
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[0.3rem] text-[9px] font-semibold uppercase tracking-wider transition-all ${!isPublic ? 'bg-white text-[#D4AF37] shadow-sm' : 'text-slate-400'}`}
                >
                  <Lock size={11} strokeWidth={2} /> Privado
                </button>
              </div>

              {/* 🎯 SENHA AGORA EMBAIXO PARA NÃO VAZAR */}
              {!isPublic && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <input
                    name="password"
                    type="password"
                    placeholder="Defina a senha de acesso"
                    className="w-full px-3 h-9 bg-white border border-[#F3E5AB] rounded-[0.4rem] text-[11px] font-medium outline-none focus:border-[#D4AF37] shadow-sm"
                    required={!isEdit && !isPublic}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
