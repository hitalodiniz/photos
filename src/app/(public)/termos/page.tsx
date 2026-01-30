// app/planos/page.tsx
import { Metadata } from 'next';
import PlanosContent from './PlanosContent'; // O componente com 'use client'
import { getPlansByDomain } from '@/core/config/plans';
import TermosContent from './TermosContent';

// O Next resolve isso no servidor, sem loops!
export async function generateMetadata(): Promise<Metadata> {
  const config = getPlansByDomain('suagaleria.com.br');
  return {
    title: `Termos de Uso`,
  };
}

export default function TermosPage() {
  return <TermosContent />;
}
