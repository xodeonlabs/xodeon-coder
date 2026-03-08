import { useState } from 'react';
import { ArrowUp, Check, Lock, Sparkles, Megaphone, MessageCircle, Users, Crown, Coins, Zap } from 'lucide-react';
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

const LEVELS = [
  {
    level: 1,
    name: 'Starter',
    icon: '🏠',
    color: 'text-muted-foreground',
    borderColor: 'border-border/40',
    bgGlow: '',
    cost: 0,
    perks: [
      { icon: Megaphone, text: '1 advertentie' },
      { icon: Users, text: 'Max 10 leden' },
      { icon: MessageCircle, text: '48u chat bewaring' },
    ],
  },
  {
    level: 2,
    name: 'Groeier',
    icon: '🌱',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgGlow: 'from-emerald-500/5 to-transparent',
    cost: 100,
    perks: [
      { icon: Megaphone, text: '2 advertenties' },
      { icon: Users, text: 'Max 25 leden' },
      { icon: MessageCircle, text: '7 dagen chat bewaring' },
      { icon: Sparkles, text: 'Bedrijfsprofiel badge' },
    ],
  },
  {
    level: 3,
    name: 'Professional',
    icon: '⚡',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgGlow: 'from-blue-500/5 to-transparent',
    cost: 250,
    perks: [
      { icon: Megaphone, text: '3 advertenties' },
      { icon: Users, text: 'Max 50 leden' },
      { icon: MessageCircle, text: '30 dagen chat bewaring' },
      { icon: Sparkles, text: 'Bedrijfsprofiel badge' },
      { icon: Zap, text: 'Prioriteit in zoekresultaten' },
    ],
  },
  {
    level: 4,
    name: 'Enterprise',
    icon: '💎',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgGlow: 'from-purple-500/5 to-transparent',
    cost: 500,
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
    level: 5,
    name: 'Legende',
    icon: '👑',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgGlow: 'from-amber-500/5 to-transparent',
    cost: 1000,
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
    level: 6,
    name: 'Titan',
    icon: '🔱',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgGlow: 'from-cyan-500/5 to-transparent',
    cost: 2000,
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
    level: 7,
    name: 'Mythisch',
    icon: '🐉',
    color: 'text-red-400',
    borderColor: 'border-red-500/30',
    bgGlow: 'from-red-500/5 to-transparent',
    cost: 3500,
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
    level: 8,
    name: 'Onsterfelijk',
    icon: '⭐',
    color: 'text-yellow-300',
    borderColor: 'border-yellow-400/30',
    bgGlow: 'from-yellow-400/5 to-transparent',
    cost: 5000,
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
    level: 9,
    name: 'Goddelijk',
    icon: '🌟',
    color: 'text-pink-400',
    borderColor: 'border-pink-500/30',
    bgGlow: 'from-pink-500/5 to-transparent',
    cost: 7500,
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
    level: 10,
    name: 'Oppermacht',
    icon: '🏆',
    color: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    bgGlow: 'from-orange-500/5 to-transparent',
    cost: 10000,
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

export function OrgUpgrades({ orgId, orgName, currentLevel, orgBalance, isOwner, onUpgrade }: OrgUpgradesProps) {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);
  const [coinConfirm, setCoinConfirm] = useState<{ open: boolean; amount: number; description: string; onConfirm: () => void }>({
    open: false, amount: 0, description: '', onConfirm: () => {},
  });

  async function handleUpgrade(targetLevel: number, cost: number) {
    if (!isOwner) {
      toast({ title: 'Alleen de eigenaar kan upgraden', variant: 'destructive' });
      return;
    }
    if (orgBalance < cost) {
      toast({ title: 'Onvoldoende coins in de bedrijfskluis', description: `Je hebt ${cost} coins nodig, maar er staan ${orgBalance} coins in de kluis.`, variant: 'destructive' });
      return;
    }

    setCoinConfirm({
      open: true,
      amount: cost,
      description: `Upgrade ${orgName} naar Level ${targetLevel} (${LEVELS[targetLevel - 1].name})`,
      onConfirm: async () => {
        setUpgrading(true);
        try {
          // Deduct coins from org treasury
          const { data: coinRow } = await supabase.from('org_coins').select('id, balance').eq('organization_id', orgId).eq('name', 'coins').single();
          if (!coinRow || (coinRow as any).balance < cost) {
            toast({ title: 'Onvoldoende coins', variant: 'destructive' });
            setUpgrading(false);
            return;
          }

          const newBalance = (coinRow as any).balance - cost;
          await supabase.from('org_coins').update({ balance: newBalance, updated_at: new Date().toISOString() } as any).eq('id', (coinRow as any).id);

          // Update org level
          await supabase.from('organizations').update({ level: targetLevel } as any).eq('id', orgId);

          // Log transaction
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            await supabase.from('org_coin_transactions').insert({
              organization_id: orgId,
              coin_name: 'coins',
              amount: cost,
              type: 'upgrade',
              user_id: authData.user.id,
              note: `Upgrade naar Level ${targetLevel} (${LEVELS[targetLevel - 1].name})`,
            } as any);
          }

          toast({ title: `🎉 Geüpgraded naar Level ${targetLevel}!`, description: `${orgName} is nu ${LEVELS[targetLevel - 1].name}` });
          onUpgrade(targetLevel);
        } catch (err: any) {
          toast({ title: 'Fout bij upgraden', description: err.message, variant: 'destructive' });
        }
        setUpgrading(false);
      },
    });
  }

  const nextLevel = currentLevel < 10 ? currentLevel + 1 : null;

  return (
    <div className="space-y-4">
      {/* Current level badge */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{LEVELS[currentLevel - 1].icon}</span>
          <div>
            <p className="text-sm font-bold text-foreground">Level {currentLevel} — {LEVELS[currentLevel - 1].name}</p>
            <p className="text-[11px] text-muted-foreground">Huidige rang van {orgName}</p>
          </div>
        </div>
        {currentLevel >= 5 && (
          <span className="ml-auto px-3 py-1 text-xs font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            MAX LEVEL
          </span>
        )}
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LEVELS.map((lvl) => {
          const isCurrent = lvl.level === currentLevel;
          const isUnlocked = lvl.level <= currentLevel;
          const isNext = lvl.level === nextLevel;
          const canAfford = orgBalance >= lvl.cost;

          return (
            <div
              key={lvl.level}
              className={`relative rounded-xl border p-4 transition-all ${
                isCurrent
                  ? `${lvl.borderColor} ring-1 ring-offset-1 ring-offset-background shadow-lg`
                  : isUnlocked
                  ? 'border-border/30 opacity-60'
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
              {isNext && !isCurrent && (
                <div className={`absolute -top-2.5 left-3 px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent text-accent-foreground`}>
                  VOLGENDE
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{lvl.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${isCurrent ? lvl.color : isUnlocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                    Level {lvl.level}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{lvl.name}</p>
                </div>
                {lvl.cost > 0 && !isUnlocked && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                    <Coins className="h-3 w-3" />
                    {lvl.cost}
                  </span>
                )}
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

              {isNext && isOwner && (
                <button
                  onClick={() => handleUpgrade(lvl.level, lvl.cost)}
                  disabled={upgrading || !canAfford}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    canAfford
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {upgrading ? (
                    'Upgraden...'
                  ) : canAfford ? (
                    <>
                      <ArrowUp className="h-3.5 w-3.5" />
                      Upgraden voor {lvl.cost} coins
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      {lvl.cost - orgBalance} coins tekort
                    </>
                  )}
                </button>
              )}

              {!isNext && !isUnlocked && (
                <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Eerst Level {lvl.level - 1} vereist
                </div>
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
