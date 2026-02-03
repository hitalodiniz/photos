'use client';

import { useState } from 'react';
import { usePlan } from '@/core/context/PlanContext';
import { PlanGuard } from '@/components/auth';
import { GridBasePage } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function TeamSettings() {
  const { permissions } = usePlan();
  const [teamMembers, setTeamMembers] = useState([]); // Mock data
  const router = useRouter();

  const handleInvite = () => {
    if (teamMembers.length >= permissions.teamMembers) {
      // Trigger upgrade modal
    } else {
      // Proceed with invitation
    }
  };

  return (
    <GridBasePage onBack={() => router.back()}>
      <PlanGuard feature="teamMembers" label="Gerenciamento de Equipe">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Equipe</h1>
          <p className="text-sm text-gray-500">
            Você pode convidar até {permissions.teamMembers} membros para sua equipe.
          </p>
          <div className="mt-4">
            {/* List of team members */}
          </div>
          <button
            onClick={handleInvite}
            className="btn-luxury-primary mt-4"
          >
            Convidar Membro
          </button>
        </div>
      </PlanGuard>
    </GridBasePage>
  );
}
