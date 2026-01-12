'use client';

interface SecondaryButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export default function SecondaryButton({
  label,
  onClick,
  className = '',
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        btn-secondary 
        !w-auto !py-4 px-10 
        border-[#F3E5AB] 
        text-slate-500 
        hover:text-slate-900 
        hover:border-[#D4AF37] 
        hover:bg-white
        hover:shadow-md
        transition-all duration-300
        flex items-center justify-center
        whitespace-nowrap
        ${className}
      `}
    >
      {label}
    </button>
  );
}
