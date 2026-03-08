import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CoinConfirmDialog } from '@/components/CoinConfirmDialog';
import { Clock } from 'lucide-react';

const RETENTION_OPTIONS = [
  { value: 1, label: '1 uur', cost: 0 },
  { value: 6, label: '6 uur', cost: 0 },
  { value: 12, label: '12u (gratis)', cost: 0 },
  { value: 24, label: '24u (5🪙)', cost: 5 },
  { value: 48, label: '2d (15🪙)', cost: 15 },
  { value: 168, label: '1w (65🪙)', cost: 65 },
  { value: 720, label: '30d (295🪙)', cost: 295 },
];

function getCostForUpgrade(currentHours: number, targetHours: number): number {
  if (targetHours <= 12) return 0;
  const currentBlocks = Math.max(0, Math.ceil((Math.max(currentHours, 12) - 12) / 12));
  const targetBlocks = Math.ceil((targetHours - 12) / 12);
  const extraBlocks = targetBlocks - currentBlocks;
  if (extraBlocks <= 0) return 0;
  return extraBlocks * 5;
}

interface ChatRetentionSelectorProps {
  currentHours: number;
  onUpdate: (hours: number) => Promise<void>;
  label?: string;
}

export function ChatRetentionSelector({ currentHours, onUpdate, label }: ChatRetentionSelectorProps) {
  const { toast } = useToast();
  const [coinConfirm, setCoinConfirm] = useState<{ open: boolean; amount: number; description: string; onConfirm: () => void }>({ open: false, amount: 0, description: '', onConfirm: () => {} });

  async function handleChange(hours: number) {
    if (hours <= currentHours || hours <= 12) {
      await onUpdate(hours);
      if (hours <= 12) toast({ title: 'Bewaartermijn bijgewerkt' });
      return;
    }

    const cost = getCostForUpgrade(currentHours, hours);
    if (cost <= 0) {
      await onUpdate(hours);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;
    const { data: coinRow } = await supabase.from('user_coins').select('id, balance').eq('user_id', authData.user.id).maybeSingle();
    const balance = (coinRow as any)?.balance ?? 0;

    if (balance < cost) {
      toast({ title: 'Niet genoeg coins', description: `Je hebt ${cost} coins nodig maar je hebt er ${balance}.`, variant: 'destructive' });
      return;
    }

    setCoinConfirm({
      open: true,
      amount: cost,
      description: `Bewaartijd verlengen naar ${hours >= 24 ? Math.round(hours / 24) + ' dag(en)' : hours + ' uur'}`,
      onConfirm: async () => {
        await supabase.from('user_coins').update({ balance: balance - cost, updated_at: new Date().toISOString() } as any).eq('id', (coinRow as any).id);
        toast({ title: `${cost} coins afgeschreven` });
        await onUpdate(hours);
      },
    });
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {label && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{label}</span>}
        <select
          value={currentHours}
          onChange={e => handleChange(parseInt(e.target.value))}
          className="text-[11px] rounded-lg border border-border/40 bg-background/80 px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 max-w-[110px]"
        >
          {RETENTION_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <CoinConfirmDialog
        open={coinConfirm.open}
        onOpenChange={open => setCoinConfirm(prev => ({ ...prev, open }))}
        amount={coinConfirm.amount}
        description={coinConfirm.description}
        onConfirm={coinConfirm.onConfirm}
      />
    </>
  );
}
