'use client';

import React from 'react';

interface FieldLabelProps {
  icon: React.ElementType;
  label: string;
  required?: boolean;
}

export function FieldLabel({ icon: Icon, label, required }: FieldLabelProps) {
  return (
    <label>
      <Icon size={12} strokeWidth={2} className="text-gold" />
      {label}
      {required && <span className="text-red-400">*</span>}
    </label>
  );
}
