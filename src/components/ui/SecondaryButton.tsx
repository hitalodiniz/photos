'use client';

import React from 'react';

export default function SecondaryButton({
  label,
  onClick,
  className = '',
  icon,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn-secondary-white ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
    </button>
  );
}
