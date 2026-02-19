'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  AtSign,
  FileText,
  MessageCircle,
  Instagram,
  Upload,
  Pencil,
  Globe,
  ImageIcon,
  MapPin,
  X,
  CheckCircle2,
  Sparkles,
  Save,
  ShieldCheck,
} from 'lucide-react';

import {
  getPublicProfile,
  upsertProfile,
} from '@/core/services/profile.service';
import { maskPhone, normalizePhoneNumber } from '@/core/utils/masks-helpers';
import ProfilePreview from './ProfilePreview';
import { Toast, SubmitButton } from '@/components/ui';
import BaseModal from '@/components/ui/BaseModal';
import { fetchStates, fetchCitiesByState } from '@/core/utils/cidades-helpers';
import { compressImage } from '@/core/utils/user-helpers';
import { useNavigation } from '@/components/providers/NavigationProvider';
import { usePlan } from '@/core/context/PlanContext';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { PrivacyPolicyModal } from '@/app/(public)/privacidade/PrivacidadeContent';
import { TermsOfServiceModal } from '@/app/(public)/termos/TermosContent';
import SpecialtySelect from '@/features/galeria/SpecialtySelect';

/**
 * 🎯 Componente de seção - Estilo Editorial
 */
const FormSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-luxury border border-slate-200 p-4 space-y-3 shadow-sm transition-all hover:border-slate-300">
    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
      {icon && <div className="text-gold">{icon}</div>}
      <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
        {title}
      </h3>
    </div>
    <div className="pl-0">{children}</div>
  </div>
);

export default function OnboardingForm({
  initialData,
  suggestedUsername,
  isEditMode,
}: {
  initialData?: any;
  suggestedUsername?: string;
  isEditMode?: boolean;
}) {
  const { permissions, planKey } = usePlan();
  console.log(planKey, 'planKey');

  const { navigate, isNavigating: isGlobalNavigating } = useNavigation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS DE CONFORMIDADE ---
  const [acceptTerms, setAcceptTerms] = useState(
    initialData?.accepted_terms || false,
  );
  const [acceptPrivacy, setAcceptPrivacy] = useState(
    initialData?.accepted_terms || false,
  );
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // --- ESTADOS DE PERFIL ---
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [username, setUsername] = useState(
    initialData?.username || suggestedUsername || '',
  );
  const [miniBio, setMiniBio] = useState(initialData?.mini_bio || '');
  const [phone, setPhone] = useState(() =>
    normalizePhoneNumber(initialData?.phone_contact),
  );
  const [instagram, setInstagram] = useState(initialData?.instagram_link || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [selectedCities, setSelectedCities] = useState<string[]>(
    initialData?.operating_cities || [],
  );

  const [specialty, setSpecialty] = useState(initialData?.specialty || '');
  const [customSpecialties, setCustomSpecialties] = useState<string[]>(
    initialData?.custom_specialties || [],
  );

  const hasAcceptedBefore = !!initialData?.accepted_terms;

  // --- ESTADOS DE LOCALIZAÇÃO ---
  const [states, setStates] = useState<{ sigla: string; nome: string }[]>([]);
  const [selectedUF, setSelectedUF] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // --- ESTADOS DE MÍDIA ---
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.profile_picture_url || null,
  );
  const [bgFiles, setBgFiles] = useState<File[]>([]);

  // --- ESTADOS DE UI ---
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastConfig, setToastConfig] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // 🛡️ REGRAS DE NEGÓCIO POR PLANO
  const bioLimit = useMemo(() => {
    if (permissions.profileLevel === 'basic') return 150;
    if (permissions.profileLevel === 'standard') return 250;
    return 400; // advanced e seo
  }, [permissions.profileLevel]);

  const profileCarouselLimit = useMemo(
    () => permissions.profileCarouselLimit || 1,
    [permissions],
  );

  // 🛡️ LÓGICA DE BACKGROUNDS (Para Preview e Upload)
  const activeBackgrounds = useMemo(() => {
    // Se o limite for 0, é o comportamento do plano básico (Sorteio Automático)
    if (permissions.profileCarouselLimit === 0) return [];

    if (bgFiles.length > 0)
      return bgFiles.map((file) => URL.createObjectURL(file));

    const initialBg = initialData?.background_url;
    if (!initialBg) return [];
    const normalized = Array.isArray(initialBg) ? initialBg : [initialBg];
    return normalized.slice(0, profileCarouselLimit);
  }, [
    bgFiles,
    permissions.profileCarouselLimit,
    initialData?.background_url,
    profileCarouselLimit,
  ]);

  // --- EFFECTS ---
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
    if (!username || username === initialData?.username) {
      setIsAvailable(null);
      return;
    }
    const check = async () => {
      const { data } = await getPublicProfile(username);
      setIsAvailable(!data);
    };
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, [username, initialData?.username]);

  // --- HANDLERS ---
  const handleSelectCity = (city: string) => {
    if (!selectedCities.includes(city))
      setSelectedCities((prev) => [...prev, city]);
    setCityInput('');
    setSuggestions([]);
  };

  const handleLockedFeature = () => {
    setToastConfig({
      message:
        'Este recurso está disponível em planos superiores. Faça o upgrade para desbloquear.',
      type: 'error',
    });
  };

  const clientAction = async (formData: FormData) => {
    if (!acceptTerms || !acceptPrivacy) {
      setToastConfig({
        message: 'Você precisa aceitar os termos e a política de privacidade.',
        type: 'error',
      });
      return;
    }
    if (!fullName.trim() || !username.trim()) {
      setToastConfig({
        message: 'Nome e Username são obrigatórios.',
        type: 'error',
      });
      return;
    }

    setIsSaving(true);

    formData.set('full_name', fullName.trim());
    formData.set('username', username.trim().toLowerCase());
    formData.set('mini_bio', miniBio);
    formData.set('phone_contact', phone.replace(/\D/g, ''));
    formData.set('instagram_link', instagram);
    formData.set('website', website);
    formData.set('operating_cities', JSON.stringify(selectedCities));
    formData.set('accepted_terms', 'true');
    formData.set('specialty', specialty);
    formData.set('custom_specialties', JSON.stringify(customSpecialties));

    // Envia quais URLs existentes devem ser mantidas (filtramos blobs locais)
    const existingUrls = activeBackgrounds.filter((url) =>
      url.startsWith('http'),
    );
    formData.set('background_urls_existing', JSON.stringify(existingUrls));

    try {
      if (photoFile) {
        const compressed = await compressImage(photoFile);
        formData.set('profile_picture', compressed, 'avatar.webp');
      }

      if (bgFiles.length > 0) {
        formData.delete('background_images');
        for (const file of bgFiles) {
          const compressedBg = await compressImage(file);
          formData.append(
            'background_images',
            compressedBg,
            `bg-${Math.random()}.webp`,
          );
        }
      }

      const result = await upsertProfile(formData);
      if (result?.success) {
        setShowSuccessModal(true);
      } else {
        setToastConfig({
          message: result?.error || 'Erro ao salvar.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error('[OnboardingForm] Erro:', err);
      setToastConfig({
        message: 'Falha na conexão ao salvar perfil.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="relative min-h-screen bg-luxury-bg flex flex-col md:flex-row w-full z-[99]">
        <aside className="w-full md:w-[45%] bg-white border-r border-slate-100 flex flex-col h-screen md:sticky md:top-0 z-20 shadow-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 no-scrollbar py-2">
            {/* BANNER TRIAL/UPGRADE */}
            {isEditMode && permissions.isTrial && (
              <div className="mb-6 p-3 bg-gold/10 border border-gold/30 rounded-luxury flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gold rounded-full text-petroleum">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
                      Período de Trial Ativo
                    </p>
                    <p className="text-[9px] text-petroleum/60 uppercase">
                      Desfrute dos recursos PRO por 14 dias
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form
              id="onboarding-form"
              action={clientAction}
              className="space-y-4"
            >
              {/* SEÇÃO 1: IDENTIFICAÇÃO */}
              <FormSection title="Identificação" icon={<User size={14} />}>
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="relative group shrink-0">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size <= 2 * 1024 * 1024) {
                            setPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));
                          } else if (file) {
                            setToastConfig({
                              message: 'A foto deve ter no máximo 2MB.',
                              type: 'error',
                            });
                          }
                        }}
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-gold to-champagne shadow-xl cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        <div className="w-full h-full rounded-full overflow-hidden bg-white p-1">
                          <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center relative">
                            {photoPreview ? (
                              <img
                                src={photoPreview}
                                className="w-full h-full object-cover"
                                alt="Avatar"
                              />
                            ) : (
                              <Upload size={20} className="text-slate-300" />
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-luxury-base absolute bottom-0 right-0 p-1.5 shadow-lg"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>

                    <div className="flex-grow space-y-1.5">
                      <label className="text-editorial-label text-petroleum">
                        <AtSign
                          size={12}
                          strokeWidth={2}
                          className="inline mr-1.5"
                        />{' '}
                        Username <span className="text-gold">*</span>
                      </label>
                      <input
                        readOnly={isEditMode}
                        className={`w-full px-3 h-10 bg-white border border-slate-200 rounded-luxury text-[13px] font-medium outline-none transition-all ${isEditMode ? 'bg-slate-50 text-slate-400 italic' : 'focus:border-gold'}`}
                        value={username}
                        onChange={(e) =>
                          !isEditMode &&
                          setUsername(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9._]/g, ''),
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-editorial-label text-petroleum">
                        <User
                          size={12}
                          strokeWidth={2}
                          className="inline mr-1.5"
                        />{' '}
                        Nome Completo
                      </label>
                      <input
                        className="w-full px-3 h-10 border border-slate-200 rounded-luxury text-[13px] outline-none focus:border-gold"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-editorial-label text-petroleum">
                        <MessageCircle
                          size={12}
                          strokeWidth={2}
                          className="inline mr-1.5"
                        />{' '}
                        WhatsApp
                      </label>
                      <input
                        className="w-full px-3 h-10 border border-slate-200 rounded-luxury text-[13px] outline-none focus:border-gold"
                        value={phone}
                        onChange={(e) => setPhone(maskPhone(e))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* SEÇÃO 2: PRESENÇA DIGITAL (Trava: profileLevel) */}
              <FormSection title="Presença Digital" icon={<Globe size={14} />}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PlanGuard feature="profileLevel" label="Website">
                      <div className="space-y-1.5">
                        <label className="text-editorial-label text-petroleum">
                          <Globe size={12} className="inline mr-1.5" /> Website
                        </label>
                        <input
                          className="w-full px-3 h-10 border border-slate-200 rounded-luxury text-[13px]"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="seusite.com"
                        />
                      </div>
                    </PlanGuard>
                    <PlanGuard feature="profileLevel" label="Instagram">
                      <div className="space-y-1.5">
                        <label className="text-editorial-label text-petroleum">
                          <Instagram size={12} className="inline mr-1.5" />{' '}
                          Instagram
                        </label>
                        <input
                          className="w-full px-3 h-10 border border-slate-200 rounded-luxury text-[13px]"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          placeholder="@seu.perfil"
                        />
                      </div>
                    </PlanGuard>
                  </div>

                  {/* CARROSSEL DE CAPA (Trava: profileCarouselLimit) */}
                  <PlanGuard
                    feature="profileCarouselLimit"
                    label="Personalização de Capa"
                  >
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-editorial-label text-petroleum flex items-center justify-between">
                        <span className="flex items-center">
                          <ImageIcon size={12} className="inline mr-1.5" />
                          Capa do Perfil
                        </span>
                        <span className="text-[9px] font-bold text-gold uppercase tracking-tighter">
                          {planKey === 'FREE'
                            ? 'Sorteio Automático'
                            : `Até ${profileCarouselLimit} fotos`}
                        </span>
                      </label>

                      <input
                        type="file"
                        ref={bgInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple={profileCarouselLimit > 1}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > profileCarouselLimit) {
                            setToastConfig({
                              message: `Seu plano permite no máximo ${profileCarouselLimit} imagens.`,
                              type: 'error',
                            });
                            e.target.value = '';
                            return;
                          }
                          setBgFiles(files);
                        }}
                      />

                      <button
                        type="button"
                        disabled={permissions.profileCarouselLimit === 0}
                        onClick={() => bgInputRef.current?.click()}
                        className={`btn-luxury-base w-full bg-slate-50 border-dashed min-h-[50px] flex-wrap justify-between ${
                          permissions.profileCarouselLimit === 0
                            ? 'opacity-60 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <span className="text-editorial-label text-petroleum">
                          {bgFiles.length > 0
                            ? `${bgFiles.length} selecionadas`
                            : 'Alterar Imagens de Capa'}
                        </span>
                        {/* ... preview das imagens ... */}
                      </button>

                      {permissions.profileCarouselLimit === 0 && (
                        <p className="text-[10px] text-petroleum italic">
                          No plano básico a capa é dinâmica e profissional por
                          padrão.
                        </p>
                      )}
                    </div>
                  </PlanGuard>
                </div>
              </FormSection>

              {/* SEÇÃO 3: BIO (Trava: profileLevel) */}
              <PlanGuard feature="profileLevel" label="Biografia Editorial">
                <FormSection
                  title="Mini Biografia"
                  icon={<FileText size={14} />}
                >
                  <div className="space-y-1.5">
                    <textarea
                      className="w-full px-3 py-2 h-40 bg-white border border-slate-200 rounded-luxury text-[13px] outline-none focus:border-gold transition-all resize-none"
                      value={miniBio}
                      maxLength={bioLimit}
                      onChange={(e) => setMiniBio(e.target.value)}
                      placeholder="Sua trajetória profissional..."
                    />
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[9px] font-bold uppercase ${miniBio.length >= bioLimit ? 'text-gold' : 'text-slate-400'}`}
                      >
                        {miniBio.length} / {bioLimit}
                      </span>
                    </div>
                  </div>
                </FormSection>
              </PlanGuard>

              {/* SEÇÃO 4: ÁREA DE ATUAÇÃO (ESPECIALIDADE) */}
              <PlanGuard feature="profileLevel" label="Área de Atuação">
                <FormSection
                  title="Área de atuação"
                  icon={<Sparkles size={14} className="text-gold" />}
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-editorial-label text-petroleum">
                        Sua Especialidade Principal
                      </label>
                      <SpecialtySelect
                        value={specialty}
                        onChange={(val, newList) => {
                          setSpecialty(val);
                          if (newList) setCustomSpecialties(newList);
                        }}
                        initialCustoms={customSpecialties}
                      />
                      <p className="text-[10px] text-petroleum/50 italic leading-tight">
                        Sua especialidade define como você será encontrado por
                        clientes em nosso portal.
                      </p>
                    </div>
                  </div>
                </FormSection>
              </PlanGuard>
              {/* SEÇÃO 4: ÁREA DE ATUAÇÃO (Trava: profileLevel) */}
              <PlanGuard feature="profileLevel" label="Cidades de Atuação">
                <FormSection
                  title="Cidades de Atuação"
                  icon={<MapPin size={14} />}
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedCities.map((city) => (
                        <span
                          key={city}
                          className="bg-slate-50 border border-slate-200 text-petroleum text-[9px] font-bold px-2.5 py-1.5 rounded-luxury flex items-center gap-2 uppercase tracking-widest"
                        >
                          {city}{' '}
                          <X
                            size={12}
                            className="cursor-pointer hover:text-red-500"
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
                        }}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-luxury px-2 h-10 text-xs font-bold"
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
                          className="w-full px-3 h-10 border border-slate-200 rounded-luxury text-[13px]"
                          placeholder="Digite a cidade..."
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute z-[100] w-full bg-white border border-slate-200 rounded-luxury bottom-full mb-2 shadow-2xl max-h-48 overflow-y-auto">
                            {suggestions.map((city) => (
                              <button
                                key={city}
                                type="button"
                                onClick={() => handleSelectCity(city)}
                                className="w-full text-left px-4 py-3 text-[10px] uppercase font-bold hover:bg-slate-50 border-b last:border-0"
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </FormSection>
              </PlanGuard>

              {/* SEÇÃO 5: CONFORMIDADE */}

              <FormSection
                title="Termos e Privacidade"
                icon={<ShieldCheck size={14} />}
              >
                <div className="space-y-4 py-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      disabled={hasAcceptedBefore} // 🔒 Trava se já foi aceito no banco
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
                    />
                    <label className="text-[11px] text-petroleum/80 font-medium">
                      Li e aceito os{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-gold underline"
                      >
                        Termos de Serviço
                      </button>
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={acceptPrivacy}
                      disabled={hasAcceptedBefore} // 🔒 Trava se já foi aceito no banco
                      onChange={(e) => setAcceptPrivacy(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold"
                    />
                    <label className="text-[11px] text-petroleum/80 font-medium">
                      Concordo com a{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-gold underline"
                      >
                        Política de Privacidade
                      </button>
                    </label>
                  </div>
                </div>
              </FormSection>

              {/* BOTÕES */}
              <div className="flex flex-row items-center justify-end gap-4 p-4 bg-petroleum ">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary-petroleum"
                >
                  CANCELAR
                </button>

                <SubmitButton
                  form="onboarding-form"
                  success={showSuccessModal}
                  disabled={isSaving}
                  icon={<Save size={14} />}
                  className="px-6"
                  label={isSaving ? 'SALVANDO...' : 'SALVAR PERFIL'}
                />
              </div>
            </form>
          </div>
        </aside>

        {/* PREVIEW */}
        <main className="w-full md:w-[65%] min-h-[600px] md:h-screen bg-black relative flex-grow overflow-y-auto">
          <ProfilePreview
            initialData={{
              full_name: fullName,
              username,
              mini_bio: miniBio,
              phone_contact: phone,
              instagram_link: instagram,
              avatar_url: photoPreview,
              cities: selectedCities,
              website,
              background_url: activeBackgrounds, // Passa o carrossel/capa filtrado para o preview
            }}
          />
        </main>
      </div>

      {/* MODAIS */}
      <TermsOfServiceModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
      <BaseModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Perfil Atualizado"
        subtitle="Sua presença digital foi salva"
        maxWidth="lg"
        headerIcon={
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/5">
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
        }
        footer={
          <div className="flex flex-col gap-3">
            {/* Linha Única: Ações Principais com Larguras Iguais via Grid */}
            <div className="grid grid-cols-2 gap-3 w-full items-center">
              <button
                onClick={() => {
                  navigate('/dashboard', 'Abrindo seu espaço...');
                }}
                className="btn-secondary-white w-full text-[10px]"
              >
                {/* ArrowLeft se disponível nos seus imports, ou mantenha o padrão */}
                Ir para Dashboard
              </button>

              <a
                href={`/${username}`}
                target="_blank"
                className="btn-luxury-primary w-full text-[10px]"
              >
                <Sparkles size={14} /> Ver Perfil Público
              </a>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/80 font-medium text-center">
            O seu perfil atualizado agora está configurado e pronto para ser
            acessado pelo seu público.
          </p>
          <div className="p-4 bg-slate-50 border border-petroleum/10 rounded-luxury">
            <p className="text-[10px] font-semibold text-petroleum/80 text-center uppercase tracking-luxury">
              Dica: Você pode alterar sua foto de capa e mini bio a qualquer
              momento, desde que o seu plano permita.
            </p>
          </div>
        </div>
      </BaseModal>

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
