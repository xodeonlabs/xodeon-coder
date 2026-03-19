import { useState } from 'react';
import { useShop } from '@/hooks/useShop';
import { Coins, Lock, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CoinShopProps {
  userId: string | undefined;
  userBalance: number;
  onPurchaseSuccess?: () => void;
}

const rarityColors = {
  common: 'border-gray-500 bg-gray-500/5',
  uncommon: 'border-green-500 bg-green-500/5',
  rare: 'border-blue-500 bg-blue-500/5',
  epic: 'border-purple-500 bg-purple-500/5',
  legendary: 'border-yellow-500 bg-yellow-500/5',
};

export function CoinShop({ userId, userBalance, onPurchaseSuccess }: CoinShopProps) {
  const { items, purchasedItems, loading, error, purchasing, purchaseItem } = useShop(userId);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedItemData = items.find(i => i.id === selectedItem);
  const hasEnoughCoins = selectedItemData ? userBalance >= selectedItemData.cost : false;
  const isPurchased = selectedItem && purchasedItems.some(p => p.item_id === selectedItem);

  const handlePurchase = async () => {
    if (!selectedItemData || !userId) return;

    const success = await purchaseItem(selectedItemData.id, userBalance);
    if (success) {
      setShowConfirm(false);
      setSelectedItem(null);
      onPurchaseSuccess?.();
    }
  };

  const groupedItems = {
    cosmetic: items.filter(i => i.category === 'cosmetic'),
    feature: items.filter(i => i.category === 'feature'),
    boost: items.filter(i => i.category === 'boost'),
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Shop loaded...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current balance */}
      <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <Coins className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">Huidge balans</p>
          <p className="text-2xl font-bold text-primary">{userBalance} 🪙</p>
        </div>
      </div>

      {/* Shop categories */}
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground capitalize">
            {category === 'cosmetic' && '🎨 Uiterlijk'}
            {category === 'feature' && '✨ Features'}
            {category === 'boost' && '⚡ Boosts'}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categoryItems.map(item => {
              const isPurchasedItem = purchasedItems.some(p => p.item_id === item.id);
              const canBuy = userBalance >= item.cost && !isPurchasedItem;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item.id);
                    setShowConfirm(true);
                  }}
                  className={cn(
                    'rounded-lg border-2 p-3 text-center transition-all hover:shadow-md disabled:opacity-50',
                    rarityColors[item.rarity],
                    !canBuy && 'opacity-60 cursor-not-allowed'
                  )}
                  disabled={!canBuy}
                >
                  <div className="text-2xl mb-2">{item.icon_emoji}</div>

                  <h4 className="text-xs font-semibold text-foreground truncate">{item.name}</h4>

                  {isPurchasedItem ? (
                    <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 text-xs mt-2">
                      <Check className="h-3 w-3" />
                      <span>Eigendom</span>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-primary mt-2 flex items-center justify-center gap-1">
                      {item.cost} 🪙
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Confirmation dialog */}
      {selectedItemData && (
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <div className="text-center">
                  <div className="text-4xl mb-2">{selectedItemData.icon_emoji}</div>
                  <p>{selectedItemData.name}</p>
                </div>
              </DialogTitle>
              <DialogDescription>{selectedItemData.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Details */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kostprijs:</span>
                  <span className="font-bold">{selectedItemData.cost} 🪙</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Huidge balans:</span>
                  <span className={cn('font-bold', hasEnoughCoins ? 'text-green-600' : 'text-red-600')}>
                    {userBalance} 🪙
                  </span>
                </div>
                {selectedItemData.duration_days && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Geldigheidsduur:</span>
                    <span className="font-bold">{selectedItemData.duration_days} dagen</span>
                  </div>
                )}
              </div>

              {!hasEnoughCoins && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-600">
                    Je hebt {selectedItemData.cost - userBalance} 🪙 meer nodig
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  Annuleer
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={!hasEnoughCoins || purchasing}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg text-white font-semibold transition-colors',
                    hasEnoughCoins
                      ? 'bg-primary hover:bg-primary/90 active:scale-95'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {purchasing ? 'Bezig...' : `Kopen voor ${selectedItemData.cost} 🪙`}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
