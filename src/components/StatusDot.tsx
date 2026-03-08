import { Moon } from 'lucide-react';

export type OnlineStatus = 'online' | 'dnd' | 'offline';

interface StatusDotProps {
  status: OnlineStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Determine status from profile data */
export function getOnlineStatus(isDnd: boolean, lastSeenAt?: string | null): OnlineStatus {
  if (isDnd) return 'dnd';
  if (!lastSeenAt) return 'offline';
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  // Consider offline after 2 minutes
  if (diff > 2 * 60 * 1000) return 'offline';
  return 'online';
}

const TITLES: Record<OnlineStatus, string> = {
  online: 'Online',
  dnd: 'Niet storen',
  offline: 'Offline',
};

export function StatusDot({ status, size = 'sm', className = '' }: StatusDotProps) {
  const sizeClasses = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  const moonSize = size === 'lg' ? 12 : size === 'md' ? 9 : 7;

  if (status === 'offline') {
    return (
      <span
        className={`rounded-full border-2 border-background ${sizeClasses} bg-muted flex items-center justify-center ${className}`}
        title={TITLES.offline}
      >
        <Moon className="text-muted-foreground" style={{ width: moonSize, height: moonSize }} />
      </span>
    );
  }

  const colorClass = status === 'dnd' ? 'bg-destructive animate-pulse' : 'bg-emerald-500';

  return (
    <span
      className={`rounded-full border-2 border-background ${sizeClasses} ${colorClass} ${className}`}
      title={TITLES[status]}
    />
  );
}

// Legacy compat: accept isDnd prop
export function StatusDotLegacy({ isDnd, lastSeenAt, size = 'sm', className = '' }: {
  isDnd: boolean;
  lastSeenAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const status = getOnlineStatus(isDnd, lastSeenAt);
  return <StatusDot status={status} size={size} className={className} />;
}
