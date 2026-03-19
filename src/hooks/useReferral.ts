import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';

export interface ReferralCode {
  id: string;
  code: string;
  user_id: string;
  created_at: string;
  uses: number;
  reward_coins: number;
}

export interface ReferralReward {
  type: 'referrer' | 'referred' | 'milestone';
  amount: number;
  description: string;
}

interface UseReferralState {
  referralCode: ReferralCode | null;
  totalRewards: number;
  referredUsers: number;
  loading: boolean;
  error: string | null;
}

const REFERRAL_REWARDS: Record<string, number> = {
  referrer: 50,    // When someone uses your code
  referred: 25,    // When you use a referral code
  milestone_5: 250,   // Every 5 referrals
};

/**
 * Hook for managing user referral codes and rewards
 */
export function useReferral(userId: string | undefined): UseReferralState {
  const [state, setState] = useState<UseReferralState>({
    referralCode: null,
    totalRewards: 0,
    referredUsers: 0,
    loading: true,
    error: null,
  });

  // Generate unique referral code
  const generateReferralCode = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;

    try {
      const code = `REF${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase.from('user_referral_codes').insert({
        user_id: userId,
        code,
        reward_coins: REFERRAL_REWARDS.referrer,
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        referralCode: {
          id: crypto.randomUUID(),
          code,
          user_id: userId,
          created_at: new Date().toISOString(),
          uses: 0,
          reward_coins: REFERRAL_REWARDS.referrer,
        },
      }));

      errorLogger.info('useReferral.generate', `Generated referral code: ${code}`, { userId });

      return code;
    } catch (err) {
      const userMessage = handleSupabaseError('useReferral.generate', err, { userId });
      setState(prev => ({ ...prev, error: userMessage }));
      return null;
    }
  }, [userId]);

  // Use referral code
  const useReferralCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (!userId) return false;

      try {
        // Get referrer's user ID from code
        const { data: codeData, error: codeError } = await supabase
          .from('user_referral_codes')
          .select('user_id, reward_coins')
          .eq('code', code)
          .maybeSingle();

        if (codeError) throw codeError;
        if (!codeData) {
          setState(prev => ({ ...prev, error: 'Invalid referral code' }));
          return false;
        }

        if (codeData.user_id === userId) {
          setState(prev => ({ ...prev, error: 'You cannot use your own referral code' }));
          return false;
        }

        // Record referral
        const { error: referralError } = await supabase.from('user_referrals').insert({
          referrer_id: codeData.user_id,
          referred_id: userId,
          referral_code_id: code,
        });

        if (referralError) throw referralError;

        // Award coins to referred user
        const { data: myCoins, error: myCoinsError } = await supabase
          .from('user_coins')
          .select('id, balance')
          .eq('user_id', userId)
          .maybeSingle();

        if (myCoinsError || !myCoins) throw myCoinsError || new Error('Coins not found');

        await supabase
          .from('user_coins')
          .update({ balance: (myCoins.balance || 0) + REFERRAL_REWARDS.referred })
          .eq('id', myCoins.id);

        // Award coins to referrer
        const { data: referrerCoins, error: referrerCoinsError } = await supabase
          .from('user_coins')
          .select('id, balance')
          .eq('user_id', codeData.user_id)
          .maybeSingle();

        if (referrerCoinsError || !referrerCoins) throw referrerCoinsError || new Error('Coins not found');

        await supabase
          .from('user_coins')
          .update({ balance: (referrerCoins.balance || 0) + codeData.reward_coins })
          .eq('id', referrerCoins.id);

        // Increment uses
        await supabase
          .from('user_referral_codes')
          .update({ uses: (codeData.uses || 0) + 1 })
          .eq('code', code);

        errorLogger.info('useReferral.use', `Used referral code: ${code}`, {
          userId,
          referrerId: codeData.user_id,
        });

        return true;
      } catch (err) {
        const userMessage = handleSupabaseError('useReferral.use', err, {
          code,
          userId,
        });
        setState(prev => ({ ...prev, error: userMessage }));
        return false;
      }
    },
    [userId]
  );

  return {
    ...state,
    generateReferralCode,
    useReferralCode,
  };
}
