'use client';

import React from 'react';
import FormPageBase from './FormPageBase'; // Corrected import to default
import { useRouter } from 'next/navigation';

interface RelatorioBasePageProps {
  title: string;
  children: React.ReactNode;
  footerStatusText?: string;
  exportButtons?: React.ReactNode;
  onBack?: () => void;
}

export function RelatorioBasePage({
  title,
  children,
  footerStatusText,
  exportButtons,
  onBack,
}: RelatorioBasePageProps) {
  const router = useRouter();

  return (
    <FormPageBase
      title={title}
      onClose={onBack || (() => router.back())}
      onSubmit={() => {}}
      isShowButtons={false} // No default save/submit buttons
      footerStatusText={footerStatusText}
      footerButtons={exportButtons} // Render export buttons in the footer
    >
      {children}
    </FormPageBase>
  );
}
