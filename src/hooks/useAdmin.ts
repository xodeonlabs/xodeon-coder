import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';

export interface AdminUser {
  id: string;
  email: string;
  display_name?: string;
  coin_balance: number;
  created_at: string;
  last_sign_in: string;
}

export interface AdminStats {
  totalUsers: number;
  totalCoinsDistributed: number;
  totalAppsCreated: number;
  activeUsersToday: number;
}

interface UseAdminState {
  users: AdminUser[];
  stats: AdminStats | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for admin panel functionality
 */
export function useAdmin() {
  const [state, setState] = useState<UseAdminState>({
    users: [],
    stats: null,
    loading: false,
    error: null,
  });

  // Load admin stats
  const loadStats = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get user count
      const usersResult = await supabase.auth.admin.listUsers() as any;
      const userCount = usersResult?.data?.users?.length ?? 0;

      // Get total coins
      const { data: coinData, error: coinError } = await supabase
        .from('user_coins')
        .select('balance', { count: 'exact' });

      if (coinError) throw coinError;

      const totalCoins = (coinData || []).reduce((sum, record) => sum + (record.balance || 0), 0);

      // Get total apps
      const { count: appCount } = await supabase
        .from('apps')
        .select('*', { count: 'exact' });

      setState(prev => ({
        ...prev,
        stats: {
          totalUsers: userCount || 0,
          totalCoinsDistributed: totalCoins,
          totalAppsCreated: appCount || 0,
          activeUsersToday: 0, // Would need activity tracking
        },
        loading: false,
      }));
    } catch (err) {
      const userMessage = handleSupabaseError('useAdmin.loadStats', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: userMessage,
      }));
    }
  }, []);

  // Add coins to user
  const addCoinsToUser = useCallback(
    async (userId: string, amount: number, reason: string): Promise<boolean> => {
      try {
        const { data: coinData, error: selectError } = await supabase
          .from('user_coins')
          .select('id, balance')
          .eq('user_id', userId)
          .maybeSingle();

        if (selectError || !coinData) throw selectError || new Error('User coins not found');

        const { error: updateError } = await supabase
          .from('user_coins')
          .update({ balance: (coinData.balance || 0) + amount })
          .eq('id', coinData.id);

        if (updateError) throw updateError;

        errorLogger.info('useAdmin.addCoinsToUser', `Added ${amount} coins to user`, {
          userId,
          amount,
          reason,
        });

        return true;
      } catch (err) {
        errorLogger.error('useAdmin.addCoinsToUser', 'Failed to add coins', err, {
          userId,
          amount,
        });
        return false;
      }
    },
    []
  );

  // Remove coins from user
  const removeCoinsFromUser = useCallback(
    async (userId: string, amount: number, reason: string): Promise<boolean> => {
      try {
        const { data: coinData, error: selectError } = await supabase
          .from('user_coins')
          .select('id, balance')
          .eq('user_id', userId)
          .maybeSingle();

        if (selectError || !coinData) throw selectError || new Error('User coins not found');

        const newBalance = Math.max(0, (coinData.balance || 0) - amount);

        const { error: updateError } = await supabase
          .from('user_coins')
          .update({ balance: newBalance })
          .eq('id', coinData.id);

        if (updateError) throw updateError;

        errorLogger.info('useAdmin.removeCoinsFromUser', `Removed ${amount} coins from user`, {
          userId,
          amount,
          reason,
        });

        return true;
      } catch (err) {
        errorLogger.error('useAdmin.removeCoinsFromUser', 'Failed to remove coins', err, {
          userId,
          amount,
        });
        return false;
      }
    },
    []
  );

  // Suspend user
  const suspendUser = useCallback(async (userId: string, reason: string): Promise<boolean> => {
    try {
      // Mark user as suspended in a hypothetical suspension table
      const { error } = await (supabase.from('user_suspensions' as any).insert({
        user_id: userId,
        reason,
        suspended_at: new Date().toISOString(),
      }) as any);

      if (error) throw error;

      errorLogger.info('useAdmin.suspendUser', `Suspended user: ${userId}`, { reason });

      return true;
    } catch (err) {
      errorLogger.error('useAdmin.suspendUser', 'Failed to suspend user', err, { userId });
      return false;
    }
  }, []);

  // Award achievement to user
  const awardAchievement = useCallback(
    async (userId: string, achievementId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievementId,
        });

        if (error && !error.message.includes('duplicate')) throw error;

        errorLogger.info('useAdmin.awardAchievement', `Awarded achievement to user`, {
          userId,
          achievementId,
        });

        return true;
      } catch (err) {
        errorLogger.error('useAdmin.awardAchievement', 'Failed to award achievement', err, {
          userId,
          achievementId,
        });
        return false;
      }
    },
    []
  );

  return {
    ...state,
    loadStats,
    addCoinsToUser,
    removeCoinsFromUser,
    suspendUser,
    awardAchievement,
  };
}
