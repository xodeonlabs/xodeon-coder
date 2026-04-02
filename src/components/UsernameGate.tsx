import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';

interface UsernameGateProps {
  userId: string;
  children: React.ReactNode;
}

export function UsernameGate({ userId, children }: UsernameGateProps) {
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      setHasUsername(!!data?.username);
    }
    check();
  }, [userId]);

  if (hasUsername === null) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (hasUsername) return <>{children}</>;

  const handleSave = async () => {
    setError('');
    const clean = username.trim().toLowerCase();
    if (!clean || clean.length < 3) {
      setError('Gebruikersnaam moet minimaal 3 tekens zijn.');
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(clean)) {
      setError('Alleen kleine letters, cijfers, - en _ toegestaan.');
      return;
    }

    setSaving(true);
    // Check availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', clean)
      .maybeSingle();

    if (existing) {
      setError('Deze gebruikersnaam is al in gebruik.');
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: clean } as any)
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message || 'Opslaan mislukt.');
      setSaving(false);
      return;
    }

    setHasUsername(true);
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, hsl(230 28% 7%) 0%, hsl(250 35% 12%) 40%, hsl(270 40% 14%) 60%, hsl(230 28% 7%) 100%)' }}>
      <div className="w-full max-w-[400px] animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <User className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Kies een gebruikersnaam</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Vanaf nu log je in met je gebruikersnaam. Kies er een om verder te gaan.
          </p>
        </div>

        <div className="glass-card-highlight rounded-2xl p-6 shadow-2xl shadow-black/20">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Gebruikersnaam</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-foreground bg-background/80 border border-border/60 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
                  placeholder="jouw_username"
                  maxLength={30}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Min. 3 tekens · alleen kleine letters, cijfers, - en _</p>
            </div>

            {error && (
              <div className="p-3 rounded-xl text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20">
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || username.length < 3}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              {saving ? 'Opslaan...' : 'Gebruikersnaam opslaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
