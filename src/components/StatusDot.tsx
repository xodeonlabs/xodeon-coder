interface StatusDotProps {
  isDnd: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusDot({ isDnd, size = 'sm', className = '' }: StatusDotProps) {
  const sizeClasses = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  return (
    <span
      className={`rounded-full border-2 border-background ${sizeClasses} ${isDnd ? 'bg-destructive animate-pulse' : 'bg-emerald-500'} ${className}`}
      title={isDnd ? 'Niet storen' : 'Beschikbaar'}
    />
  );
}
