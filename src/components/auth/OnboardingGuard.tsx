'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Profile } from '@/core/types/profile';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface OnboardingGuardProps {
  profile: Profile | null;
  children: React.ReactNode;
}

const REDIRECT_MESSAGE =
  'Seu perfil está incompleto. Para acessar o dashboard, complete seu nome, username e mini bio na página de configuração.';

/**
 * Redireciona para /onboarding quando o usuário está em uma rota (dashboard)
 * que não seja /onboarding e o perfil está incompleto (falta full_name, username ou mini_bio).
 * Exibe um modal informando o motivo antes do redirecionamento.
 */
export default function OnboardingGuard({
  profile,
  children,
}: OnboardingGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [canShow, setCanShow] = useState(false);
  const [showRedirectModal, setShowRedirectModal] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/onboarding')) {
      setCanShow(true);
      return;
    }
    const isProfileComplete = profile?.full_name && profile?.username;
    if (!isProfileComplete) {
      setShowRedirectModal(true);
      return;
    }
    setCanShow(true);
  }, [pathname, profile, router]);

  const handleGoToOnboarding = () => {
    setShowRedirectModal(false);
    router.replace('/onboarding');
  };

  if (!canShow && !showRedirectModal) return null;

  return (
    <>
      {canShow ? children : null}
      <ConfirmationModal
        isOpen={showRedirectModal}
        onClose={handleGoToOnboarding}
        onConfirm={handleGoToOnboarding}
        title="Perfil incompleto"
        message={REDIRECT_MESSAGE}
        confirmText="Completar perfil"
        variant="primary"
      />
    </>
  );
}
