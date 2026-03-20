import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';

export interface UserStats {
  coins: number;
  apps: number;
  achievements: number;
  friends: number;
  messagesCount: number;
  createdAt: string;
  lastActivityAt: string;
}

interface UseUserStatsState {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch comprehensive user statistics
 */
export function useUserStats(userId: string | undefined): UseUserStatsState {
  const [state, setState] = useState<UseUserStatsState>({
    stats: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Get coins
        const { data: coinData, error: coinError } = await (supabase
          .from('user_coins')
          .select('balance')
          .eq('user_id', userId)
          .maybeSingle() as any);

        if (coinError) throw coinError;

        // Get app count
        const { count: appCount } = await supabase
          .from('apps')
          .select('*', { count: 'exact' })
          .eq('owner_id', userId);

        // Get achievements count
        const { count: achievementCount } = await (supabase
          .from('user_achievements' as any)
          .select('*', { count: 'exact' })
          .eq('user_id', userId) as any);

        // Get friends count (if friendship table exists)
        const { count: friendCount } = await supabase
          .from('friendship_requests')
          .select('*', { count: 'exact' })
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('status', 'accepted');

        // Get messages count
        const { count: msgCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact' })
          .eq('user_id', userId);

        // Get profile for creation date
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;

        setState(prev => ({
          ...prev,
          stats: {
            coins: coinData?.balance || 0,
            apps: appCount || 0,
            achievements: achievementCount || 0,
            friends: friendCount || 0,
            messagesCount: msgCount || 0,
            createdAt: profileData?.created_at || new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          },
          loading: false,
        }));
      } catch (err) {
        const userMessage = handleSupabaseError('useUserStats', err, { userId });
        setState(prev => ({
          ...prev,
          loading: false,
          error: userMessage,
        }));
      }
    })();
  }, [userId]);

  return state;
}
