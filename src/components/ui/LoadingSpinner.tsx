interface LoadingSpinnerProps {
  text?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({
  text,
  className,
  size = 'md',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-4',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className ?? ''}`}
    >
      <div
        className={`${sizeClasses[size]} border-slate-200 border-t-petroleum rounded-full animate-spin`}
      />
      {text && <p className="text-xs font-medium text-slate-500">{text}</p>}
    </div>
  );
}