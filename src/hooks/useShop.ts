import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';

export interface ShopItem {
  id: string;
  name: string;
  description?: string;
  icon_emoji: string;
  cost: number;
  category: 'cosmetic' | 'feature' | 'boost';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  max_purchases_per_user?: number;
  duration_days?: number;
}

export interface UserPurchase {
  id: string;
  item_id: string;
  created_at: string;
  expires_at?: string;
  quantity: number;
}

interface UseShopState {
  items: ShopItem[];
  purchasedItems: UserPurchase[];
  loading: boolean;
  error: string | null;
  purchasing: boolean;
}

export function useShop(userId: string | undefined): UseShopState {
  const [state, setState] = useState<UseShopState>({
    items: [],
    purchasedItems: [],
    loading: true,
    error: null,
    purchasing: false,
  });

  // Load shop items and user purchases
  useEffect(() => {
    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Get all shop items
        const { data: items, error: itemsError } = await (supabase
          .from('shop_items' as any)
          .select('*')
          .eq('active', true)
          .order('cost', { ascending: true }) as any);

        if (itemsError) throw itemsError;

        let purchasedItems: UserPurchase[] = [];

        // Get user's purchases if logged in
        if (userId) {
          const { data: purchases, error: purchasesError } = await (supabase
            .from('user_shop_purchases' as any)
            .select('*')
            .eq('user_id', userId) as any);

          if (purchasesError) throw purchasesError;
          purchasedItems = purchases || [];
        }

        setState(prev => ({
          ...prev,
          items: items || [],
          purchasedItems,
          loading: false,
        }));
      } catch (err) {
        const userMessage = handleSupabaseError('useShop.load', err, { userId });
        setState(prev => ({
          ...prev,
          loading: false,
          error: userMessage,
        }));
      }
    })();
  }, [userId]);

  const purchaseItem = useCallback(
    async (itemId: string, userBalance: number): Promise<boolean> => {
      if (!userId) {
        errorLogger.warning('useShop.purchase', 'User not authenticated');
        return false;
      }

      try {
        setState(prev => ({ ...prev, purchasing: true, error: null }));

        // Get item details
        const item = state.items.find(i => i.id === itemId);
        if (!item) {
          throw new Error('Item not found');
        }

        // Check if user has enough coins
        if (userBalance < item.cost) {
          setState(prev => ({
            ...prev,
            purchasing: false,
            error: `Je hebt ${item.cost - userBalance} 🪙 meer nodig`,
          }));
          return false;
        }

        // Check purchase limit
        if (item.max_purchases_per_user) {
          const purchaseCount = state.purchasedItems.filter(p => p.item_id === itemId).length;
          if (purchaseCount >= item.max_purchases_per_user) {
            setState(prev => ({
              ...prev,
              purchasing: false,
              error: 'Je hebt het maximaal aantal keer dit item gekocht',
            }));
            return false;
          }
        }

        // Deduct coins from user
        const { data: coinData, error: coinError } = await supabase
          .from('user_coins')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (coinError || !coinData) throw coinError || new Error('No coin data found');

        const { error: deductError } = await supabase
          .from('user_coins')
          .update({ balance: userBalance - item.cost })
          .eq('id', coinData.id);

        if (deductError) throw deductError;

        // Record purchase
        const expiresAt = item.duration_days
          ? new Date(Date.now() + item.duration_days * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { error: purchaseError } = await (supabase.from('user_shop_purchases' as any).insert({
          user_id: userId,
          item_id: itemId,
          expires_at: expiresAt,
        }) as any);

        if (purchaseError) throw purchaseError;

        // Update local state
        setState(prev => ({
          ...prev,
          purchasedItems: [
            ...prev.purchasedItems,
            {
              id: crypto.randomUUID(),
              item_id: itemId,
              created_at: new Date().toISOString(),
              expires_at: expiresAt,
              quantity: 1,
            },
          ],
          purchasing: false,
        }));

        errorLogger.info('useShop.purchase', `Successfully purchased item: ${item.name}`, {
          userId,
          itemId,
          cost: item.cost,
        });

        return true;
      } catch (err) {
        const userMessage = handleSupabaseError('useShop.purchase', err, { itemId, userId });
        setState(prev => ({
          ...prev,
          purchasing: false,
          error: userMessage,
        }));
        return false;
      }
    },
    [userId, state.items, state.purchasedItems]
  );

  return {
    ...state,
    purchaseItem,
  };
}
