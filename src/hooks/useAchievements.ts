import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  requirement: any;
  points_reward: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface UserAchievement extends Achievement {
  unlocked_at: string;
}

export interface UseAchievementsState {
  allAchievements: Achievement[];
  unlockedAchievements: UserAchievement[];
  loading: boolean;
  error: string | null;
}

export function useAchievements(userId: string | undefined): UseAchievementsState {
  const [state, setState] = useState<UseAchievementsState>({
    allAchievements: [],
    unlockedAchievements: [],
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

        // Fetch all achievements
        const { data: allAchievs, error: allError } = await (supabase
          .from('achievements' as any)
          .select('*')
          .order('rarity', { ascending: true }) as any);

        if (allError) throw allError;

        // Fetch user's unlocked achievements
        const { data: unlockedData, error: unlockedError } = await (supabase
          .from('user_achievements' as any)
          .select('*, achievements(*)')
          .eq('user_id', userId)
          .order('unlocked_at', { ascending: false }) as any);

        if (unlockedError) throw unlockedError;

        // Map the data
        const unlockedMap = new Map(
          (unlockedData || []).map(ua => [
            ua.achievement_id,
            {
              ...ua.achievements,
              unlocked_at: ua.unlocked_at,
            },
          ])
        );

        setState(prev => ({
          ...prev,
          allAchievements: allAchievs || [],
          unlockedAchievements: Array.from(unlockedMap.values()),
          loading: false,
        }));
      } catch (err) {
        const userMessage = handleSupabaseError('useAchievements', err, { userId });
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

/**
 * Helper to check and award achievements
 * This would typically be called from a background job or after specific actions
 */
export async function checkAndAwardAchievements(
  userId: string,
  trigger: {
    type: string;
    value?: number;
  }
): Promise<string[]> {
  try {
    const awardedIds: string[] = [];

    // Get all achievements
    const { data: achievements } = await supabase.from('achievements').select('*');

    if (!achievements) return awardedIds;

    // Get user's current achievements
    const { data: userAchievs } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlockedIds = new Set((userAchievs || []).map(ua => ua.achievement_id));

    // Check each achievement
    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      const requirement = achievement.requirement;
      let shouldAward = false;

      switch (requirement.type) {
        case 'app_created':
          if (trigger.type === 'app_created') {
            // This would need to check total count from database
            shouldAward = true;
          }
          break;

        case 'coins_earned':
          if (trigger.type === 'coins_earned' && trigger.value) {
            // This would need to check total coins earned
            shouldAward = true;
          }
          break;

        case 'messages_sent':
          if (trigger.type === 'message_sent') {
            // Count total messages and check
            shouldAward = true;
          }
          break;

        case 'friends_count':
          if (trigger.type === 'friend_added') {
            // Count friends
            shouldAward = true;
          }
          break;

        default:
          break;
      }

      if (shouldAward) {
        const { error } = await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievement.id,
        });

        if (!error) {
          awardedIds.push(achievement.id);
          errorLogger.info('checkAndAwardAchievements', `Awarded achievement: ${achievement.name}`, {
            userId,
            achievementId: achievement.id,
          });
        }
      }
    }

    return awardedIds;
  } catch (err) {
    errorLogger.error('checkAndAwardAchievements', 'Failed to check achievements', err, {
      userId,
      trigger,
    });
    return [];
  }
}
