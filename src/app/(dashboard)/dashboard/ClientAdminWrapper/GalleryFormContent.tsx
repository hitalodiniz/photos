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
  MessageCircle,
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
    formData.set('clientName', 'Venda Direta');
    formData.set('client_whatsapp', '');
  }

  const password = formData.get('password') as string;
  if (isPublic || !password || password.trim() === '') {
    formData.delete('password');
  }

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
  // Inicialização estável
  const [hasContractingClient, setHasContractingClient] = useState(
    () => initialData?.has_contracting_client ?? true,
  );
  const [isPublic, setIsPublic] = useState(
    () => initialData?.is_public ?? true,
  );
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

  const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-champagne-dark/20 text-[#D4AF37] shrink-0">
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 whitespace-nowrap">
        {title}
      </h4>
      <div className="h-[2px] flex-1 bg-champagne-dark opacity-40" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <input type="hidden" name="drive_folder_id" value={driveData.id} />
      <input type="hidden" name="drive_folder_name" value={driveData.name} />
      <input
        type="hidden"
        name="cover_image_url"
        value={driveData.coverId || driveData.id}
      />

      {/* Os demais inputs ocultos devem seguir a mesma lógica */}
      <input type="hidden" name="is_public" value={String(isPublic)} />
      <input type="hidden" name="category" value={category} />
      <input
        type="hidden"
        name="has_contracting_client"
        value={String(hasContractingClient)}
      />

      {/* BLOCO 1: IDENTIFICAÇÃO */}
      <section className="space-y-4">
        <SectionHeader icon={ShieldCheck} title="Identificação" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3 space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400">
              <Briefcase size={10} /> Tipo
            </label>
            <div className="relative flex w-full p-1 bg-slate-100/80 rounded-xl border border-slate-200/50 h-[45px] items-center">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out border ${hasContractingClient ? 'left-1 bg-champagne-dark border-gold/30' : 'left-[calc(50%+2px)] bg-champagne-dark border-gold/30'}`}
              />
              <button
                type="button"
                onClick={() => setHasContractingClient(true)}
                className="relative z-10 flex-1 py-1.5 text-[9px] font-semibold uppercase tracking-widest transition-colors text-slate-900"
              >
                Contrato
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasContractingClient(false);
                  setIsPublic(true);
                }}
                className="relative z-10 flex-1 py-1.5 text-[9px] font-semibold uppercase tracking-widest transition-colors text-slate-700"
              >
                Cobertura
              </button>
            </div>
          </div>
          {hasContractingClient ? (
            <>
              <div className="md:col-span-6 space-y-1.5 animate-in fade-in slide-in-from-left-4 duration-500">
                <label className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400">
                  <User size={10} /> Nome do Cliente
                </label>
                <input
                  name="clientName"
                  defaultValue={initialData?.client_name}
                  required={hasContractingClient}
                  placeholder="Ex: José Silva"
                  className="w-full px-4 py-2.5 bg-white border border-[#F3E5AB] rounded-xl text-sm outline-none focus:border-gold transition-all"
                />
              </div>
              <div className="md:col-span-3 space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-500">
                <label className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400">
                  <MessageCircle size={10} /> WhatsApp
                </label>
                <input
                  value={clientWhatsapp}
                  name="client_whatsapp"
                  onChange={(e) => setClientWhatsapp(maskPhone(e))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full px-4 py-2.5 bg-white border border-[#F3E5AB] rounded-xl text-sm outline-none focus:border-gold tracking-tight transition-all"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-9 h-[45px] flex items-center px-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl animate-in zoom-in-95 duration-500">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 italic">
                No tipo Cobertura não é necessário identificar o cliente.
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
            <label className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400">
              <Type size={10} /> Título da Galeria
            </label>
            <input
              name="title"
              defaultValue={initialData?.title}
              required
              placeholder="Ex: Ensaio Gestante"
              className="w-full px-4 py-2.5 bg-white border border-[#F3E5AB] rounded-xl text-sm outline-none focus:border-gold"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400">
              <Tag size={10} /> Categoria
            </label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>
          <div className="md:col-span-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400">
                <Calendar size={10} /> Data
              </label>
              <input
                name="date"
                type="date"
                defaultValue={initialData?.date}
                required
                className="w-full px-3 py-2.5 bg-white border border-[#F3E5AB] rounded-xl text-sm outline-none focus:border-gold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400">
                <MapPin size={10} /> Local
              </label>
              <input
                name="location"
                defaultValue={initialData?.location}
                placeholder="Cidade/UF"
                className="w-full px-3 py-2.5 bg-white border border-[#F3E5AB] rounded-xl text-sm outline-none focus:border-gold placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 3: APARÊNCIA (LINHA ÚNICA) */}
      <section className="space-y-3">
        <SectionHeader icon={Palette} title="Aparência da Galeria" />
        <div className="flex items-center justify-start p-3 bg-white border border-[#F3E5AB] rounded-2xl shadow-sm overflow-x-auto gap-6">
          {/* FOTO DE FUNDO */}
          <div className="flex items-center gap-3 pr-6 border-r border-slate-100 shrink-0">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-700 whitespace-nowrap">
              Foto de fundo
            </label>
            <button
              type="button"
              onClick={() =>
                setCustomization.setShowCoverInGrid(
                  !customization.showCoverInGrid,
                )
              }
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${customization.showCoverInGrid ? 'bg-[#D4AF37]' : 'bg-slate-200'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${customization.showCoverInGrid ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* COR DE FUNDO */}
          <div className="flex items-center gap-4 shrink-0 border-r border-slate-100 pr-6">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-700 flex items-center gap-2">
              <Layout size={14} className="text-[#D4AF37]" /> Cor
            </label>
            <div className="flex gap-1.5">
              {[
                { name: 'Champagne', color: '#FFF9F0' },
                { name: 'Branco', color: '#FFFFFF' },
                { name: 'Escuro', color: '#0F172A' },
              ].map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() => setCustomization.setGridBgColor(item.color)}
                  className={`relative w-7 h-7 rounded-lg border-2 transition-all ${customization.gridBgColor === item.color ? 'border-gold scale-105 shadow-sm' : 'border-slate-100'}`}
                >
                  <div
                    className="absolute inset-0.5 rounded-md"
                    style={{ backgroundColor: item.color }}
                  />
                  {customization.gridBgColor === item.color && (
                    <div className="absolute -top-1 -right-1 bg-gold text-white rounded-full p-0.5">
                      <Check size={5} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* COLUNAS */}
          <div className="flex items-center gap-4 shrink-0">
            <label className="text-[10px] font-semibold uppercase text-slate-700">
              Colunas
            </label>
            <div className="flex gap-4">
              {[
                {
                  label: 'Mob',
                  key: 'mobile',
                  icon: Smartphone,
                  max: 2,
                  min: 1,
                },
                { label: 'Tab', key: 'tablet', icon: Tablet, max: 5, min: 2 },
                {
                  label: 'Desk',
                  key: 'desktop',
                  icon: Monitor,
                  max: 8,
                  min: 3,
                },
              ].map((device) => (
                <div key={device.key} className="flex flex-col gap-1 shrink-0">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <device.icon size={10} />
                    <span className="text-[8px] font-semibold">
                      {device.label}
                    </span>
                  </div>
                  <select
                    value={customization.columns[device.key]}
                    onChange={(e) =>
                      setCustomization.setColumns({
                        ...customization.columns,
                        [device.key]: Number(e.target.value),
                      })
                    }
                    className="bg-slate-50 border border-slate-100 px-1 py-0.5 rounded-md text-[10px] font-semibold text-slate-700 outline-none w-12"
                  >
                    {Array.from(
                      { length: device.max - device.min + 1 },
                      (_, i) => i + device.min,
                    ).map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 4: SEGURANÇA */}
      <section>
        <SectionHeader icon={Settings2} title="Drive e Segurança" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-7 flex flex-col justify-between p-5 bg-white border border-[#F3E5AB] rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400">
                <FolderSync size={14} className="text-[#D4AF37]" /> Google Drive
              </label>
              {driveData.id && (
                <Sparkles size={12} className="text-green-500 animate-pulse" />
              )}
            </div>

            <div className="flex items-center gap-3 w-full">
              <GooglePickerButton
                onError={onPickerError}
                onFolderSelect={(id, name, coverId) => {
                  // O log confirmou que chega aqui. Agora o estado atualiza a tela.
                  setDriveData({ id, name, coverId });
                }}
                currentDriveId={driveData.id}
              />

              <div className="flex-1 bg-white px-4 py-2.5 rounded-xl border border-[#F3E5AB] flex items-center justify-between gap-3 min-w-0 h-[42px] shadow-sm">
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${driveData.id ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}
                  />
                  <span className="text-[11px] font-medium truncate tracking-tight text-slate-700">
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
          <div className="md:col-span-5 flex flex-col justify-between p-5 bg-white border border-[#F3E5AB] rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <Settings2 size={14} className="text-[#D4AF37]" /> Acesso
              </label>
              {!isPublic && (
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-8 px-4 h-[42px] bg-slate-50/50 rounded-xl border border-slate-100/50">
                <label
                  className={`flex items-center gap-2 cursor-pointer text-[10px] font-semibold uppercase tracking-wider transition-all ${isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                >
                  <input
                    type="radio"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="hidden"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isPublic ? 'border-[#D4AF37]' : 'border-slate-200'}`}
                  >
                    {isPublic && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </div>
                  <Unlock size={14} /> Pública
                </label>
                <label
                  className={`flex items-center gap-2 cursor-pointer text-[10px] font-semibold uppercase tracking-wider transition-all ${!isPublic ? 'text-[#D4AF37]' : 'text-slate-300'}`}
                >
                  <input
                    type="radio"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="hidden"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!isPublic ? 'border-[#D4AF37]' : 'border-slate-200'}`}
                  >
                    {!isPublic && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </div>
                  <Lock size={14} /> Privada
                </label>
              </div>
              {!isPublic && (
                <input
                  name="password"
                  type="password"
                  placeholder={isEdit ? 'Manter senha atual' : 'Definir senha'}
                  className="w-full px-4 py-2 bg-white border border-[#F3E5AB] rounded-xl text-xs outline-none focus:border-gold transition-all"
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
