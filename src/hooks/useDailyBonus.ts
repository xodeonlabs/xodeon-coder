import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DAILY_BONUS_AMOUNT = 5;

export interface DailyBonusState {
  loading: boolean;
  claimed: boolean;          // true = bonus was just claimed now
  alreadyClaimed: boolean;   // true = was already claimed earlier today
  secondsUntilReset: number; // seconds until midnight
}

function getSecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

export function useDailyBonus(userId: string | undefined): DailyBonusState {
  const ran = useRef(false);
  const [state, setState] = useState<DailyBonusState>({
    loading: true,
    claimed: false,
    alreadyClaimed: false,
    secondsUntilReset: getSecondsUntilMidnight(),
  });

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({ ...prev, secondsUntilReset: getSecondsUntilMidnight() }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);

        const { data: coinData } = await supabase
          .from('user_coins')
          .select('id, balance, last_daily_bonus' as any)
          .eq('user_id', userId)
          .maybeSingle() as any;

        if (!coinData) {
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        const lastBonus = coinData.last_daily_bonus;
        if (lastBonus === today) {
          setState(prev => ({ ...prev, loading: false, alreadyClaimed: true }));
          return;
        }

        const { data, error } = await supabase
          .from('user_coins')
          .update({
            balance: (coinData.balance || 0) + DAILY_BONUS_AMOUNT,
            last_daily_bonus: today,
          } as any)
          .eq('id', coinData.id) as any;

        if (error) throw error;

        setState(prev => ({ ...prev, loading: false, claimed: true }));
      } catch (err) {
        console.error('Daily bonus error:', err);
        setState(prev => ({ ...prev, loading: false }));
      }
    })();
  }, [userId]);

  return state;
}
