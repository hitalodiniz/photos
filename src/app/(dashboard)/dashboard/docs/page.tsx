import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfileData } from '@/core/services/profile.service';
import { readdir } from 'fs/promises';
import { join } from 'path';
import DocsListContent from './DocsListContent';

export const metadata: Metadata = {
  title: 'Documentação Técnica',
  description: 'Documentação técnica do projeto',
};

async function getDocsFiles() {
  try {
    const docsPath = join(process.cwd(), 'docs');
    const files = await readdir(docsPath);
    return files
      .filter((file) => file.endsWith('.md'))
      .map((file) => ({
        name: file,
        slug: file.replace('.md', ''),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Erro ao ler arquivos de documentação:', error);
    return [];
  }
}

export default async function DocsPage() {
  // Verifica autenticação
  const resultProfile = await getProfileData();

  if (!resultProfile.success || !resultProfile.profile) {
    redirect(
      resultProfile.error === 'Usuário não autenticado.' ? '/' : '/onboarding',
    );
  }

  const profile = resultProfile.profile;

  // Verifica se o perfil está completo
  const isProfileComplete =
    profile.full_name && profile.username && profile.mini_bio;

  if (!isProfileComplete) {
    redirect('/onboarding');
  }

  // 🔒 SEGURANÇA: Apenas usuário 'hitalodiniz' pode acessar
  if (profile.username !== 'hitalodiniz') {
    redirect('/dashboard');
  }

  const docsFiles = await getDocsFiles();

  return <DocsListContent docsFiles={docsFiles} />;
}
