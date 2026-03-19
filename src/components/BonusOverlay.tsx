import { useState } from 'react';
import { Coins, X, Clock, Gift } from 'lucide-react';
import type { BonusState } from '@/hooks/useWeeklyMonthlyBonus';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface BonusOverlayProps {
  state: BonusState;
  onClose: () => void;
}

export function BonusOverlay({ state, onClose }: BonusOverlayProps) {
  const [expandedBonus, setExpandedBonus] = useState<'daily' | 'weekly' | 'monthly' | null>(null);

  if (state.loading) return null;

  const totalClaimed = (
    (state.bonuses.daily.claimed ? state.bonuses.daily.amount : 0) +
    (state.bonuses.weekly.claimed ? state.bonuses.weekly.amount : 0) +
    (state.bonuses.monthly.claimed ? state.bonuses.monthly.amount : 0)
  );

  const hasAnyClaimed = totalClaimed > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="rounded-2xl border border-border/50 p-6 sm:p-8 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-300"
        style={{ background: 'hsl(var(--card))' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {hasAnyClaimed ? (
          /* Show claimed bonuses */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Bonussen Ontvangen! 🎉</h2>
            <p className="text-3xl font-bold text-primary mb-4">+{totalClaimed} 🪙</p>

            {/* Bonus breakdown */}
            <div className="space-y-2 mb-6">
              {state.bonuses.daily.claimed && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Dagelijkse Bonus</span>
                  <span className="text-green-500 font-bold">+{state.bonuses.daily.amount}</span>
                </div>
              )}
              {state.bonuses.weekly.claimed && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Wekelijkse Bonus</span>
                  <span className="text-blue-500 font-bold">+{state.bonuses.weekly.amount}</span>
                </div>
              )}
              {state.bonuses.monthly.claimed && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Maandelijkse Bonus</span>
                  <span className="text-yellow-500 font-bold">+{state.bonuses.monthly.amount}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              Claim je bonussen elke dag, week en maand voor maximale beloningen!
            </p>

            <button
              onClick={onClose}
              className="w-full px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
            >
              Doorgaan
            </button>
          </div>
        ) : (
          /* Show already claimed / next reset info */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Coins className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-4">Alle Bonussen al Ontvangen</h2>

            {/* Bonus status with countdowns */}
            <div className="space-y-3 mb-6">
              {state.bonuses.daily.alreadyClaimed && (
                <div className="rounded-lg bg-secondary/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dagelijkse Bonus</p>
                  <p className="text-sm font-mono text-primary">{formatTime(state.nextResets.daily)}</p>
                </div>
              )}
              {state.bonuses.weekly.alreadyClaimed && (
                <div className="rounded-lg bg-secondary/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Wekelijkse Bonus</p>
                  <p className="text-sm font-mono text-primary">{formatTime(state.nextResets.weekly)}</p>
                </div>
              )}
              {state.bonuses.monthly.alreadyClaimed && (
                <div className="rounded-lg bg-secondary/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Maandelijkse Bonus</p>
                  <p className="text-sm font-mono text-primary">{formatTime(state.nextResets.monthly)}</p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
            >
              Doorgaan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
