'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Profile } from '@/core/types/profile';

interface OnboardingGuardProps {
  profile: Profile | null;
  children: React.ReactNode;
}

/**
 * Redireciona para /onboarding quando o usuário está em uma rota (dashboard)
 * que não seja /onboarding e o perfil está incompleto (falta full_name ou username).
 * Não exibe modal — redireciona direto para o formulário de onboarding.
 */
export default function OnboardingGuard({
  profile,
  children,
}: OnboardingGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/onboarding')) {
      setCanShow(true);
      return;
    }
    const isProfileComplete = profile?.full_name && profile?.username;
    if (!isProfileComplete) {
      router.replace('/onboarding');
      return;
    }
    setCanShow(true);
  }, [pathname, profile, router]);

  if (!canShow) return null;

  return <>{children}</>;
}
