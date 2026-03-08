import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DAILY_BONUS_AMOUNT = 5;

export function useDailyBonus(userId: string | undefined) {
  const claimed = useRef(false);

  useEffect(() => {
    if (!userId || claimed.current) return;
    claimed.current = true;

    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);

        // Get current coin record
        const { data: coinData } = await supabase
          .from('user_coins')
          .select('id, balance, last_daily_bonus' as any)
          .eq('user_id', userId)
          .maybeSingle();

        if (!coinData) return;

        const lastBonus = (coinData as any).last_daily_bonus;
        if (lastBonus === today) return; // Already claimed today

        // Update balance and last_daily_bonus
        await supabase
          .from('user_coins')
          .update({
            balance: (coinData.balance || 0) + DAILY_BONUS_AMOUNT,
            last_daily_bonus: today,
          } as any)
          .eq('id', coinData.id);

        console.log(`🎁 Dagelijkse bonus: +${DAILY_BONUS_AMOUNT} coins`);
      } catch (err) {
        console.error('Daily bonus error:', err);
      }
    })();
  }, [userId]);
}
