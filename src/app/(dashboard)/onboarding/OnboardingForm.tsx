'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  LayoutDashboard,
} from 'lucide-react';

import {
  getPublicProfile,
  upsertProfile,
} from '@/core/services/profile.service';
import { maskPhone } from '@/core/utils/masks-helpers';
import ProfilePreview from './ProfilePreview';
import { Toast } from '@/components/ui';
import { useFormStatus } from 'react-dom';
import { fetchStates, fetchCitiesByState } from '@/core/utils/cidades-helpers';
import { compressImage } from '@/core/utils/user-helpers';

export function SubmitOnboarding({ isSaving }: { isSaving: boolean }) {
  const { pending } = useFormStatus();
  const isLoading = pending || isSaving;

  return (
    <button
      type="submit"
      disabled={isLoading}
      className={`w-full py-5 rounded-2xl font-semibold uppercase text-xs tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
        isLoading
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-slate-900 text-[#F3E5AB] hover:bg-slate-800 shadow-xl'
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" size={18} /> Consolidando...
        </>
      ) : (
        <>
          <Save size={16} /> Salvar perfil profissional
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
  const [toastConfig, setToastConfig] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

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
      const { data } = await getPublicProfile(username);
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
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const clientAction = async (formData: FormData) => {
    if (isAvailable === false) {
      setToastConfig({
        message: 'Este username já está em uso.',
        type: 'error',
      });
      return;
    }
    setIsSaving(true);
    formData.set('operating_cities_json', JSON.stringify(selectedCities));

    if (photoFile) {
      try {
        const compressedBlob = await compressImage(photoFile);
        formData.set('profile_picture_file', compressedBlob, 'avatar.webp');
      } catch (e) {
        formData.set('profile_picture_file', photoFile);
      }
    } else if (photoPreview) {
      formData.set('profile_picture_url_existing', photoPreview);
    }

    try {
      const result = await upsertProfile(formData);
      if (result?.success) {
        setShowSuccessModal(true);
        setToastConfig({
          message: 'Perfil salvo com sucesso!',
          type: 'success',
        });
      } else {
        setToastConfig({
          message: result?.error || 'Erro ao salvar perfil.',
          type: 'error',
        });
      }
    } catch (err) {
      setToastConfig({
        message: 'Falha na conexão. Tente novamente.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // AJUSTE MOBILE: Deixamos o container com scroll livre no mobile e flex-col
  const containerBaseClass =
    'relative min-h-screen bg-white flex flex-col md:flex-row w-full font-sans z-[99]';

  // Função para limpar o link do Instagram e extrair apenas o username
  const handleInstagramChange = (val: string) => {
    let cleanValue = val.trim();

    // Se for uma URL completa, tenta extrair o username
    if (cleanValue.includes('instagram.com/')) {
      // Remove protocolos, query strings e limpa a barra final
      const parts = cleanValue.split('instagram.com/')[1]?.split(/[/?#]/)[0];
      if (parts) cleanValue = `@${parts}`;
    }

    // Garante que comece com @ se houver conteúdo
    if (cleanValue && !cleanValue.startsWith('@')) {
      cleanValue = `${cleanValue}`;
    }

    setInstagram(cleanValue.toLowerCase());
  };

  return (
    <>
      <div className={containerBaseClass}>
        {/* ASIDE: w-full no mobile, 35% no desktop */}
        <aside className="w-full md:w-[35%] bg-white border-r border-slate-100 p-6 pt-8 flex flex-col h-auto md:h-screen md:sticky md:top-0 z-20 md:overflow-y-auto no-scrollbar shadow-xl">
          {isEditMode && (
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 mb-6 rounded-xl font-semibold uppercase text-[10px] tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <LayoutDashboard size={14} />
              Voltar ao espaço premium
            </button>
          )}

          <div className="flex items-center gap-3 shrink-0 mb-8">
            <div className="p-2 bg-champagne-dark/20 rounded-lg">
              <Camera className="text-[#D4AF37]" size={24} />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 text-[14px] md:text-[18px] tracking-tight uppercase">
                {isEditMode ? 'Editar Perfil' : 'Configuração Profissional'}
              </h1>
            </div>
          </div>

          <form action={clientAction} className="space-y-5 pb-10">
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
                  className="relative w-20 h-20 md:w-24 md:h-24 rounded-full p-[3px] bg-gradient-to-tr from-[#34A853] via-[#FBBC05] via-[#EA4335] to-[#4285F4] shadow-xl cursor-pointer transition-all hover:scale-105 active:scale-95 overflow-hidden"
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
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-white border border-slate-200 p-2 rounded-full shadow-lg text-slate-600 z-10"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mt-2">
                {photoPreview ? 'Clique para alterar' : 'Carregar foto'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 mb-1 text-xs font-medium text-slate-700">
                  <User size={14} className="text-[#D4AF37]" /> Nome
                </label>
                <input
                  name="full_name"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#F3E5AB] outline-none"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-1 text-xs font-medium text-slate-700">
                  <AtSign size={14} className="text-[#D4AF37]" /> Username
                </label>
                <div className="relative">
                  <input
                    name="username"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#F3E5AB] outline-none"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._]/g, ''),
                      )
                    }
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 mb-1 text-xs font-medium text-slate-700">
                  <MessageCircle size={14} className="text-[#D4AF37]" />{' '}
                  WhatsApp
                </label>
                <input
                  name="phone_contact"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none ${!isPhoneValid && phone.length > 0 ? 'border-red-400' : ''}`}
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e))}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-1 text-xs font-medium text-slate-700">
                  <Instagram size={14} className="text-[#D4AF37]" /> Instagram
                </label>
                <input
                  name="instagram_link"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none"
                  value={instagram}
                  onChange={(e) => handleInstagramChange(e.target.value)}
                  placeholder="@seu.perfil"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gold/20 p-4 bg-[#FAF7ED]">
              <div className="flex items-center gap-2 mb-3 text-[#D4AF37] text-xs font-semibold uppercase">
                <MapPin size={16} /> Área de Atuação ({selectedCities.length})
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedCities.map((city) => (
                  <span
                    key={city}
                    className="bg-white border border-gold/20 text-slate-900 text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                  >
                    {city}{' '}
                    <X
                      size={10}
                      className="cursor-pointer"
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
                  className="w-20 bg-white border border-gray-200 rounded-xl px-2 py-2 text-xs font-semibold outline-none"
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
                    placeholder="Cidade..."
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute z-[100] w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-2xl max-h-48 overflow-y-auto no-scrollbar">
                      {suggestions.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleSelectCity(city)}
                          className="w-full text-left px-4 py-3 text-[11px] font-semibold hover:bg-[#FAF7ED] border-b last:border-0"
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
              <label className="flex items-center gap-2 mb-1 text-xs font-medium text-slate-700">
                <FileText size={14} className="text-[#D4AF37]" /> Mini-currículo
              </label>
              <textarea
                name="mini_bio"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#F3E5AB] outline-none"
                value={miniBio || ''}
                onChange={(e) => setMiniBio(e.target.value)}
                rows={3}
              />
            </div>

            <SubmitOnboarding isSaving={isSaving} />
          </form>
        </aside>

        {/* MAIN: Abaixo do form no mobile (w-full), ao lado no desktop (w-65%) */}
        <main className="w-full md:w-[65%] min-h-[600px] md:h-screen bg-black relative flex-grow overflow-y-auto">
          <div className="absolute top-4 md:top-10 left-0 md:left-10 z-[10] flex items-center gap-4 px-6 pointer-events-none">
            <div className="w-1.5 h-14 bg-champagne-dark rounded-full animate-pulse shadow-[0_0_20px_rgba(243,229,171,0.8)]"></div>
            <div className="flex flex-col justify-center">
              <p className="text-[10px] md:text-[12px] text-[#F3E5AB] font-semibold uppercase tracking-wider leading-none mb-1 drop-shadow-lg">
                Editorial
              </p>
              <p className="text-[11px] md:text-[14px] text-white/90 font-serif italic tracking-wide leading-none py-2 drop-shadow-md">
                Prévia do seu perfil
              </p>
            </div>
          </div>
          <ProfilePreview
            initialData={{
              full_name: fullName,
              username,
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
              <h2 className="text-2xl font-semibold text-slate-900 mb-2 tracking-tight">
                Perfil Consolidado!
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                Sua presença editorial foi atualizada com sucesso.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href={`/${username}`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-[#F3E5AB] py-4 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
                >
                  <Sparkles size={16} /> Visualizar Perfil Público
                </a>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-champagne-dark text-slate-900 py-4 rounded-xl font-semibold text-sm transition-colors"
                >
                  Ir para o Dashboard
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full text-slate-400 py-2 text-xs font-semibold hover:text-slate-600 transition-colors"
                >
                  Continuar Refinando
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
