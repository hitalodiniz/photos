// app/planos/page.tsx
import { Metadata } from 'next';
import { getPlansByDomain } from '@/core/config/plans';
import PrivacidadeContent from './PrivacidadeContent';

// O Next resolve isso no servidor, sem loops!
export async function generateMetadata(): Promise<Metadata> {
  const config = getPlansByDomain('suagaleria.com.br');
  return {
    title: `Privacidade`,
  };
}

export default function PrivacidadePage() {
  return <PrivacidadeContent />;
}
