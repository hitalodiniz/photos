'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import {
  Camera,
  User,
  AtSign,
  FileText,
  Sparkles,
  Loader2,
  MessageCircle,
  Instagram,
  Upload,
  MapPin,
  X,
  CheckCircle2,
  Save,
  AlertCircle,
  Pencil,
  ArrowLeft,
  LayoutDashboard,
} from 'lucide-react';

import { upsertProfile } from '@/core/services/profile';
import { supabase } from '@/lib/supabase.client';
import { maskPhone } from '@/core/utils/masks';
import ProfilePreview from './ProfilePreview';
import { div } from 'framer-motion/client';
import { Toast } from '@/components/ui';

// --- AUXILIARES ---
const fetchStates = async () => {
  const response = await fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
  );
  return await response.json();
};

const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Tamanho ideal para avatar de luxo
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Exporta como WebP com 80% de qualidade (Equilíbrio entre luxo e leveza)
        canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.8);
      };
    };
  });
};

const fetchCitiesByState = async (uf: string, query: string) => {
  if (query.length < 2) return [];
  try {
    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
    );
    const data = await response.json();
    return data
      .filter((item: any) =>
        item.nome.toLowerCase().includes(query.toLowerCase()),
      )
      .map((item: any) => `${item.nome}, ${uf}`);
  } catch (error) {
    console.error('Erro IBGE:', error);
    return [];
  }
};

export function SubmitOnboarding() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full py-5 rounded-2xl font-bold uppercase text-xs tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
        pending
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-champagne-dark hover:bg-[#e6d595] text-slate-900 shadow-[#F3E5AB]/20'
      }`}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" size={18} /> Salvando...
        </>
      ) : (
        <>
          <Save size={16} /> Salvar perfil
        </>
      )}
    </button>
  );
}

export default function OnboardingForm({
  initialData,
  suggestedUsername,
  isEditMode,
}: any) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [username, setUsername] = useState(
    initialData?.username || suggestedUsername,
  );
  const [miniBio, setMiniBio] = useState(initialData?.mini_bio || '');
  const [phone, setPhone] = useState(initialData?.phone_contact || '');
  const [instagram, setInstagram] = useState(initialData?.instagram_link || '');
  const [selectedCities, setSelectedCities] = useState<string[]>(
    initialData?.operating_cities || [],
  );
  const [states, setStates] = useState<{ sigla: string; nome: string }[]>([]);
  const [selectedUF, setSelectedUF] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.profile_picture_url || null,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStates().then(setStates);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (cityInput.length >= 2 && selectedUF) {
        const results = await fetchCitiesByState(selectedUF, cityInput);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cityInput, selectedUF]);

  useEffect(() => {
    if (initialData?.phone_contact) {
      const masked = maskPhone({
        target: { value: initialData.phone_contact },
      } as any);
      setPhone(masked);
    }
  }, [initialData]);

  const isPhoneValid = phone.replace(/\D/g, '').length >= 11;

  useEffect(() => {
    if (!username || username === initialData?.username) {
      setIsAvailable(null);
      return;
    }
    const check = async () => {
      setIsChecking(true);
      const { data } = await supabase
        .from('tb_profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      setIsAvailable(!data);
      setIsChecking(false);
    };
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, [username, initialData?.username]);

  const handleSelectCity = (city: string) => {
    if (!selectedCities.includes(city))
      setSelectedCities((prev) => [...prev, city]);
    setCityInput('');
    setSuggestions([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const [toastConfig, setToastConfig] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const clientAction = async (formData: FormData) => {
    setIsSaving(true);

    // 1. Adiciona as cidades como JSON
    formData.set('operating_cities_json', JSON.stringify(selectedCities));

    // 2. Processa e Comprime a Foto (Evita o "Failed to Fetch")
    if (photoFile) {
      try {
        // Usamos a função compressImage que criamos anteriormente
        const compressedBlob = await compressImage(photoFile);
        formData.set('profile_picture_file', compressedBlob, 'avatar.webp');
      } catch (e) {
        console.error('Erro na compressão:', e);
        // Se a compressão falhar, tentamos enviar o original como fallback
        formData.set('profile_picture_file', photoFile);
      }
    } else if (photoPreview) {
      formData.set('profile_picture_url_existing', photoPreview);
    }

    try {
      // 3. Chamada para a Server Action
      const result = await upsertProfile(formData);

      if (result?.success) {
        setShowSuccessModal(true);
        // Opcional: Feedback sutil de sucesso além do modal
        setToastConfig({
          message: 'Perfil salvo com sucesso!',
          type: 'success',
        });
      } else {
        // 4. Substituição do Alert pelo Toast de Luxo (12px/14px)
        setToastConfig({
          message: result?.error || 'Não foi possível salvar os dados.',
          type: 'error',
        });
      }
    } catch (err) {
      // 5. Captura de erro de rede (Ex: Arquivo ainda muito grande ou queda de sinal)
      setToastConfig({
        message:
          'Erro de conexão. Verifique o tamanho da foto ou sua internet.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const containerBaseClass =
    'fixed inset-0 top-0 bg-white flex w-full font-sans z-[9999] overflow-hidden ';

  return (
    <>
      <div className={containerBaseClass}>
        {/* ASIDE REFINADO - ESTILO LUXO EDITORIAL */}
        <aside className="w-[35%] bg-white border-r border-slate-100 p-6 pt-8 flex flex-col h-full relative z-20 overflow-y-auto no-scrollbar shadow-xl">
          {/* 1. Botão Secundário de Voltar (Compacto) */}
          {isEditMode && (
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 mb-6 rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <LayoutDashboard size={14} />
              Voltar ao espaço premium
            </button>
          )}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-champagne-dark/20 rounded-lg">
              <Camera className="text-[#D4AF37]" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-[14px] md:text-[18px] tracking-tight uppercase">
                {isEditMode ? 'Editar Perfil' : 'Configuração Profissional'}
              </h1>
            </div>
          </div>

          <form action={clientAction} className="space-y-5 flex-grow pb-10">
            <div className="flex flex-col items-center">
              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-16 h-16 md:w-24 md:h-24 rounded-full p-[3px] bg-gradient-to-tr from-[#34A853] via-[#FBBC05] via-[#EA4335] to-[#4285F4] shadow-xl cursor-pointer transition-all hover:scale-105 active:scale-95 overflow-hidden"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center relative">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          className="w-full h-full object-cover object-center scale-110"
                          alt="Preview"
                        />
                      ) : (
                        <Upload size={30} className="text-slate-200" />
                      )}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-white border border-slate-200 p-2 rounded-full shadow-lg text-slate-600 hover:text-[#D4AF37] transition-colors z-10"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                {photoPreview
                  ? 'Clique para alterar'
                  : 'Carregar foto de perfil'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>
                  <User size={14} className="text-[#D4AF37]" /> Nome Completo
                </label>
                <input
                  name="full_name"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3E5AB]"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>
                  <AtSign size={14} className="text-[#D4AF37]" /> Username
                </label>
                <div className="relative">
                  <input
                    name="username"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3E5AB]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isChecking ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isAvailable === true ? (
                      <CheckCircle2 size={12} className="text-green-500" />
                    ) : isAvailable === false ? (
                      <AlertCircle size={12} className="text-red-500" />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>
                  <MessageCircle size={14} className="text-[#D4AF37]" />{' '}
                  WhatsApp
                  {!isPhoneValid && phone.length > 0 && (
                    <span className="text-[10px] text-red-500 font-medium ml-auto">
                      Incompleto
                    </span>
                  )}
                </label>
                <input
                  name="phone_contact"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3E5AB] ${!isPhoneValid && phone.length > 0 ? 'border-red-400 bg-red-50/30' : ''}`}
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label>
                  <Instagram size={14} className="text-[#D4AF37]" /> Instagram
                </label>
                <input
                  name="instagram_link"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3E5AB]"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seu.perfil"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gold/20 p-4 bg-[#FAF7ED]">
              <div className="flex items-center gap-2 mb-3 text-[#D4AF37]">
                <MapPin size={16} />
                <label>Área de Atuação ({selectedCities.length})</label>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedCities.map((city) => (
                  <span
                    key={city}
                    className="bg-white border border-gold/20 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                  >
                    {city}
                    <X
                      size={10}
                      className="cursor-pointer text-slate-300 hover:text-red-500"
                      onClick={() =>
                        setSelectedCities(
                          selectedCities.filter((c) => c !== city),
                        )
                      }
                    />
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedUF}
                  onChange={(e) => {
                    setSelectedUF(e.target.value);
                    setCityInput('');
                    setSuggestions([]);
                  }}
                  className="w-20 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold text-[#4F5B66] outline-none"
                >
                  <option value="">UF</option>
                  {states.map((uf) => (
                    <option key={uf.sigla} value={uf.sigla}>
                      {uf.sigla}
                    </option>
                  ))}
                </select>

                <div className="relative flex-grow">
                  <input
                    disabled={!selectedUF}
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none"
                    placeholder={
                      selectedUF
                        ? 'Digite a cidade...'
                        : 'Selecione a UF primeiro'
                    }
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute z-[100] w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-2xl max-h-48 overflow-y-auto no-scrollbar">
                      {suggestions.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleSelectCity(city)}
                          className="w-full text-left px-4 py-3 text-[11px] font-bold text-[#4F5B66] hover:bg-[#FAF7ED] border-b border-slate-50 last:border-0 transition-colors"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label>
                <FileText size={14} className="text-[#D4AF37]" /> Mini Bio
                Editorial
              </label>
              <textarea
                name="mini_bio"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3E5AB]"
                value={miniBio || ''}
                onChange={(e) => setMiniBio(e.target.value)}
                rows={3}
              />
            </div>

            <SubmitOnboarding />
          </form>
        </aside>

        <main
          className="w-[60%] h-full bg-black overflow-y-auto 
        custom-scrollbar relative flex-grow"
        >
          <div className="absolute top-10 left-10 z-[100] flex items-center gap-4 px-6 pointer-events-none">
            <div className="w-1.5 h-14 bg-champagne-dark rounded-full animate-pulse shadow-[0_0_20px_rgba(243,229,171,0.8)]"></div>
            <div className="flex flex-col justify-center">
              <p className="text-[14px] text-[#F3E5AB] font-bold uppercase tracking-[0.5em] leading-none mb-1 drop-shadow-lg">
                Editorial
              </p>
              <p className="text-[18px] text-white/90 font-serif italic tracking-wide leading-none py-2 drop-shadow-md">
                Prévia do seu perfil
              </p>
            </div>
          </div>

          <ProfilePreview
            initialData={{
              full_name: fullName,
              username: username,
              mini_bio: miniBio,
              phone_contact: phone,
              instagram_link: instagram,
              avatar_url: photoPreview,
              cities: selectedCities,
            }}
          />
        </main>

        {showSuccessModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center border border-white/20">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                Perfil Consolidado!
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                Sua presença editorial foi atualizada com sucesso. Como deseja
                prosseguir?
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href={`/${username}`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-[#F3E5AB] py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                  <Sparkles size={16} />
                  Visualizar Perfil Público
                </a>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-champagne-dark text-slate-900 py-4 rounded-xl font-bold text-sm hover:bg-[#e6d595] transition-colors"
                >
                  Ir para o Dashboard
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full text-slate-400 py-2 text-xs font-bold hover:text-slate-600 transition-colors"
                >
                  Continuar Refinando
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* RENDERIZAÇÃO DO TOAST: Estilo Luxo 12px/14px */}
      {toastConfig && (
        <Toast
          message={toastConfig.message}
          type={toastConfig.type}
          onClose={() => setToastConfig(null)}
        />
      )}
    </>
  );
}
