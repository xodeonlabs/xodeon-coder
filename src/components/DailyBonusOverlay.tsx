import { useState } from 'react';
import { Coins, X, Clock, Gift } from 'lucide-react';
import type { DailyBonusState } from '@/hooks/useDailyBonus';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function DailyBonusOverlay({ state, onClose }: { state: DailyBonusState; onClose: () => void }) {
  if (state.loading) return null;

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

        {state.claimed ? (
          /* Just claimed! */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Dagelijkse Bonus!</h2>
            <p className="text-3xl font-bold text-primary mb-1">+5 🪙</p>
            <p className="text-sm text-muted-foreground">Je hebt je dagelijkse coins ontvangen.</p>
            <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
              <Clock className="h-3 w-3" />
              Volgende bonus over {formatTime(state.secondsUntilReset)}
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
            >
              Doorgaan
            </button>
          </div>
        ) : (
          /* Already claimed today */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Coins className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Bonus al ontvangen</h2>
            <p className="text-sm text-muted-foreground mb-4">Je hebt vandaag je dagelijkse coins al ontvangen.</p>
            <div className="rounded-xl bg-secondary/30 px-4 py-3 mb-5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Volgende bonus over</p>
              <p className="text-2xl font-mono font-bold text-foreground">{formatTime(state.secondsUntilReset)}</p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
            >
              Doorgaan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
