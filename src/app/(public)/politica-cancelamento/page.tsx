// app/planos/page.tsx
import { Metadata } from 'next';
import { getPlansByDomain } from '@/core/config/plans';
import PolticaCancelContent from './PolticaCancelContent';

// O Next resolve isso no servidor, sem loops!
export async function generateMetadata(): Promise<Metadata> {
  const config = getPlansByDomain('suagaleria.com.br');
  return {
    title: `Política de Cancelamento`,
  };
}

export default function PolticaCancelPage() {
  return <PolticaCancelContent />;
}
