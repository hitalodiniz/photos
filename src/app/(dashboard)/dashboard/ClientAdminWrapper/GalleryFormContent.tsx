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
  Sparkles,
  X,
  Briefcase,
  Settings2,
  Camera,
  Tag,
  ShieldCheck,
  Check,
  Layout,
  Monitor,
  Palette,
  Smartphone,
  Tablet,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export const prepareGalleryData = (
  formData: FormData,
  customization: {
    showCoverInGrid: boolean;
    gridBgColor: string;
    columns: { mobile: number; tablet: number; desktop: number };
  },
) => {
  const isPublic = formData.get('is_public') === 'true';
  const hasContractingClient =
    formData.get('has_contracting_client') === 'true';

  if (!hasContractingClient) {
    formData.set('client_name', 'Cobertura');
    formData.set('client_whatsapp', '');
  } else {
    const whatsapp = formData.get('client_whatsapp') as string;
    if (whatsapp) formData.set('client_whatsapp', whatsapp.replace(/\D/g, ''));
  }

  const password = formData.get('password') as string;
  if (isPublic || !password || password.trim() === '') {
    formData.delete('password');
  }

  formData.set('location', formData.get('location') || '');
  formData.set('category', formData.get('category') || '');
  formData.set('show_cover_in_grid', String(customization.showCoverInGrid));
  formData.set('grid_bg_color', customization.gridBgColor);
  formData.set('columns_mobile', String(customization.columns.mobile));
  formData.set('columns_tablet', String(customization.columns.tablet));
  formData.set('columns_desktop', String(customization.columns.desktop));

  return formData;
};

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

  // --- Sub-componente Header (Semibold Editorial) ---
  const SectionHeader = ({
    icon: Icon,
    title,
  }: {
    icon: any;
    title: string;
  }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center justify-center w-8 h-8 rounded-[0.5rem] bg-[#F3E5AB]/30 text-[#D4AF37] shrink-0 border border-[#D4AF37]/10">
        <Icon size={16} strokeWidth={2} />
      </div>
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-800 whitespace-nowrap">
        {title}
      </h4>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-[#F3E5AB] to-transparent opacity-50" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-6">
      {/* BLOCO 1: IDENTIFICAÇÃO */}
      <section className="space-y-4">
        <SectionHeader icon={ShieldCheck} title="Identificação" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-4 space-y-1.5">
            <label>
              <Briefcase size={12} strokeWidth={2} /> Tipo
            </label>
            <div className="relative flex w-full p-1.5 bg-slate-50 rounded-[0.5rem] border border-slate-200 h-[48px] items-center">
              <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-[0.4rem] transition-all duration-300 ease-out shadow-sm border ${
                  hasContractingClient
                    ? 'left-1.5 bg-[#F3E5AB] border-[#D4AF37]/30'
                    : 'left-[calc(50%+3px)] bg-[#F3E5AB] border-[#D4AF37]/30'
                }`}
              />
              <button
                type="button"
                onClick={() => setHasContractingClient(true)}
                className={`relative z-10 flex-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${hasContractingClient ? 'text-slate-900' : 'text-slate-400'}`}
              >
                Contrato
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasContractingClient(false);
                  setIsPublic(true);
                }}
                className={`relative z-10 flex-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${!hasContractingClient ? 'text-slate-900' : 'text-slate-400'}`}
              >
                Cobertura
              </button>
            </div>
          </div>

          {hasContractingClient ? (
            <>
              <div className="md:col-span-5 space-y-1.5 animate-in fade-in slide-in-from-left-4 duration-300">
                <label>
                  <User size={12} strokeWidth={2} /> Cliente
                </label>
                <input
                  name="client_name"
                  defaultValue={initialData?.client_name}
                  required={!!hasContractingClient}
                  placeholder="Ex: Ana Souza"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-[0.5rem] text-sm font-medium outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>
              <div className="md:col-span-3 space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                <label>
                  <WhatsAppIcon className="w-3 h-3 text-slate-400" /> WhatsApp
                </label>
                <input
                  value={clientWhatsapp}
                  name="client_whatsapp"
                  onChange={(e) => setClientWhatsapp(maskPhone(e))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-[0.5rem] text-sm font-medium outline-none focus:border-[#D4AF37] tracking-widest transition-all"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-8 h-[48px] flex items-center px-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-[0.5rem] italic">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Job registrado como cobertura de evento livre.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* BLOCO 2: ENTREGA */}
      <section className="space-y-4">
        <SectionHeader icon={Camera} title="Galeria de Fotos" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label>
              <Type size={12} strokeWidth={2} /> Título Editorial
            </label>
            <input
              name="title"
              defaultValue={initialData?.title}
              required
              placeholder="Ex: Wedding Editorial"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-[0.5rem] text-sm font-medium outline-none focus:border-[#D4AF37] transition-all"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <label>
              <Tag size={12} strokeWidth={2} /> Categoria
            </label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>
          <div className="md:col-span-4 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label>
                <Calendar size={12} strokeWidth={2} /> Data
              </label>
              <input
                name="date"
                type="date"
                defaultValue={initialData?.date}
                required
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-[0.5rem] text-sm font-medium outline-none focus:border-[#D4AF37]"
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
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-[0.5rem] text-sm font-medium outline-none focus:border-[#D4AF37] placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 3: APARÊNCIA */}
      <section className="space-y-4">
        <SectionHeader icon={Palette} title="Aparência Customizada" />
        <div className="flex flex-col md:flex-row md:items-center p-5 bg-white border border-slate-200 rounded-[0.5rem] shadow-sm gap-8">
          <div className="flex items-center gap-4 pr-8 md:border-r border-slate-100 shrink-0">
            <label className="!mb-0 whitespace-nowrap">Foto de fundo</label>
            <button
              type="button"
              onClick={() =>
                setCustomization.setShowCoverInGrid(
                  !customization.showCoverInGrid,
                )
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                customization.showCoverInGrid ? 'bg-[#D4AF37]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${customization.showCoverInGrid ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center gap-6 pr-8 md:border-r border-slate-100 shrink-0">
            <label className="!mb-0 whitespace-nowrap">
              <Layout size={14} strokeWidth={2} /> Fundo
            </label>
            <div className="flex gap-2">
              {[
                { name: 'Champagne', color: '#F3E5AB' },
                { name: 'Branco', color: '#FFFFFF' },
                { name: 'Escuro', color: '#0F172A' },
              ].map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() => setCustomization.setGridBgColor(item.color)}
                  className={`w-8 h-8 rounded-[0.4rem] border-2 transition-all ${
                    customization.gridBgColor === item.color
                      ? 'border-[#D4AF37] scale-110 shadow-md'
                      : 'border-slate-100'
                  }`}
                  style={{ backgroundColor: item.color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="!mb-0 whitespace-nowrap">Grid</label>
            <div className="flex gap-4">
              {[
                { key: 'mobile', icon: Smartphone },
                { key: 'tablet', icon: Tablet },
                { key: 'desktop', icon: Monitor },
              ].map((device) => (
                <div
                  key={device.key}
                  className="flex flex-col items-center gap-1"
                >
                  <device.icon
                    size={12}
                    className="text-slate-300"
                    strokeWidth={2}
                  />
                  <select
                    value={customization.columns[device.key]}
                    onChange={(e) =>
                      setCustomization.setColumns({
                        ...customization.columns,
                        [device.key]: Number(e.target.value),
                      })
                    }
                    className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-[0.3rem] text-[10px] font-semibold text-slate-800 outline-none focus:border-[#D4AF37]"
                  >
                    {[1, 2, 3, 4, 5, 6].map((v) => (
                      <option key={v} value={v}>
                        {v} col
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
      <section className="space-y-4">
        <SectionHeader icon={Settings2} title="Drive e Segurança" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-7 p-6 bg-white border border-slate-200 rounded-[0.5rem] shadow-sm space-y-4">
            <label className="!mb-0">
              <FolderSync size={14} strokeWidth={2} /> Armazenamento
            </label>
            <div className="flex items-center gap-3">
              <GooglePickerButton
                onError={onPickerError}
                onFolderSelect={(id, name, coverId) =>
                  setDriveData({ id, name, coverId })
                }
                currentDriveId={driveData.id}
              />
              <div className="flex-1 bg-slate-50 px-4 h-11 rounded-[0.5rem] border border-slate-200 flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`h-2 w-2 rounded-full ${driveData.id ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}
                  />
                  <span className="text-[11px] font-semibold truncate text-slate-700 uppercase tracking-widest">
                    {driveData.name}
                  </span>
                </div>
                {driveData.id && (
                  <X
                    size={14}
                    className="text-slate-300 cursor-pointer hover:text-red-500"
                    onClick={() =>
                      setDriveData({
                        id: '',
                        name: 'Nenhuma pasta selecionada',
                        coverId: '',
                      })
                    }
                  />
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-5 p-6 bg-white border border-slate-200 rounded-[0.5rem] shadow-sm space-y-4">
            <label className="!mb-0">
              <Lock size={14} strokeWidth={2} /> Privacidade
            </label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-around h-11 bg-slate-50 rounded-[0.5rem] border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest transition-all ${isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                >
                  <Unlock size={14} strokeWidth={2} /> Pública
                </button>
                <div className="w-[1px] h-4 bg-slate-200" />
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest transition-all ${!isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                >
                  <Lock size={14} strokeWidth={2} /> Privada
                </button>
              </div>
              {!isPublic && (
                <input
                  name="password"
                  type="password"
                  placeholder={
                    isEdit ? 'Manter senha atual' : 'Definir senha de acesso'
                  }
                  className="w-full px-4 py-2 bg-white border border-[#F3E5AB] rounded-[0.5rem] text-[11px] font-medium outline-none focus:border-[#D4AF37] transition-all h-10"
                  required={!isEdit && !isPublic}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
