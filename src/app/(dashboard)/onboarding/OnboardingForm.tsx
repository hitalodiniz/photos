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
  Loader2,
  ArrowLeft,
  Clock,
  ChevronDown,
  ArrowRight,
  Crown,
  Info,
} from 'lucide-react';

import {
  getPublicProfile,
  upsertProfile,
} from '@/core/services/profile.service';
import { maskPhone, normalizePhoneNumber } from '@/core/utils/masks-helpers';
import ProfilePreview from './ProfilePreview';
import { SubmitButton, Toast } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import BaseModal from '@/components/ui/BaseModal';
import { fetchStates, fetchCitiesByState } from '@/core/utils/cidades-helpers';
import {
  getFileExtension,
  generateFilePath,
} from '@/core/utils/profile-helpers';
import { compressImage } from '@/core/utils/user-helpers';
import { useNavigation } from '@/components/providers/NavigationProvider';
import { usePlan } from '@/core/context/PlanContext';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { PrivacyPolicyModal } from '@/app/(public)/privacidade/PrivacidadeContent';
import { TermsOfServiceModal } from '@/app/(public)/termos/TermosContent';
import SpecialtySelect from '@/features/galeria/SpecialtySelect';
import { supabase } from '@/lib/supabase.client';
import { ThemeKey, ThemeSelector } from '@/components/ui/ThemeSelector';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { getPlanBenefits, PERMISSIONS_BY_PLAN } from '@/core/config/plans';
import { useSegment } from '@/hooks/useSegment';
import { USERNAME_BLACKLIST } from '@/core/config/username-blacklist';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { PlanBenefitsCarousel } from '@/components/ui/PlanBenefitsCarousel';
import { UpgradeSheet } from '@/components/ui/Upgradesheet';
import { SuccessMessage } from './SuccessMessage';

// =============================================================================
// FormSection — Acordeão colapsável
// =============================================================================

const FormSection = ({
  title,
  icon,
  children,
  defaultOpen = false,
  filled = false,
  hasError = false,
  forceOpen = false,
  allowContentOverflow = false,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  filled?: boolean;
  hasError?: boolean;
  forceOpen?: boolean;
  /** Quando true, o conteúdo (ex.: tags de cidades) pode expandir para fora do acordeão sem ser cortado */
  allowContentOverflow?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  // Abre automaticamente se houver erro de validação
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div
      className={`bg-white rounded-luxury border shadow-sm transition-all ${
        allowContentOverflow ? 'overflow-visible' : 'overflow-hidden'
      } ${
        hasError ? 'border-red-300' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Header — clicável */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
      >
        {icon && (
          <div className={hasError ? 'text-red-400' : 'text-gold'}>{icon}</div>
        )}

        {/* Dot de erro — tem precedência sobre filled */}
        {!open && hasError && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
        )}

        {/* Dot de preenchimento — visível apenas quando collapsed e sem erro */}
        {!open && filled && !hasError && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        )}

        <h3
          className={`text-[10px] font-semibold uppercase tracking-luxury-wide flex-1 ${
            hasError ? 'text-red-500' : 'text-petroleum'
          }`}
        >
          {title}
          {hasError && (
            <span className="ml-2 text-[8px] normal-case font-medium text-red-400 tracking-normal">
              — campo obrigatório
            </span>
          )}
        </h3>

        <ChevronDown
          size={12}
          className={`shrink-0 transition-transform duration-200 ${
            open
              ? hasError
                ? 'rotate-180 text-red-400'
                : 'rotate-180 text-gold'
              : hasError
                ? 'text-red-300'
                : 'text-petroleum/30'
          }`}
        />
      </button>

      {/* Separador — visível apenas quando expandido */}
      {open && (
        <div
          className={`h-px mx-4 ${hasError ? 'bg-red-100' : 'bg-slate-200'}`}
        />
      )}

      {/*
        IMPORTANTE: usar className="hidden" e NÃO renderização condicional.
        Garante que todos os inputs permanecem no DOM para o FormData
        capturar corretamente no submit, mesmo quando a seção está fechada.
      */}
      <div className={`px-4 pb-4 pt-3 space-y-3 ${open ? '' : 'hidden'}`}>
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// SupabaseImagePreview
// =============================================================================

function SupabaseImagePreview({
  url,
  className = 'w-full h-full object-cover',
}: {
  url: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (url) {
      setLoading(true);
      setError(false);
    }
  }, [url]);

  if (!url) {
    return (
      <div
        className={`bg-slate-100 flex items-center justify-center ${className}`}
      >
        <ImageIcon size={16} className="text-slate-300" />
      </div>
    );
  }

  return (
    <div
      className={`relative bg-slate-100 flex items-center justify-center overflow-hidden ${className}`}
    >
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
          <Loader2 size={16} className="text-gold animate-spin" />
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
          <ImageIcon size={16} strokeWidth={1.5} />
          <span className="text-[7px] font-semibold uppercase mt-1 leading-tight">
            Erro ao carregar
          </span>
        </div>
      ) : (
        <img
          src={url}
          alt="Preview"
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
          loading="lazy"
        />
      )}
    </div>
  );
}

// =============================================================================
// OnboardingForm
// =============================================================================

export default function OnboardingForm({
  initialData,
  suggestedUsername,
  isEditMode,
}: {
  initialData?: any;
  suggestedUsername?: string;
  isEditMode?: boolean;
}) {
  const { permissions, planKey, trialExpiresAt } = usePlan();
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
  const [specialties, setSpecialties] = useState<string[]>(() => {
    const raw = initialData?.specialty;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  });
  const [customSpecialties, setCustomSpecialties] = useState<string[]>(
    Array.isArray(initialData?.custom_specialties)
      ? initialData.custom_specialties
      : [],
  );
  const [themeKey, setThemeKey] = useState<ThemeKey>(
    initialData?.theme_key || (process.env.NEXT_PUBLIC_APP_SEGMENT as ThemeKey),
  );

  const [showPhoneOnPublicProfile, setShowPhoneOnPublicProfile] = useState(
    () =>
      initialData?.settings?.defaults?.show_phone_on_public_profile ?? false,
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
  const [existingBackgrounds, setExistingBackgrounds] = useState<string[]>(
    () => {
      const initialBg = initialData?.background_url;
      if (!initialBg) return [];
      return Array.isArray(initialBg) ? initialBg : [initialBg];
    },
  );

  // --- ESTADOS DE UI ---
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [usernameBlacklisted, setUsernameBlacklisted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
  const [showTrialWelcomeModal, setShowTrialWelcomeModal] = useState(() => {
    const isNewSignup = !initialData?.full_name;
    const isTrial = planKey === 'PRO' && permissions.isTrial;
    return !!(isNewSignup && isTrial);
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formChanged, setFormChanged] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<{
    identificacao?: boolean;
    termos?: boolean;
    phone?: boolean;
  }>({});
  const { showToast, ToastElement } = useToast();

  const isNewSignupTrial =
    !initialData?.full_name && planKey === 'PRO' && permissions.isTrial;
  const trialDaysLeft = trialExpiresAt
    ? Math.max(
        0,
        differenceInCalendarDays(parseISO(trialExpiresAt), new Date()),
      )
    : 14;

  const { terms } = useSegment();

  // 🛡️ REGRAS DE NEGÓCIO POR PLANO
  const bioLimit = useMemo(() => {
    if (permissions.profileLevel === 'basic') return 150;
    if (permissions.profileLevel === 'standard') return 250;
    return 400;
  }, [permissions.profileLevel]);

  const profileCarouselLimit = useMemo(
    () => permissions.profileCarouselLimit || 1,
    [permissions],
  );

  // 🛡️ LÓGICA DE BACKGROUNDS: existentes primeiro, depois novos arquivos (não sobrescreve)
  const activeBackgrounds = useMemo(() => {
    if (permissions.profileCarouselLimit === 0) return [];
    const existing = existingBackgrounds.slice(0, profileCarouselLimit);
    const slotsLeft = Math.max(0, profileCarouselLimit - existing.length);
    const newBlobs = bgFiles
      .slice(0, slotsLeft)
      .map((file) => URL.createObjectURL(file));
    return [...existing, ...newBlobs].slice(0, profileCarouselLimit);
  }, [
    bgFiles,
    existingBackgrounds,
    permissions.profileCarouselLimit,
    profileCarouselLimit,
  ]);

  // --- DOTS DE PREENCHIMENTO POR SEÇÃO ---
  const phoneDigits = phone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length === 11;
  const filledMap = {
    identificacao:
      fullName.trim() !== '' && username.trim().length >= 5 && isPhoneValid,
    presencaDigital:
      website !== '' ||
      instagram !== '' ||
      bgFiles.length > 0 ||
      existingBackgrounds.length > 0,
    miniBio: miniBio.trim() !== '',
    temaVisual: false,
    areaAtuacao: specialties.length > 0,
    cidades: selectedCities.length > 0,
    termos: acceptTerms && acceptPrivacy,
  };

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
      setUsernameBlacklisted(false);
      return;
    }
    setUsernameBlacklisted(false);
    const check = async () => {
      const value = username.toLowerCase();
      if (USERNAME_BLACKLIST.has(value)) {
        setIsAvailable(false);
        setUsernameBlacklisted(true);
        return;
      }
      const { data } = await getPublicProfile(username);
      setIsAvailable(!data);
    };
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, [username, initialData?.username]);

  const getCurrentFormState = () => {
    return {
      fullName,
      username,
      miniBio,
      phone: normalizePhoneNumber(phone),
      instagram,
      website,
      selectedCities,
      specialties,
      customSpecialties,
      themeKey,
      showPhoneOnPublicProfile,
      profilePicture: photoPreview,
      backgrounds: existingBackgrounds,
      acceptTerms,
      acceptPrivacy,
    };
  };

  useEffect(() => {
    // Função para obter o estado inicial dos campos, lidando com os diferentes formatos de dados
    const getInitialState = () => {
      const getInitialSpecialties = () => {
        const raw = initialData?.specialty;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [raw];
        } catch {
          return [raw];
        }
      };
      const initialBg = initialData?.background_url;
      const initialBackgrounds = !initialBg
        ? []
        : Array.isArray(initialBg)
          ? initialBg
          : [initialBg];

      return {
        fullName: initialData?.full_name || '',
        username: initialData?.username || suggestedUsername || '',
        miniBio: initialData?.mini_bio || '',
        phone: normalizePhoneNumber(initialData?.phone_contact),
        instagram: initialData?.instagram_link || '',
        website: initialData?.website || '',
        selectedCities: initialData?.operating_cities || [],
        specialties: getInitialSpecialties(),
        customSpecialties: Array.isArray(initialData?.custom_specialties)
          ? initialData.custom_specialties
          : [],
        themeKey:
          initialData?.theme_key ||
          (process.env.NEXT_PUBLIC_APP_SEGMENT as ThemeKey),
        showPhoneOnPublicProfile:
          initialData?.settings?.defaults?.show_phone_on_public_profile ??
          false,
        profilePicture: initialData?.profile_picture_url || null,
        backgrounds: initialBackgrounds,
        acceptTerms: initialData?.accepted_terms || false,
        acceptPrivacy: initialData?.accepted_terms || false,
      };
    };

    // Define o estado inicial e o último estado salvo na primeira renderização
    if (!lastSavedState) {
      setLastSavedState(getInitialState());
    }

    const comparisonState = lastSavedState || getInitialState();
    const currentState = getCurrentFormState();

    // Compara o estado de referência com o atual para ver se há mudanças
    const isDirty =
      JSON.stringify(comparisonState) !== JSON.stringify(currentState) ||
      photoFile !== null ||
      bgFiles.length > 0;

    setFormChanged(isDirty);
  }, [
    // Dependências que disparam a verificação
    fullName,
    username,
    miniBio,
    phone,
    instagram,
    website,
    selectedCities,
    specialties,
    customSpecialties,
    themeKey,
    showPhoneOnPublicProfile,
    photoFile,
    bgFiles,
    existingBackgrounds,
    photoPreview,
    acceptTerms,
    acceptPrivacy,
    initialData,
    suggestedUsername,
    lastSavedState,
  ]);

  // --- HANDLERS ---
  const handleSelectCity = (city: string) => {
    if (!selectedCities.includes(city))
      setSelectedCities((prev) => [...prev, city]);
    setCityInput('');
    setSuggestions([]);
  };

  const handleLockedFeature = () => {
    showToast(
      'Este recurso está disponível em planos superiores. Faça o upgrade para desbloquear.',
      'error',
    );
  };

  const clientAction = async (formData: FormData) => {
    // Mapear erros por seção e abrir automaticamente as que têm problema
    const errors: typeof validationErrors = {};
    const usernameTrim = username.trim();
    if (!fullName.trim() || !usernameTrim) errors.identificacao = true;
    if (usernameTrim.length > 0 && usernameTrim.length < 5)
      errors.identificacao = true;
    if (USERNAME_BLACKLIST.has(usernameTrim.toLowerCase()))
      errors.identificacao = true;
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      errors.phone = true;
    }
    if (!acceptTerms || !acceptPrivacy) errors.termos = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (errors.identificacao) {
        if (USERNAME_BLACKLIST.has(usernameTrim.toLowerCase())) {
          showToast('Este nome de usuário é reservado pelo sistema.', 'error');
        } else if (usernameTrim.length > 0 && usernameTrim.length < 5) {
          showToast('Username deve ter no mínimo 5 caracteres.', 'error');
        } else {
          showToast('Preencha Nome e Username antes de salvar.', 'error');
        }
      } else if (errors.phone) {
        showToast(
          'Informe um WhatsApp válido (11 dígitos: DDD + celular com 9).',
          'error',
        );
      } else if (errors.termos) {
        showToast('Aceite os termos e a política de privacidade.', 'error');
      }
      return;
    }

    setValidationErrors({});
    setIsSaving(true);

    formData.set('full_name', fullName.trim());
    formData.set('username', username.trim().toLowerCase());
    formData.set('mini_bio', miniBio);
    formData.set('phone_contact', phone.replace(/\D/g, ''));
    formData.set('instagram_link', instagram);
    formData.set('website', website);
    formData.set('operating_cities', JSON.stringify(selectedCities));
    formData.set('accepted_terms', 'true');
    formData.set('specialty', JSON.stringify(specialties));
    formData.set('custom_specialties', JSON.stringify(customSpecialties));
    formData.set('theme_key', themeKey);
    formData.set(
      'show_phone_on_public_profile',
      showPhoneOnPublicProfile ? 'true' : 'false',
    );

    const existingProfilePictureUrl =
      !photoFile &&
      photoPreview &&
      typeof photoPreview === 'string' &&
      photoPreview.startsWith('http')
        ? photoPreview
        : '';
    formData.set('profile_picture_url_existing', existingProfilePictureUrl);

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
        // Atualiza o estado "salvo" para o estado atual do formulário
        setLastSavedState(getCurrentFormState());
      } else {
        showToast(result?.error || 'Erro ao salvar.', 'error');
      }
    } catch (err: any) {
      console.error('[OnboardingForm] Erro:', err);
      showToast('Falha na conexão ao salvar perfil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('A foto deve ter no máximo 2MB.', 'error');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    const compressed = await compressImage(file);
    setPhotoFile(new File([compressed], file.name, { type: 'image/webp' }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = initialData?.id ?? user?.id;
      if (!userId) {
        showToast('Sessão inválida. Faça login novamente.', 'error');
        return;
      }

      const bucket = 'profile_pictures';
      const extension = getFileExtension(file.name);
      const filePath = generateFilePath(userId, 'avatar', extension);

      const { data: existingFiles } = await supabase.storage
        .from(bucket)
        .list(userId);

      if (existingFiles?.length > 0) {
        const toDelete = existingFiles
          .filter((f: { name: string }) => f.name.startsWith('avatar'))
          .map((f: { name: string }) => `${userId}/${f.name}`);
        if (toDelete.length > 0) {
          await supabase.storage.from(bucket).remove(toDelete);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      setPhotoPreview(publicUrl);
    } catch (err) {
      console.error('Erro no Storage:', err);
      showToast('Erro ao processar imagem no servidor.', 'error');
    }
  };

  const handleDeleteAvatar = async () => {
    if (!photoPreview || !photoPreview.startsWith('http')) {
      setPhotoPreview(null);
      setPhotoFile(null);
      return;
    }

    try {
      const bucket = 'profile_pictures';
      const urlParts = photoPreview.split(`${bucket}/`);

      if (urlParts.length >= 2) {
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        const { error } = await supabase.storage
          .from(bucket)
          .remove([filePath]);
        if (error) throw error;
      }

      setPhotoPreview(null);
      setPhotoFile(null);
      showToast('Avatar removido.', 'success', 'left');
    } catch (err) {
      console.error('Erro ao deletar avatar:', err);
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  };

  const handleDeleteBackground = async (url: string, index: number) => {
    try {
      const bucket = 'profile_pictures';

      if (url.startsWith('blob:')) {
        const indexInBgFiles = index - existingBackgrounds.length;
        setBgFiles((prev) => prev.filter((_, i) => i !== indexInBgFiles));
        return;
      }

      const urlParts = url.split(`${bucket}/`);
      if (urlParts.length < 2) return;

      const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) throw error;

      setExistingBackgrounds((prev) => prev.filter((_, i) => i !== index));
      showToast('Imagem removida do servidor.', 'success');
    } catch (err: any) {
      console.error('Erro na exclusão:', err);
      setExistingBackgrounds((prev) => prev.filter((_, i) => i !== index));
    }
  };
  // =============================================================================
  // Render
  // =============================================================================
  return (
    <>
      {/* Modal de boas-vindas ao trial */}
      {isNewSignupTrial && (
        <BaseModal
          isOpen={showTrialWelcomeModal}
          onClose={() => setShowTrialWelcomeModal(false)}
          title="Bem-vindo ao período de teste PRO"
          subtitle={`${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia' : 'dias'} com todos os recursos`}
          maxWidth="2xl"
          headerIcon={<Clock className="text-gold" size={20} />}
          footer={
            <button
              type="button"
              onClick={() => setShowTrialWelcomeModal(false)}
              className="w-full h-10 px-6 bg-champagne hover:bg-gold text-petroleum font-bold text-[11px] uppercase tracking-luxury rounded-luxury flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-gold/10"
            >
              Iniciar período de teste
              <ArrowLeft size={16} className="rotate-180" />
            </button>
          }
        >
          <div className="space-y-4 text-petroleum">
            {/* Plano e assinatura — mesma mensagem do banner do form */}
            <div className="rounded-luxury border border-gold/20 bg-gold/5 p-4 flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Info size={18} className="text-gold" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-petroleum mb-1">
                  Plano e assinatura
                </p>
                <p className="text-[12px] text-petroleum/80 leading-relaxed">
                  Você pode usar o plano trial por 14 dias. Se preferir, já pode
                  contratar um plano. Ao finalizar o preenchimento do perfil
                  você poderá assinar seu plano.
                </p>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed">
              Sua conta está no{' '}
              <strong className="text-gold">
                período de teste do Plano PRO
              </strong>
              . Explore todos os recursos abaixo durante esse período.
            </p>

            <div className="h-px bg-petroleum/10" />

            <PlanBenefitsCarousel planKey="PRO" />
          </div>
        </BaseModal>
      )}

      <div className="relative min-h-screen bg-luxury-bg flex flex-col md:flex-row w-full z-[99]">
        <aside className="w-full md:w-[45%] bg-white border-r border-slate-100 flex flex-col h-screen md:sticky md:top-0 z-20 shadow-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 no-scrollbar py-2">
            <form
              id="onboarding-form"
              action={clientAction}
              className="space-y-2 pb-2"
            >
              {/* Alerta primeiro acesso: trial + assinatura ao final */}
              {!initialData?.full_name && (
                <div className="rounded-luxury border border-gold/20 bg-gold/5 p-4 mb-3 flex gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <Info size={18} className="text-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-petroleum mb-1">
                      Plano e assinatura
                    </p>
                    <p className="text-[12px] text-petroleum/80 leading-relaxed">
                      Você pode usar o plano trial por 14 dias. Se preferir, já
                      pode contratar um plano. Ao finalizar o preenchimento do
                      perfil você poderá assinar seu plano.
                    </p>
                  </div>
                </div>
              )}
              {/* SEÇÃO 1: IDENTIFICAÇÃO — aberta por padrão */}
              <FormSection
                title="Identificação"
                icon={<User size={14} />}
                defaultOpen={true}
                filled={filledMap.identificacao}
                hasError={
                  !!validationErrors.identificacao || !!validationErrors.phone
                }
                forceOpen={
                  !!validationErrors.identificacao || !!validationErrors.phone
                }
              >
                <div className="space-y-4">
                  <div className="flex items-stretch gap-4">
                    <div className="relative group shrink-0 flex items-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-gold/50 to-champagne shadow-2xl cursor-pointer transition-all hover:scale-105 active:scale-95 overflow-hidden group"
                      >
                        <div className="w-full h-full rounded-full overflow-hidden bg-white p-1">
                          <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-start justify-center relative">
                            {photoPreview ? (
                              <>
                                <img
                                  src={photoPreview}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  alt="Avatar"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Pencil size={16} className="text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Upload size={20} className="text-slate-300" />
                                <span className="text-[8px] font-semibold text-slate-400 mt-1">
                                  UPLOAD
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAvatar();
                          }}
                          className="absolute -top-1 -right-1 p-1.5 bg-white border border-slate-200 text-red-500 rounded-full shadow-md hover:bg-red-50 transition-colors z-10"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      )}
                    </div>

                    <div className="flex-grow min-w-0 flex flex-col gap-4">
                      {/* Linha 1: Username + Nome Completo */}

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="space-y-1.5 sm:col-span-3">
                          <label className="text-editorial-label text-petroleum">
                            <AtSign
                              size={12}
                              strokeWidth={2}
                              className="inline "
                            />
                            Username <span className="text-gold">*</span>
                          </label>
                          <input
                            readOnly={isEditMode}
                            minLength={5}
                            maxLength={20}
                            className={`input-luxury h-9 px-2 ${
                              isEditMode
                                ? 'bg-slate-50 text-slate-400 italic border-slate-200'
                                : validationErrors.identificacao &&
                                    (!username.trim() ||
                                      username.trim().length < 5)
                                  ? 'border-red-300 focus:border-red-400 bg-red-50/30'
                                  : 'border-slate-200 focus:border-gold'
                            }`}
                            value={username}
                            onChange={(e) => {
                              if (!isEditMode) {
                                setUsername(
                                  e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9._]/g, '')
                                    .slice(0, 20),
                                );
                                if (validationErrors.identificacao)
                                  setValidationErrors({});
                              }
                            }}
                            required
                          />
                          <p className="text-[9px] font-semibold">
                            {usernameBlacklisted && (
                              <span className="text-red-400">
                                Este nome de usuário é reservado pelo sistema.
                              </span>
                            )}
                            {!usernameBlacklisted &&
                              username.trim().length > 0 &&
                              username.trim().length < 5 && (
                                <span className="text-red-400">
                                  Mínimo 5 caracteres.
                                </span>
                              )}
                            {!usernameBlacklisted &&
                              username.trim().length >= 5 &&
                              isAvailable === false &&
                              username !== initialData?.username && (
                                <span className="text-red-400">
                                  Username já está em uso.
                                </span>
                              )}
                            {!usernameBlacklisted &&
                              username.trim().length >= 5 &&
                              isAvailable === true && (
                                <span className="text-emerald-500">
                                  Username disponível ✓
                                </span>
                              )}
                          </p>
                        </div>
                        <div className="space-y-1.5 sm:col-span-9">
                          <label className="text-editorial-label text-petroleum">
                            <User
                              size={12}
                              strokeWidth={2}
                              className="inline "
                            />
                            Nome
                          </label>
                          <input
                            className={`input-luxury  h-9 px-2 ${
                              validationErrors.identificacao && !fullName.trim()
                                ? 'border-red-300 focus:border-red-400 bg-red-50/30'
                                : 'border-slate-200 focus:border-gold'
                            }`}
                            value={fullName}
                            onChange={(e) => {
                              setFullName(e.target.value);
                              if (validationErrors.identificacao)
                                setValidationErrors({});
                            }}
                            required
                          />
                        </div>
                      </div>
                      {/* Linha 2: WhatsApp + checkbox */}
                      <div className="space-y-1.5">
                        <label className="text-editorial-label text-petroleum">
                          <WhatsAppIcon className="w-3 h-3 flex-shrink-0" />
                          WhatsApp <span className="text-gold">*</span>
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <input
                            className={`input-luxury h-9 px-2 flex-1 min-w-0 ${
                              validationErrors.phone
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-slate-200'
                            }`}
                            value={phone}
                            onChange={(e) => {
                              setPhone(maskPhone(e));
                              if (validationErrors.phone)
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  phone: false,
                                }));
                            }}
                            onBlur={() => {
                              const digits = phone.replace(/\D/g, '');
                              if (digits.length === 0) return;
                              if (digits.length === 11) {
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  phone: false,
                                }));
                                return;
                              }
                              setValidationErrors((prev) => ({
                                ...prev,
                                phone: true,
                              }));
                            }}
                            placeholder="(00) 00000-0000"
                            required
                          />
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={showPhoneOnPublicProfile}
                              onChange={(e) =>
                                setShowPhoneOnPublicProfile(e.target.checked)
                              }
                              className="rounded border-slate-300 text-gold focus:ring-gold"
                            />
                            <span className="text-[11px] font-medium text-petroleum/90">
                              Ocultar WhatsApp no perfil público
                            </span>
                          </label>
                        </div>
                        {validationErrors.phone && (
                          <p className="text-xs text-red-500">
                            WhatsApp é obrigatório. Informe um número completo
                            (10 dígitos fixo ou 11 dígitos celular).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* SEÇÃO 2: PRESENÇA DIGITAL */}
              <FormSection
                title="Presença Digital"
                icon={<Globe size={14} />}
                defaultOpen={false}
                filled={filledMap.presencaDigital}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PlanGuard feature="profileLevel" label="Website">
                      <div className="space-y-1.5">
                        <label className="text-editorial-label text-petroleum">
                          <Globe size={12} className="inline " /> Website
                        </label>
                        <input
                          className="input-luxury  h-9 px-2 "
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="seusite.com"
                        />
                      </div>
                    </PlanGuard>
                    <PlanGuard feature="profileLevel" label="Instagram">
                      <div className="space-y-1.5">
                        <label className="text-editorial-label text-petroleum">
                          <Instagram size={12} className="inline " /> Instagram
                        </label>
                        <input
                          className="input-luxury  h-9 px-2 "
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          placeholder="@seu.perfil"
                        />
                      </div>
                    </PlanGuard>
                  </div>

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
                        <span className="text-[9px] font-semibold text-gold uppercase tracking-tighter">
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
                          const slotsLeft = Math.max(
                            0,
                            profileCarouselLimit - existingBackgrounds.length,
                          );
                          if (files.length > slotsLeft && slotsLeft > 0) {
                            showToast(
                              `Você pode adicionar no máximo ${slotsLeft} imagem(ns) para não exceder o limite de ${profileCarouselLimit}.`,
                              'error',
                            );
                            e.target.value = '';
                            return;
                          }
                          if (files.length > profileCarouselLimit) {
                            showToast(
                              `Seu plano permite no máximo ${profileCarouselLimit} imagens.`,
                              'error',
                            );
                            e.target.value = '';
                            return;
                          }
                          const overSized = files.some(
                            (f) => f.size > 4 * 1024 * 1024,
                          );
                          if (overSized) {
                            showToast(
                              'Cada imagem de capa deve ter no máximo 4MB.',
                              'error',
                              'left',
                            );
                            e.target.value = '';
                            return;
                          }
                          setBgFiles((prev) =>
                            [...prev, ...files].slice(
                              0,
                              profileCarouselLimit - existingBackgrounds.length,
                            ),
                          );
                          e.target.value = '';
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
                          {activeBackgrounds.length < profileCarouselLimit
                            ? 'Selecionar'
                            : bgFiles.length > 0
                              ? `${bgFiles.length} selecionadas | Alterar`
                              : 'Alterar Imagens de Capa'}
                        </span>
                      </button>

                      {activeBackgrounds.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {activeBackgrounds.map((url, idx) => (
                            <div
                              key={`${url}-${idx}`}
                              className="relative rounded-luxury overflow-hidden border border-slate-200 aspect-video"
                            >
                              <SupabaseImagePreview
                                url={url}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteBackground(url, idx)}
                                className="absolute top-1 right-1 p-1 bg-white/80 border border-slate-200 text-red-500 rounded-full shadow-sm hover:bg-red-50 transition-colors z-10"
                              >
                                <X size={10} strokeWidth={3} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

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

              {/* SEÇÃO 3: MINI BIOGRAFIA */}
              <PlanGuard feature="profileLevel" label="Biografia Editorial">
                <FormSection
                  title="Mini Biografia"
                  icon={<FileText size={14} />}
                  defaultOpen={false}
                  filled={filledMap.miniBio}
                >
                  <div className="space-y-1.5">
                    <textarea
                      className="w-full px-3 py-2 h-20 bg-white border border-slate-200 rounded-luxury text-[13px] outline-none focus:border-gold transition-all resize-none"
                      value={miniBio}
                      maxLength={bioLimit}
                      onChange={(e) => setMiniBio(e.target.value)}
                      placeholder="Sua trajetória profissional..."
                    />
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[9px] font-semibold uppercase ${miniBio.length >= bioLimit ? 'text-gold' : 'text-slate-400'}`}
                      >
                        {miniBio.length} / {bioLimit}
                      </span>
                    </div>
                  </div>
                </FormSection>
              </PlanGuard>

              {/* SEÇÃO 4: TEMA VISUAL */}
              <PlanGuard feature="profileLevel" label="Biografia Editorial">
                <FormSection
                  title="Tema Visual"
                  icon={<Sparkles size={14} />}
                  defaultOpen={false}
                  filled={filledMap.temaVisual}
                >
                  <ThemeSelector
                    currentTheme={themeKey}
                    onConfirm={(theme) => setThemeKey(theme)}
                    compact
                  />
                </FormSection>
              </PlanGuard>

              {/* SEÇÃO 5: ÁREA DE ATUAÇÃO */}
              <PlanGuard feature="profileLevel" label="Área de Atuação">
                <FormSection
                  title="Área de atuação"
                  icon={<Sparkles size={14} className="text-gold" />}
                  defaultOpen={false}
                  filled={filledMap.areaAtuacao}
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-editorial-label text-petroleum">
                        Suas Especialidades
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {specialties.map((s) => (
                          <span
                            key={s}
                            className="bg-slate-50 border border-slate-200 text-petroleum text-[9px] font-semibold px-2.5 py-1.5 rounded-luxury flex items-center gap-2 uppercase tracking-wide"
                          >
                            {s}
                            <X
                              size={12}
                              className="cursor-pointer hover:text-red-500"
                              onClick={() =>
                                setSpecialties((prev) =>
                                  prev.filter((item) => item !== s),
                                )
                              }
                            />
                          </span>
                        ))}
                      </div>
                      <SpecialtySelect
                        selected={specialties}
                        onAdd={(val) =>
                          setSpecialties((prev) =>
                            prev.includes(val) ? prev : [...prev, val],
                          )
                        }
                        initialCustoms={customSpecialties}
                        onCustomsChange={setCustomSpecialties}
                      />
                      <p className="text-[10px] text-petroleum/80 font-medium italic leading-tight">
                        Suas especialidades definem como você será encontrado
                        por clientes em nosso portal.
                      </p>
                    </div>
                  </div>
                </FormSection>
              </PlanGuard>

              {/* SEÇÃO 6: CIDADES DE ATUAÇÃO */}
              <PlanGuard feature="profileLevel" label="Cidades de Atuação">
                <FormSection
                  title="Cidades de Atuação"
                  icon={<MapPin size={14} />}
                  defaultOpen={false}
                  filled={filledMap.cidades}
                  allowContentOverflow
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedCities.map((city) => (
                        <span
                          key={city}
                          className="bg-slate-50 border border-slate-200 text-petroleum text-[9px] font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-2 uppercase tracking-wide"
                        >
                          {city}
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
                        className="w-20 bg-slate-50 border border-slate-200 rounded-md px-2 h-10 text-xs font-semibold"
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
                          className="input-luxury  h-9 px-2 "
                          placeholder="Digite a cidade..."
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute z-[200] left-0 right-0 bottom-full mb-2 w-full bg-white border border-slate-200 rounded-md shadow-2xl max-h-48 overflow-y-auto">
                            {suggestions.map((city) => (
                              <button
                                key={city}
                                type="button"
                                onClick={() => handleSelectCity(city)}
                                className="w-full text-left px-4 py-3 text-[10px] uppercase font-semibold hover:bg-slate-50 border-b last:border-0"
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

              {/* SEÇÃO 7: TERMOS E PRIVACIDADE */}
              <FormSection
                title="Termos e Privacidade"
                icon={<ShieldCheck size={14} />}
                defaultOpen={!acceptTerms}
                filled={filledMap.termos}
                hasError={!!validationErrors.termos}
                forceOpen={!!validationErrors.termos}
              >
                <div className="space-y-4 py-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      disabled={hasAcceptedBefore}
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
                      disabled={hasAcceptedBefore}
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
            </form>
          </div>

          {/* BOTÕES — sempre visível no bottom do aside (sticky na viewport) */}
          <div className="sticky bottom-0 z-10 shrink-0 flex flex-row items-center justify-end gap-4 px-4 py-3 bg-petroleum border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary-white"
            >
              CANCELAR
            </button>

            <SubmitButton
              form="onboarding-form"
              success={showSuccessModal}
              isPending={isSaving}
              disabled={!formChanged}
              disabledTooltip="Não há alterações para salvar"
              icon={<Save size={14} />}
              className="px-6"
              label={'SALVAR PERFIL'}
            />
          </div>
        </aside>

        {/* PREVIEW */}
        <main className="w-full md:w-[65%] min-h-[600px] md:h-screen bg-black relative flex-grow overflow-y-auto">
          {/* Tema aplicado SOMENTE neste bloco de preview */}
          <div data-theme={themeKey}>
            <ProfilePreview
              key={themeKey} // FORÇA A REMONTAGEM DO COMPONENTE QUANDO O TEMA MUDA
              initialData={{
                full_name: fullName,
                username,
                mini_bio: miniBio,
                phone_contact: phone,
                instagram_link: instagram,
                avatar_url: photoPreview,
                cities: selectedCities,
                specialty: specialties,
                website,
                background_url: activeBackgrounds,
                plan_key: planKey,
                theme_key: themeKey,
                settings: {
                  defaults: {
                    show_phone_on_public_profile: showPhoneOnPublicProfile,
                  },
                },
              }}
            />
          </div>
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
        maxWidth="xl"
        headerIcon={
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/5">
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
        }
        footer={
          <div className="flex flex-col gap-3 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full items-stretch">
              <a
                href={`/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary-white w-full text-[10px] flex items-center justify-center gap-2"
              >
                <Sparkles size={12} className="inline mr-1 align-middle" />
                Ver perfil público
              </a>
              <button
                type="button"
                onClick={() => navigate('/dashboard', 'Abrindo seu espaço...')}
                className="btn-luxury-primary w-full text-[10px] flex items-center justify-center gap-2"
              >
                <ArrowRight size={14} />
                Ir para Espaço de Galerias
              </button>
            </div>

            {(planKey === 'FREE' || permissions.isTrial) && (
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setShowUpgradeSheet(true);
                }}
                className="btn-luxury-primary w-full text-[10px] flex items-center justify-center gap-2"
              >
                <Crown size={14} />
                Assinar plano
              </button>
            )}
          </div>
        }
      >
        <SuccessMessage
          planKey={planKey}
          isTrial={permissions.isTrial || false}
        />
      </BaseModal>

      <UpgradeSheet
        isOpen={showUpgradeSheet}
        onClose={() => setShowUpgradeSheet(false)}
        initialPlanKey="PRO"
      />

      {ToastElement}
    </>
  );
}
