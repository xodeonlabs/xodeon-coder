import { useUserStats } from '@/hooks/useUserStats';
import { Coins, Zap, Target, Users, MessageCircle } from 'lucide-react';
import { LoadingState } from './LoadingState';

interface UserStatsDisplayProps {
  userId: string | undefined;
}

export function UserStatsDisplay({ userId }: UserStatsDisplayProps) {
  const { stats, loading, error } = useUserStats(userId);

  return (
    <LoadingState loading={loading} error={error}>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-lg bg-card border border-border/50 p-4 text-center">
            <Coins className="h-5 w-5 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.coins}</p>
            <p className="text-xs text-muted-foreground mt-1">Coins</p>
          </div>

          <div className="rounded-lg bg-card border border-border/50 p-4 text-center">
            <Zap className="h-5 w-5 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.apps}</p>
            <p className="text-xs text-muted-foreground mt-1">Apps</p>
          </div>

          <div className="rounded-lg bg-card border border-border/50 p-4 text-center">
            <Target className="h-5 w-5 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.achievements}</p>
            <p className="text-xs text-muted-foreground mt-1">Achievements</p>
          </div>

          <div className="rounded-lg bg-card border border-border/50 p-4 text-center">
            <Users className="h-5 w-5 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.friends}</p>
            <p className="text-xs text-muted-foreground mt-1">Friends</p>
          </div>

          <div className="rounded-lg bg-card border border-border/50 p-4 text-center">
            <MessageCircle className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.messagesCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Messages</p>
          </div>
        </div>
      )}
    </LoadingState>
  );
}
