import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Shield, ExternalLink } from 'lucide-react';

const SCOPE_LABELS: Record<string, string> = {
  profile: 'Je profiel (naam, avatar, bio)',
  friends: 'Je vriendenlijst',
  messages: 'Je privéberichten met vrienden',
  apps: 'Je apps en NGC/Xodeon code',
};

export default function OAuthAuthorize() {
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const requestedScopes = (params.get('scopes') ?? 'profile').split(',').map((s) => s.trim()).filter(Boolean);
  const state = params.get('state') ?? '';
  const [app, setApp] = useState<{ name: string; domain: string; description: string } | null>(null);
  const [selected, setSelected] = useState<string[]>(requestedScopes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) { setError('Ontbrekende client_id'); return; }
    supabase.from('external_apps' as any).select('name, domain, description, is_active, redirect_uris').eq('id', clientId).maybeSingle()
      .then(({ data }) => {
        const a = data as any;
        if (!a) { setError('App niet gevonden'); return; }
        if (!a.is_active) { setError('App is niet actief'); return; }
        if (!redirectUri || !a.redirect_uris.includes(redirectUri)) { setError('Ongeldige redirect URI'); return; }
        setApp(a);
      });
  }, [clientId, redirectUri]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Laden...</div>;
  if (!session) {
    const back = encodeURIComponent(window.location.pathname + window.location.search);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 max-w-md w-full text-center space-y-4">
          <h2 className="text-lg font-semibold">Log in om door te gaan</h2>
          <p className="text-sm text-muted-foreground">Een externe app wil verbinden met je Xodeon-account.</p>
          <Button onClick={() => navigate(`/auth?redirect=${back}`)}>Inloggen</Button>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center p-6"><Card className="p-6 max-w-md w-full text-center"><p className="text-destructive font-medium">{error}</p></Card></div>;
  }
  if (!app) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Laden...</div>;

  const toggle = (s: string) => setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const approve = async () => {
    setSubmitting(true);
    const { data, error: e } = await supabase.functions.invoke('xodeon-oauth-issue-code', {
      body: { external_app_id: clientId, redirect_uri: redirectUri, scopes: selected },
    });
    setSubmitting(false);
    if (e || (data as any)?.error) {
      toast.error('Autorisatie mislukt');
      return;
    }
    const url = new URL(redirectUri!);
    url.searchParams.set('code', (data as any).code);
    if (state) url.searchParams.set('state', state);
    window.location.href = url.toString();
  };

  const deny = () => {
    const url = new URL(redirectUri!);
    url.searchParams.set('error', 'access_denied');
    if (state) url.searchParams.set('state', state);
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-6 max-w-lg w-full space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="h-5 w-5 text-primary" /></div>
          <div>
            <h2 className="text-lg font-semibold">{app.name} wil verbinden</h2>
            {app.domain && <p className="text-xs text-muted-foreground flex items-center gap-1"><ExternalLink className="h-3 w-3" /> {app.domain}</p>}
          </div>
        </div>
        {app.description && <p className="text-sm text-muted-foreground">{app.description}</p>}
        <div className="space-y-2">
          <p className="text-sm font-medium">Deze app vraagt toegang tot:</p>
          {requestedScopes.map((s) => (
            <label key={s} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:bg-secondary/30 cursor-pointer">
              <Checkbox checked={selected.includes(s)} onCheckedChange={() => toggle(s)} />
              <div className="flex-1">
                <p className="text-sm font-medium">{SCOPE_LABELS[s] ?? s}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={deny}>Weiger</Button>
          <Button className="flex-1" onClick={approve} disabled={submitting || selected.length === 0}>{submitting ? 'Bezig...' : 'Toestaan'}</Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">Je kunt deze toegang later intrekken via Instellingen → Verbonden apps.</p>
      </Card>
    </div>
  );
}
