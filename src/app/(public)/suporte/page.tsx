import { Metadata } from 'next';
import { getSEOBySegment } from '@/core/config/seo.config';
import PublicSupportContent from './PublicSupportContent';

export async function generateMetadata(): Promise<Metadata> {
  const seo = getSEOBySegment();
  return {
    title: `Tecnologia e Suporte — ${seo.brandName}`,
    description: `Saiba como funciona a tecnologia de espelhamento do Google Drive, nossa segurança de dados e escolha o melhor plano para você.`,
  };
}

export default function PublicHelpPage() {
  return <PublicSupportContent />;
}
