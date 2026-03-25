import { StatusDot, getOnlineStatus } from '@/components/StatusDot';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export interface ActiveCollaborator {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  lastSeenAt?: string | null;
  isDnd?: boolean;
}

interface ActiveCollaboratorsBarProps {
  collaborators: ActiveCollaborator[];
}

export function ActiveCollaboratorsBar({ collaborators }: ActiveCollaboratorsBarProps) {
  if (collaborators.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border bg-muted/30">
        <span className="text-[10px] text-muted-foreground mr-1">Online:</span>
        {collaborators.map((user) => {
          const status = getOnlineStatus(!!user.isDnd, user.lastSeenAt);
          const label = user.displayName || user.email.split('@')[0];
          const initials = label.slice(0, 2).toUpperCase();

          return (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={label}
                      className="w-6 h-6 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-border flex items-center justify-center text-[9px] font-bold text-primary">
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={status} size="sm" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
