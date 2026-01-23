import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getProfileData } from '@/core/services/profile.service';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import DocsContent from './DocsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `${resolvedParams.slug} - Documentação`,
    description: 'Documentação técnica do projeto',
  };
}

async function getDocsContent(slug: string) {
  try {
    const docsPath = join(process.cwd(), 'docs');
    const filePath = join(docsPath, `${slug}.md`);
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

async function getAllDocsSlugs() {
  try {
    const docsPath = join(process.cwd(), 'docs');
    const files = await readdir(docsPath);
    return files
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace('.md', ''));
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const slugs = await getAllDocsSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

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

  // 🔒 SEGURANÇA: Apenas usuários com a role 'admin' podem acessar
  if (!profile.roles?.includes('admin')) {
    redirect('/dashboard');
  }

  const content = await getDocsContent(slug);

  if (!content) {
    notFound();
  }

  return <DocsContent content={content} slug={slug} />;
}
