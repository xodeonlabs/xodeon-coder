import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BonusState {
  loading: boolean;
  bonuses: {
    daily: { claimed: boolean; alreadyClaimed: boolean; amount: number };
    weekly: { claimed: boolean; alreadyClaimed: boolean; amount: number };
    monthly: { claimed: boolean; alreadyClaimed: boolean; amount: number };
  };
  nextResets: {
    daily: number;    // seconds until midnight
    weekly: number;   // seconds until Monday midnight
    monthly: number;  // seconds until 1st of month midnight
  };
}

const BONUS_AMOUNTS = {
  daily: 5,
  weekly: 20,
  monthly: 100,
};

function getSecondsUntil(targetDate: Date): number {
  const now = new Date();
  return Math.floor((targetDate.getTime() - now.getTime()) / 1000);
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function getNextMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

function getNextMonthStart(): Date {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth;
}

function getDateKey(period: 'daily' | 'weekly' | 'monthly'): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  if (period === 'daily') {
    return dateStr;
  } else if (period === 'weekly') {
    // ISO week start (Monday)
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().slice(0, 10);
  } else {
    // Month start
    return dateStr.slice(0, 7) + '-01';
  }
}

export function useWeeklyMonthlyBonus(userId: string | undefined): BonusState {
  const ran = useRef(false);
  const [state, setState] = useState<BonusState>({
    loading: true,
    bonuses: {
      daily: { claimed: false, alreadyClaimed: false, amount: BONUS_AMOUNTS.daily },
      weekly: { claimed: false, alreadyClaimed: false, amount: BONUS_AMOUNTS.weekly },
      monthly: { claimed: false, alreadyClaimed: false, amount: BONUS_AMOUNTS.monthly },
    },
    nextResets: {
      daily: getSecondsUntil(getNextMidnight()),
      weekly: getSecondsUntil(getNextMonday()),
      monthly: getSecondsUntil(getNextMonthStart()),
    },
  });

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        nextResets: {
          daily: getSecondsUntil(getNextMidnight()),
          weekly: getSecondsUntil(getNextMonday()),
          monthly: getSecondsUntil(getNextMonthStart()),
        },
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        // Get user coins with bonus history
        const { data: coinData, error: coinError } = await supabase
          .from('user_coins')
          .select('id, balance, last_daily_bonus, last_weekly_bonus, last_monthly_bonus')
          .eq('user_id', userId)
          .maybeSingle() as any;

        if (coinError) throw coinError;
        if (!coinData) {
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const weekKey = getDateKey('weekly');
        const monthKey = getDateKey('monthly');

        let totalBonus = 0;
        const newBonuses = { ...state.bonuses };

        // Check daily bonus
        if (coinData.last_daily_bonus === today) {
          newBonuses.daily.alreadyClaimed = true;
        } else {
          newBonuses.daily.claimed = true;
          totalBonus += BONUS_AMOUNTS.daily;
        }

        // Check weekly bonus
        if (coinData.last_weekly_bonus === weekKey) {
          newBonuses.weekly.alreadyClaimed = true;
        } else {
          newBonuses.weekly.claimed = true;
          totalBonus += BONUS_AMOUNTS.weekly;
        }

        // Check monthly bonus
        if (coinData.last_monthly_bonus === monthKey) {
          newBonuses.monthly.alreadyClaimed = true;
        } else {
          newBonuses.monthly.claimed = true;
          totalBonus += BONUS_AMOUNTS.monthly;
        }

        // Only update if there are new bonuses to claim
        if (totalBonus > 0) {
          const updateData: any = {
            balance: (coinData.balance || 0) + totalBonus,
          };

          if (newBonuses.daily.claimed) updateData.last_daily_bonus = today;
          if (newBonuses.weekly.claimed) updateData.last_weekly_bonus = weekKey;
          if (newBonuses.monthly.claimed) updateData.last_monthly_bonus = monthKey;

          const { error: updateError } = await supabase
            .from('user_coins')
            .update(updateData)
            .eq('id', coinData.id);

          if (updateError) throw updateError;
        }

        setState(prev => ({
          ...prev,
          loading: false,
          bonuses: newBonuses,
        }));
      } catch (err) {
        console.error('Bonus error:', err);
        setState(prev => ({ ...prev, loading: false }));
      }
    })();
  }, [userId]);

  return state;
}
