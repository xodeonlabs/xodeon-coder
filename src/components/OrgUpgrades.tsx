import { useState } from 'react';
import { ArrowUp, ArrowDown, Check, Lock, Sparkles, Megaphone, MessageCircle, Users, Crown, Coins, Zap, Percent, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CoinConfirmDialog } from '@/components/CoinConfirmDialog';

interface OrgUpgradesProps {
  orgId: string;
  orgName: string;
  currentLevel: number;
  orgBalance: number;
  isOwner: boolean;
  levelPaidUntil?: string | null;
  onUpgrade: (newLevel: number) => void;
}

// Tax rates per level (percentage taken from all coin transactions)
const TAX_RATES: Record<number, number> = {
  1: 0,
  2: 5,
  3: 10,
  4: 15,
  5: 22,
  6: 30,
  7: 38,
  8: 45,
  9: 55,
  10: 65,
};

// Monthly cost to maintain level
const MONTHLY_COSTS: Record<number, number> = {
  1: 0,
  2: 15,
  3: 40,
  4: 80,
  5: 150,
  6: 300,
  7: 500,
  8: 800,
  9: 1200,
  10: 2000,
};

const LEVELS = [
  {
    level: 1, name: 'Starter', icon: '🏠', color: 'text-muted-foreground',
    borderColor: 'border-border/40', bgGlow: '', cost: 0,
    chatRetention: '12u',
    perks: [
      { icon: Megaphone, text: '1 advertentie' },
      { icon: Users, text: 'Max 10 leden' },
      { icon: MessageCircle, text: '12u chat bewaring' },
    ],
  },
  {
    level: 2, name: 'Groeier', icon: '🌱', color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30', bgGlow: 'from-emerald-500/5 to-transparent', cost: 100,
    chatRetention: '24u',
    perks: [
      { icon: Megaphone, text: '2 advertenties' },
      { icon: Users, text: 'Max 25 leden' },
      { icon: MessageCircle, text: '24u chat bewaring' },
      { icon: Sparkles, text: 'Bedrijfsprofiel badge' },
    ],
  },
  {
    level: 3, name: 'Professional', icon: '⚡', color: 'text-blue-400',
    borderColor: 'border-blue-500/30', bgGlow: 'from-blue-500/5 to-transparent', cost: 250,
    chatRetention: '3 dagen',
    perks: [
      { icon: Megaphone, text: '3 advertenties' },
      { icon: Users, text: 'Max 50 leden' },
      { icon: MessageCircle, text: '3 dagen chat bewaring' },
      { icon: Sparkles, text: 'Bedrijfsprofiel badge' },
      { icon: Zap, text: 'Prioriteit in zoekresultaten' },
    ],
  },
  {
    level: 4, name: 'Enterprise', icon: '💎', color: 'text-purple-400',
    borderColor: 'border-purple-500/30', bgGlow: 'from-purple-500/5 to-transparent', cost: 500,
    chatRetention: '7 dagen',
    perks: [
      { icon: Megaphone, text: '5 advertenties' },
      { icon: Users, text: 'Max 100 leden' },
      { icon: MessageCircle, text: '7 dagen chat bewaring' },
      { icon: Sparkles, text: 'Gouden badge' },
      { icon: Zap, text: 'Prioriteit in zoekresultaten' },
      { icon: Crown, text: 'Exclusieve analytics' },
    ],
  },
  {
    level: 5, name: 'Legende', icon: '👑', color: 'text-amber-400',
    borderColor: 'border-amber-500/30', bgGlow: 'from-amber-500/5 to-transparent', cost: 1000,
    chatRetention: '14 dagen',
    perks: [
      { icon: Megaphone, text: '10 advertenties' },
      { icon: Users, text: 'Max 200 leden' },
      { icon: MessageCircle, text: '14 dagen chat bewaring' },
      { icon: Sparkles, text: 'Legendarische badge' },
      { icon: Zap, text: 'Topplaatsing overal' },
      { icon: Crown, text: 'Alle premium features' },
    ],
  },
  {
    level: 6, name: 'Titan', icon: '🔱', color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30', bgGlow: 'from-cyan-500/5 to-transparent', cost: 2000,
    chatRetention: '21 dagen',
    perks: [
      { icon: Megaphone, text: '15 advertenties' },
      { icon: Users, text: 'Max 500 leden' },
      { icon: MessageCircle, text: '21 dagen chat bewaring' },
      { icon: Sparkles, text: 'Titanium badge' },
      { icon: Zap, text: 'Topplaatsing overal' },
      { icon: Crown, text: 'Custom bedrijfskleur' },
    ],
  },
  {
    level: 7, name: 'Mythisch', icon: '🐉', color: 'text-red-400',
    borderColor: 'border-red-500/30', bgGlow: 'from-red-500/5 to-transparent', cost: 3500,
    chatRetention: '30 dagen',
    perks: [
      { icon: Megaphone, text: '20 advertenties' },
      { icon: Users, text: 'Max 1000 leden' },
      { icon: MessageCircle, text: '30 dagen chat bewaring' },
      { icon: Sparkles, text: 'Mythische badge' },
      { icon: Zap, text: 'Exclusieve homepage banner' },
      { icon: Crown, text: 'Alle premium features' },
    ],
  },
  {
    level: 8, name: 'Onsterfelijk', icon: '⭐', color: 'text-yellow-300',
    borderColor: 'border-yellow-400/30', bgGlow: 'from-yellow-400/5 to-transparent', cost: 5000,
    chatRetention: '60 dagen',
    perks: [
      { icon: Megaphone, text: '30 advertenties' },
      { icon: Users, text: 'Onbeperkt leden' },
      { icon: MessageCircle, text: '60 dagen chat bewaring' },
      { icon: Sparkles, text: 'Onsterfelijke badge' },
      { icon: Zap, text: 'Exclusieve homepage banner' },
      { icon: Crown, text: 'Prioriteit support' },
    ],
  },
  {
    level: 9, name: 'Goddelijk', icon: '🌟', color: 'text-pink-400',
    borderColor: 'border-pink-500/30', bgGlow: 'from-pink-500/5 to-transparent', cost: 7500,
    chatRetention: '90 dagen',
    perks: [
      { icon: Megaphone, text: '50 advertenties' },
      { icon: Users, text: 'Onbeperkt leden' },
      { icon: MessageCircle, text: '90 dagen chat bewaring' },
      { icon: Sparkles, text: 'Goddelijke badge' },
      { icon: Zap, text: 'Custom homepage sectie' },
      { icon: Crown, text: 'Alle features + support' },
    ],
  },
  {
    level: 10, name: 'Oppermacht', icon: '🏆', color: 'text-orange-400',
    borderColor: 'border-orange-500/30', bgGlow: 'from-orange-500/5 to-transparent', cost: 10000,
    chatRetention: '180 dagen',
    perks: [
      { icon: Megaphone, text: 'Onbeperkt advertenties' },
      { icon: Users, text: 'Onbeperkt leden' },
      { icon: MessageCircle, text: '180 dagen chat bewaring' },
      { icon: Sparkles, text: 'Oppermacht badge' },
      { icon: Zap, text: 'Volledige platform controle' },
      { icon: Crown, text: 'Alles onbeperkt' },
    ],
  },
];

export { LEVELS, TAX_RATES, MONTHLY_COSTS };

export function OrgUpgrades({ orgId, orgName, currentLevel, orgBalance, isOwner, levelPaidUntil, onUpgrade }: OrgUpgradesProps) {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);
  const [coinConfirm, setCoinConfirm] = useState<{ open: boolean; amount: number; description: string; onConfirm: () => void }>({
    open: false, amount: 0, description: '', onConfirm: () => {},
  });

  const paidUntil = levelPaidUntil ? new Date(levelPaidUntil) : new Date();
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((paidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isExpired = daysLeft === 0 && currentLevel > 1;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7 && currentLevel > 1;

  function getCostForLevelChange(from: number, to: number): number {
    if (to <= from) return 0;
    let total = 0;
    for (let i = from + 1; i <= to; i++) {
      total += LEVELS[i - 1].cost;
    }
    return total;
  }

  async function handlePayMonthly() {
    if (!isOwner) {
      toast({ title: 'Alleen de eigenaar kan betalen', variant: 'destructive' });
      return;
    }
    const cost = MONTHLY_COSTS[currentLevel];
    if (cost === 0) return;
    if (orgBalance < cost) {
      toast({ title: 'Onvoldoende coins', description: `Je hebt ${cost} coins nodig.`, variant: 'destructive' });
      return;
    }

    setCoinConfirm({
      open: true,
      amount: cost,
      description: `Maandelijkse betaling voor Level ${currentLevel} (${LEVELS[currentLevel - 1].name}) — ${cost} coins/maand`,
      onConfirm: async () => {
        setUpgrading(true);
        try {
          const { data: coinRow } = await supabase.from('org_coins').select('id, balance').eq('organization_id', orgId).eq('name', 'coins').single();
          if (!coinRow || (coinRow as any).balance < cost) {
            toast({ title: 'Onvoldoende coins', variant: 'destructive' });
            setUpgrading(false);
            return;
          }

          const newBalance = (coinRow as any).balance - cost;
          await supabase.from('org_coins').update({ balance: newBalance, updated_at: new Date().toISOString() } as any).eq('id', (coinRow as any).id);

          // Extend paid_until by 30 days from now or from current expiry (whichever is later)
          const baseDate = paidUntil > now ? paidUntil : now;
          const newPaidUntil = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          await supabase.from('organizations').update({ level_paid_until: newPaidUntil.toISOString() } as any).eq('id', orgId);

          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            await supabase.from('org_coin_transactions').insert({
              organization_id: orgId,
              coin_name: 'coins',
              amount: cost,
              type: 'monthly_fee',
              user_id: authData.user.id,
              note: `Maandelijkse betaling Level ${currentLevel} (${LEVELS[currentLevel - 1].name})`,
            } as any);
          }

          toast({ title: '✅ Maand betaald!', description: `Level ${currentLevel} verlengd tot ${newPaidUntil.toLocaleDateString('nl-NL')}` });
          onUpgrade(currentLevel);
        } catch (err: any) {
          toast({ title: 'Fout bij betaling', description: err.message, variant: 'destructive' });
        }
        setUpgrading(false);
      },
    });
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
    const monthlyInfo = MONTHLY_COSTS[targetLevel];
    const desc = isDowngrade
      ? `Downgrade ${orgName} naar Level ${targetLevel} (${targetInfo.name}). Tax: ${taxInfo}%, ${monthlyInfo} coins/maand`
      : `Upgrade ${orgName} naar Level ${targetLevel} (${targetInfo.name}). Tax: ${taxInfo}%, ${monthlyInfo} coins/maand`;

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

          // Set paid_until to 30 days from now for new level
          const newPaidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await supabase.from('organizations').update({ 
            level: targetLevel,
            level_paid_until: targetLevel > 1 ? newPaidUntil.toISOString() : null,
          } as any).eq('id', orgId);

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
            description: `${orgName} is nu ${targetInfo.name} (${taxInfo}% tax, ${monthlyInfo} coins/maand)`,
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
    <div className="space-y-3 sm:space-y-4">
      {/* Current level badge + tax + monthly info */}
      <div className="flex flex-col gap-3 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{LEVELS[currentLevel - 1].icon}</span>
            <div>
              <p className="text-sm font-bold text-foreground">Level {currentLevel} — {LEVELS[currentLevel - 1].name}</p>
              <p className="text-[11px] text-muted-foreground">Huidige rang van {orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:ml-auto flex-wrap">
            <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-accent/15 text-accent border border-accent/30">
              <Percent className="h-3 w-3" />
              {TAX_RATES[currentLevel]}% tax
            </span>
            {MONTHLY_COSTS[currentLevel] > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-primary/15 text-primary border border-primary/30">
                <Coins className="h-3 w-3" />
                {MONTHLY_COSTS[currentLevel]}/mo
              </span>
            )}
            {currentLevel >= 10 && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                MAX
              </span>
            )}
          </div>
        </div>

        {/* Payment status bar */}
        {currentLevel > 1 && (
          <div className={`rounded-xl border p-3 ${
            isExpired ? 'border-destructive/40 bg-destructive/10' : isExpiringSoon ? 'border-amber-500/40 bg-amber-500/10' : 'border-border/40 bg-muted/30'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-start gap-2 min-w-0">
                {isExpired ? (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  {isExpired ? (
                    <p className="text-xs font-semibold text-destructive">Level verlopen! Betaal om te behouden.</p>
                  ) : (
                    <p className="text-xs text-foreground leading-relaxed">
                      <span className="font-semibold">Tot:</span>{' '}
                      {paidUntil.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      <span className="text-muted-foreground ml-1">({daysLeft}d)</span>
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    Zonder betaling verlies je je level.
                  </p>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={handlePayMonthly}
                  disabled={upgrading}
                  className={`shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                    isExpired
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  <Coins className="h-3.5 w-3.5" />
                  Betaal {MONTHLY_COSTS[currentLevel]}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tax & monthly cost explanation */}
      <div className="rounded-xl border border-border/40 p-3 bg-muted/30">
        <div className="flex items-start gap-2">
          <Percent className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0 w-full">
            <p className="text-xs font-semibold text-foreground mb-1">Belasting & kosten</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Hoger level = meer belasting & kosten. Verlaag je level om te besparen.
            </p>
            <div className="grid grid-cols-5 gap-0.5 sm:gap-1 mt-2">
              {LEVELS.map((lvl) => (
                <div
                  key={lvl.level}
                  className={`text-center p-0.5 sm:p-1 rounded ${
                    lvl.level === currentLevel
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  <p className="text-[9px] sm:text-[10px] font-bold">L{lvl.level}</p>
                  <p className="text-[8px] sm:text-[9px] font-mono">{TAX_RATES[lvl.level]}%</p>
                  <p className="text-[8px] sm:text-[9px] font-mono">{MONTHLY_COSTS[lvl.level]}c</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
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
              className={`relative rounded-xl border p-3 sm:p-4 transition-all ${
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
                  {MONTHLY_COSTS[lvl.level] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                      {MONTHLY_COSTS[lvl.level]}c/mo
                    </span>
                  )}
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

              {/* Upgrade button */}
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
                      Upgrade — {upgradeCost} coins
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      {upgradeCost - orgBalance} coins tekort
                    </>
                  )}
                </button>
              )}

              {/* Downgrade button */}
              {isLower && isOwner && (
                <button
                  onClick={() => handleLevelChange(lvl.level)}
                  disabled={upgrading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Downgrade (gratis, {TAX_RATES[lvl.level]}% tax, {MONTHLY_COSTS[lvl.level]}c/mo)
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
