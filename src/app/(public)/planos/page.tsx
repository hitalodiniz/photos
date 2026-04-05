// app/planos/page.tsx

import { getPlansByDomain } from '@/core/config/plans';
import { Metadata } from 'next';
import PlanosContent from './PlanosContent';

// O Next resolve isso no servidor, sem loops!
export async function generateMetadata(): Promise<Metadata> {
  const config = getPlansByDomain('suagaleria.com.br');
  return {
    title: `Planos`,
  };
}

export default function PlanosPage() {
  return <PlanosContent />;
}
