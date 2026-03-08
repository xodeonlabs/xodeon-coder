import { useState } from 'react';
import { ArrowUp, ArrowDown, Check, Lock, Sparkles, Megaphone, MessageCircle, Users, Crown, Coins, Zap, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CoinConfirmDialog } from '@/components/CoinConfirmDialog';

interface OrgUpgradesProps {
  orgId: string;
  orgName: string;
  currentLevel: number;
  orgBalance: number;
  isOwner: boolean;
  onUpgrade: (newLevel: number) => void;
}

// Tax rates per level (percentage taken from all coin transactions)
const TAX_RATES: Record<number, number> = {
  1: 0,
  2: 2,
  3: 5,
  4: 8,
  5: 12,
  6: 16,
  7: 20,
  8: 25,
  9: 30,
  10: 35,
};

const LEVELS = [
  {
    level: 1, name: 'Starter', icon: '🏠', color: 'text-muted-foreground',
    borderColor: 'border-border/40', bgGlow: '', cost: 0,
    perks: [
      { icon: Megaphone, text: '1 advertentie' },
      { icon: Users, text: 'Max 10 leden' },
      { icon: MessageCircle, text: '48u chat bewaring' },
    ],
  },
  {
    level: 2, name: 'Groeier', icon: '🌱', color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30', bgGlow: 'from-emerald-500/5 to-transparent', cost: 100,
    perks: [
      { icon: Megaphone, text: '2 advertenties' },
      { icon: Users, text: 'Max 25 leden' },
      { icon: MessageCircle, text: '7 dagen chat bewaring' },
      { icon: Sparkles, text: 'Bedrijfsprofiel badge' },
    ],
  },
  {
    level: 3, name: 'Professional', icon: '⚡', color: 'text-blue-400',
    borderColor: 'border-blue-500/30', bgGlow: 'from-blue-500/5 to-transparent', cost: 250,
    perks: [
      { icon: Megaphone, text: '3 advertenties' },
      { icon: Users, text: 'Max 50 leden' },
      { icon: MessageCircle, text: '30 dagen chat bewaring' },
      { icon: Sparkles, text: 'Bedrijfsprofiel badge' },
      { icon: Zap, text: 'Prioriteit in zoekresultaten' },
    ],
  },
  {
    level: 4, name: 'Enterprise', icon: '💎', color: 'text-purple-400',
    borderColor: 'border-purple-500/30', bgGlow: 'from-purple-500/5 to-transparent', cost: 500,
    perks: [
      { icon: Megaphone, text: '5 advertenties' },
      { icon: Users, text: 'Max 100 leden' },
      { icon: MessageCircle, text: '90 dagen chat bewaring' },
      { icon: Sparkles, text: 'Gouden badge' },
      { icon: Zap, text: 'Prioriteit in zoekresultaten' },
      { icon: Crown, text: 'Exclusieve analytics' },
    ],
  },
  {
    level: 5, name: 'Legende', icon: '👑', color: 'text-amber-400',
    borderColor: 'border-amber-500/30', bgGlow: 'from-amber-500/5 to-transparent', cost: 1000,
    perks: [
      { icon: Megaphone, text: '10 advertenties' },
      { icon: Users, text: 'Max 200 leden' },
      { icon: MessageCircle, text: 'Onbeperkt chat bewaring' },
      { icon: Sparkles, text: 'Legendarische badge' },
      { icon: Zap, text: 'Topplaatsing overal' },
      { icon: Crown, text: 'Alle premium features' },
    ],
  },
  {
    level: 6, name: 'Titan', icon: '🔱', color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30', bgGlow: 'from-cyan-500/5 to-transparent', cost: 2000,
    perks: [
      { icon: Megaphone, text: '15 advertenties' },
      { icon: Users, text: 'Max 500 leden' },
      { icon: MessageCircle, text: 'Onbeperkt chat bewaring' },
      { icon: Sparkles, text: 'Titanium badge' },
      { icon: Zap, text: 'Topplaatsing overal' },
      { icon: Crown, text: 'Custom bedrijfskleur' },
    ],
  },
  {
    level: 7, name: 'Mythisch', icon: '🐉', color: 'text-red-400',
    borderColor: 'border-red-500/30', bgGlow: 'from-red-500/5 to-transparent', cost: 3500,
    perks: [
      { icon: Megaphone, text: '20 advertenties' },
      { icon: Users, text: 'Max 1000 leden' },
      { icon: MessageCircle, text: 'Onbeperkt chat bewaring' },
      { icon: Sparkles, text: 'Mythische badge' },
      { icon: Zap, text: 'Exclusieve homepage banner' },
      { icon: Crown, text: 'Alle premium features' },
    ],
  },
  {
    level: 8, name: 'Onsterfelijk', icon: '⭐', color: 'text-yellow-300',
    borderColor: 'border-yellow-400/30', bgGlow: 'from-yellow-400/5 to-transparent', cost: 5000,
    perks: [
      { icon: Megaphone, text: '30 advertenties' },
      { icon: Users, text: 'Onbeperkt leden' },
      { icon: MessageCircle, text: 'Onbeperkt chat bewaring' },
      { icon: Sparkles, text: 'Onsterfelijke badge' },
      { icon: Zap, text: 'Exclusieve homepage banner' },
      { icon: Crown, text: 'Prioriteit support' },
    ],
  },
  {
    level: 9, name: 'Goddelijk', icon: '🌟', color: 'text-pink-400',
    borderColor: 'border-pink-500/30', bgGlow: 'from-pink-500/5 to-transparent', cost: 7500,
    perks: [
      { icon: Megaphone, text: '50 advertenties' },
      { icon: Users, text: 'Onbeperkt leden' },
      { icon: MessageCircle, text: 'Onbeperkt chat bewaring' },
      { icon: Sparkles, text: 'Goddelijke badge' },
      { icon: Zap, text: 'Custom homepage sectie' },
      { icon: Crown, text: 'Alle features + support' },
    ],
  },
  {
    level: 10, name: 'Oppermacht', icon: '🏆', color: 'text-orange-400',
    borderColor: 'border-orange-500/30', bgGlow: 'from-orange-500/5 to-transparent', cost: 10000,
    perks: [
      { icon: Megaphone, text: 'Onbeperkt advertenties' },
      { icon: Users, text: 'Onbeperkt leden' },
      { icon: MessageCircle, text: 'Onbeperkt chat bewaring' },
      { icon: Sparkles, text: 'Oppermacht badge' },
      { icon: Zap, text: 'Volledige platform controle' },
      { icon: Crown, text: 'Alles onbeperkt' },
    ],
  },
];

export { LEVELS, TAX_RATES };

export function OrgUpgrades({ orgId, orgName, currentLevel, orgBalance, isOwner, onUpgrade }: OrgUpgradesProps) {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);
  const [coinConfirm, setCoinConfirm] = useState<{ open: boolean; amount: number; description: string; onConfirm: () => void }>({
    open: false, amount: 0, description: '', onConfirm: () => {},
  });

  function getCostForLevelChange(from: number, to: number): number {
    if (to <= from) return 0; // downgrade is free
    // Sum costs of all levels between current+1 and target
    let total = 0;
    for (let i = from + 1; i <= to; i++) {
      total += LEVELS[i - 1].cost;
    }
    // Subtract already paid levels (levels below current)
    return total;
  }

  async function handleLevelChange(targetLevel: number) {
    if (!isOwner) {
      toast({ title: 'Alleen de eigenaar kan het level wijzigen', variant: 'destructive' });
      return;
    }

    const isDowngrade = targetLevel < currentLevel;
    const cost = isDowngrade ? 0 : getCostForLevelChange(currentLevel, targetLevel);

    if (!isDowngrade && orgBalance < cost) {
      toast({ title: 'Onvoldoende coins in de bedrijfskluis', description: `Je hebt ${cost} coins nodig, maar er staan ${orgBalance} coins in de kluis.`, variant: 'destructive' });
      return;
    }

    const targetInfo = LEVELS[targetLevel - 1];
    const taxInfo = TAX_RATES[targetLevel];
    const desc = isDowngrade
      ? `Downgrade ${orgName} naar Level ${targetLevel} (${targetInfo.name}). Tax: ${taxInfo}%`
      : `Upgrade ${orgName} naar Level ${targetLevel} (${targetInfo.name}). Tax: ${taxInfo}%`;

    setCoinConfirm({
      open: true,
      amount: cost,
      description: desc,
      onConfirm: async () => {
        setUpgrading(true);
        try {
          if (!isDowngrade && cost > 0) {
            const { data: coinRow } = await supabase.from('org_coins').select('id, balance').eq('organization_id', orgId).eq('name', 'coins').single();
            if (!coinRow || (coinRow as any).balance < cost) {
              toast({ title: 'Onvoldoende coins', variant: 'destructive' });
              setUpgrading(false);
              return;
            }
            const newBalance = (coinRow as any).balance - cost;
            await supabase.from('org_coins').update({ balance: newBalance, updated_at: new Date().toISOString() } as any).eq('id', (coinRow as any).id);
          }

          await supabase.from('organizations').update({ level: targetLevel } as any).eq('id', orgId);

          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            await supabase.from('org_coin_transactions').insert({
              organization_id: orgId,
              coin_name: 'coins',
              amount: cost,
              type: isDowngrade ? 'downgrade' : 'upgrade',
              user_id: authData.user.id,
              note: isDowngrade
                ? `Downgrade naar Level ${targetLevel} (${targetInfo.name})`
                : `Upgrade naar Level ${targetLevel} (${targetInfo.name})`,
            } as any);
          }

          toast({
            title: isDowngrade ? `📉 Gedowngraded naar Level ${targetLevel}` : `🎉 Geüpgraded naar Level ${targetLevel}!`,
            description: `${orgName} is nu ${targetInfo.name} (${taxInfo}% tax)`,
          });
          onUpgrade(targetLevel);
        } catch (err: any) {
          toast({ title: 'Fout bij level wijziging', description: err.message, variant: 'destructive' });
        }
        setUpgrading(false);
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Current level badge + tax info */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{LEVELS[currentLevel - 1].icon}</span>
          <div>
            <p className="text-sm font-bold text-foreground">Level {currentLevel} — {LEVELS[currentLevel - 1].name}</p>
            <p className="text-[11px] text-muted-foreground">Huidige rang van {orgName}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-accent/15 text-accent border border-accent/30">
            <Percent className="h-3 w-3" />
            {TAX_RATES[currentLevel]}% tax
          </span>
          {currentLevel >= 10 && (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              MAX LEVEL
            </span>
          )}
        </div>
      </div>

      {/* Tax explanation */}
      <div className="rounded-xl border border-border/40 p-3 bg-muted/30">
        <div className="flex items-start gap-2">
          <Percent className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Belastingsysteem</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Hoe hoger je level, hoe meer belasting je betaalt op coin-transacties. 
              Level 1 = 0% tax, Level 10 = 35% tax. Je kunt je level ook verlagen om minder belasting te betalen.
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(TAX_RATES).map(([lvl, rate]) => (
                <span
                  key={lvl}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    Number(lvl) === currentLevel
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  L{lvl}: {rate}%
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LEVELS.map((lvl) => {
          const isCurrent = lvl.level === currentLevel;
          const isUnlocked = lvl.level <= currentLevel;
          const isHigher = lvl.level > currentLevel;
          const isLower = lvl.level < currentLevel;
          const upgradeCost = isHigher ? getCostForLevelChange(currentLevel, lvl.level) : 0;
          const canAfford = orgBalance >= upgradeCost;

          return (
            <div
              key={lvl.level}
              className={`relative rounded-xl border p-4 transition-all ${
                isCurrent
                  ? `${lvl.borderColor} ring-1 ring-offset-1 ring-offset-background shadow-lg`
                  : `${lvl.borderColor} hover:shadow-md`
              }`}
              style={{
                background: isCurrent ? `linear-gradient(135deg, hsl(var(--card)), hsl(var(--card)))` : 'hsl(var(--card))',
              }}
            >
              {isCurrent && (
                <div className="absolute -top-2.5 left-3 px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                  HUIDIG
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{lvl.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${isCurrent ? lvl.color : 'text-foreground'}`}>
                    Level {lvl.level}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{lvl.name}</p>
                </div>
                <div className="ml-auto flex flex-col items-end gap-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono">
                    {TAX_RATES[lvl.level]}% tax
                  </span>
                  {isHigher && lvl.cost > 0 && (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                      <Coins className="h-3 w-3" />
                      {upgradeCost}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {lvl.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {isUnlocked ? (
                      <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                    ) : (
                      <perk.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-xs ${isUnlocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {perk.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Upgrade button (any higher level) */}
              {isHigher && isOwner && (
                <button
                  onClick={() => handleLevelChange(lvl.level)}
                  disabled={upgrading || !canAfford}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    canAfford
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {upgrading ? 'Bezig...' : canAfford ? (
                    <>
                      <ArrowUp className="h-3.5 w-3.5" />
                      Upgrade voor {upgradeCost} coins
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      {upgradeCost - orgBalance} coins tekort
                    </>
                  )}
                </button>
              )}

              {/* Downgrade button (any lower level) */}
              {isLower && isOwner && (
                <button
                  onClick={() => handleLevelChange(lvl.level)}
                  disabled={upgrading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Downgrade (gratis, {TAX_RATES[lvl.level]}% tax)
                </button>
              )}
            </div>
          );
        })}
      </div>

      <CoinConfirmDialog
        open={coinConfirm.open}
        onOpenChange={(open) => { if (!open) setCoinConfirm(prev => ({ ...prev, open: false })); }}
        amount={coinConfirm.amount}
        description={coinConfirm.description}
        onConfirm={() => { coinConfirm.onConfirm(); setCoinConfirm(prev => ({ ...prev, open: false })); }}
      />
    </div>
  );
}
