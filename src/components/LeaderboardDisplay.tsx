import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';
import { Medal } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  coins: number;
  apps_count: number;
  achievements_count: number;
  total_score: number;
}

interface UseLeaderboardState {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch leaderboard data based on ranking type
 */
export function useLeaderboard(
  type: 'coins' | 'apps' | 'achievements' | 'overall' = 'coins',
  limit = 10
): UseLeaderboardState {
  const [state, setState] = useState<UseLeaderboardState>({
    entries: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Get user coins and profiles
        const { data: coinData, error: coinError } = await (supabase
          .from('user_coins')
          .select(`
          user_id,
          balance
        `)
          .order('balance', { ascending: false })
          .limit(limit * 2) as any);

        if (coinError) throw coinError;

        // Get profiles for the users
        const userIds = (coinData || []).map((cd: any) => cd.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        // Get app counts
        const { data: appData, error: appError } = await supabase
          .from('apps')
          .select('owner_id')
          .or('visibility.eq.public,visibility.eq.open');

        if (appError) throw appError;

        // Count apps per user
        const appCounts = new Map<string, number>();
        (appData || []).forEach(app => {
          appCounts.set(app.owner_id, (appCounts.get(app.owner_id) || 0) + 1);
        });

        // Get achievements counts
        const { data: achievementData, error: achievError } = await (supabase
          .from('user_achievements' as any)
          .select('user_id') as any);

        if (achievError) throw achievError;

        const achievementCounts = new Map<string, number>();
        (achievementData || []).forEach(ua => {
          achievementCounts.set(ua.user_id, (achievementCounts.get(ua.user_id) || 0) + 1);
        });

        const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

        const entries: LeaderboardEntry[] = (coinData || [])
          .filter((cd: any) => profileMap.has(cd.user_id) && (profileMap.get(cd.user_id) as any)?.display_name)
          .map((cd: any) => {
            const profile = profileMap.get(cd.user_id) as any;
            const appsCount = appCounts.get(cd.user_id) || 0;
            const achievementsCount = achievementCounts.get(cd.user_id) || 0;

            const totalScore =
              (cd.balance || 0) * 1 + appsCount * 50 + achievementsCount * 100;

            return {
              user_id: cd.user_id,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              coins: cd.balance || 0,
              apps_count: appsCount,
              achievements_count: achievementsCount,
              total_score: totalScore,
            };
          });

        // Sort by selected type
        const sorted = [...entries].sort((a, b) => {
          switch (type) {
            case 'coins':
              return b.coins - a.coins;
            case 'apps':
              return b.apps_count - a.apps_count;
            case 'achievements':
              return b.achievements_count - a.achievements_count;
            case 'overall':
              return b.total_score - a.total_score;
          }
        });

        setState(prev => ({
          ...prev,
          entries: sorted.slice(0, limit),
          loading: false,
        }));
      } catch (err) {
        const userMessage = handleSupabaseError('useLeaderboard', err, {
          type,
          limit,
        });
        setState(prev => ({
          ...prev,
          loading: false,
          error: userMessage,
        }));
      }
    })();
  }, [type, limit]);

  return state;
}

interface LeaderboardProps {
  type?: 'coins' | 'apps' | 'achievements' | 'overall';
  limit?: number;
}

export function Leaderboard({ type = 'coins', limit = 10 }: LeaderboardProps) {
  const { entries, loading, error } = useLeaderboard(type, limit);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  const getValueLabel = () => {
    switch (type) {
      case 'coins':
        return '🪙';
      case 'apps':
        return '📱';
      case 'achievements':
        return '🏆';
      case 'overall':
        return '⭐';
    }
  };

  const getValue = (entry: LeaderboardEntry) => {
    switch (type) {
      case 'coins':
        return entry.coins;
      case 'apps':
        return entry.apps_count;
      case 'achievements':
        return entry.achievements_count;
      case 'overall':
        return entry.total_score;
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Leaderboard laden...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">{error}</div>;
  }

  if (entries.length === 0) {
    return <div className="text-center text-muted-foreground">Geen deelnemers gevonden</div>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <div
          key={entry.user_id}
          className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-3 hover:bg-card/75 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="text-lg font-bold text-primary w-6">
              {getMedalEmoji(index + 1)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{entry.display_name}</p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>🪙 {entry.coins}</span>
                <span>📱 {entry.apps_count}</span>
                <span>🏆 {entry.achievements_count}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              {getValue(entry)} {getValueLabel()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
