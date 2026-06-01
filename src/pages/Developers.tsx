import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Copy, Trash2, Plus, Code2, KeyRound } from 'lucide-react';

interface ExternalApp {
  id: string;
  name: string;
  domain: string;
  description: string;
  api_key_prefix: string;
  redirect_uris: string[];
  is_active: boolean;
  created_at: string;
}

export default function Developers() {
  const { session } = useAuth();
  const [apps, setApps] = useState<ExternalApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newApp, setNewApp] = useState({ name: '', domain: '', description: '', redirect_uris: '' });
  const [revealedKey, setRevealedKey] = useState<{ id: string; key: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('external_apps' as any).select('*').order('created_at', { ascending: false });
    setApps((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (session) load(); }, [session]);

  const create = async () => {
    if (!newApp.name || !newApp.redirect_uris) {
      toast.error('Naam en minstens één redirect URI verplicht');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('xodeon-app-create', {
      body: {
        name: newApp.name,
        domain: newApp.domain,
        description: newApp.description,
        redirect_uris: newApp.redirect_uris.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast.error('Aanmaken mislukt');
      return;
    }
    setRevealedKey({ id: (data as any).app.id, key: (data as any).api_key });
    setShowNew(false);
    setNewApp({ name: '', domain: '', description: '', redirect_uris: '' });
    await load();
  };

  const del = async (id: string) => {
    if (!confirm('App verwijderen? Alle tokens worden ongeldig.')) return;
    await supabase.from('external_apps' as any).delete().eq('id', id);
    toast.success('Verwijderd');
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd');
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Code2 className="h-6 w-6" /> Xodeon Developers</h1>
          <p className="text-sm text-muted-foreground mt-1">Bouw apps die inloggen met Xodeon en profielen, vrienden, berichten en projecten lezen.</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> Nieuwe app</Button>
      </div>

      {revealedKey && (
        <Card className="p-4 border-primary/40 bg-primary/5">
          <p className="text-sm font-semibold mb-2">⚠️ Bewaar deze API-sleutel nu — hij wordt nooit opnieuw getoond</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded bg-background text-xs font-mono break-all">{revealedKey.key}</code>
            <Button size="sm" variant="outline" onClick={() => copy(revealedKey.key)}><Copy className="h-3 w-3" /></Button>
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setRevealedKey(null)}>Sluit</Button>
        </Card>
      )}

      {showNew && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Nieuwe app registreren</h3>
          <Input placeholder="Naam (vereist)" value={newApp.name} onChange={(e) => setNewApp({ ...newApp, name: e.target.value })} />
          <Input placeholder="Domein (bv. mijnapp.lovable.app)" value={newApp.domain} onChange={(e) => setNewApp({ ...newApp, domain: e.target.value })} />
          <Textarea placeholder="Korte beschrijving" value={newApp.description} onChange={(e) => setNewApp({ ...newApp, description: e.target.value })} rows={2} />
          <Textarea placeholder={'Redirect URIs (één per regel)\nhttps://mijnapp.lovable.app/oauth/callback'} value={newApp.redirect_uris} onChange={(e) => setNewApp({ ...newApp, redirect_uris: e.target.value })} rows={3} />
          <div className="flex gap-2">
            <Button onClick={create} disabled={creating}>{creating ? 'Bezig...' : 'Aanmaken'}</Button>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Annuleren</Button>
          </div>
        </Card>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Laden...</p> : apps.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nog geen apps. Klik op "Nieuwe app" om te beginnen.</Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Card key={app.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{app.name}</h3>
                  <p className="text-xs text-muted-foreground">{app.domain || '—'}</p>
                  {app.description && <p className="text-sm mt-1">{app.description}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => del(app.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <KeyRound className="h-3 w-3 text-muted-foreground" />
                <code className="font-mono">{app.api_key_prefix}…</code>
                <span className="text-muted-foreground">• {app.redirect_uris.length} redirect URI's</span>
                <span className={`ml-auto px-2 py-0.5 rounded text-[10px] ${app.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>{app.is_active ? 'Actief' : 'Inactief'}</span>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Integratiegids</summary>
                <div className="mt-2 space-y-2 p-3 rounded bg-muted/30">
                  <p><strong>1. Login URL</strong> (stuur gebruiker hierheen):</p>
                  <code className="block p-2 bg-background rounded break-all">{window.location.origin}/oauth/authorize?client_id={app.id}&redirect_uri={encodeURIComponent(app.redirect_uris[0] || '')}&scopes=profile,friends,messages,apps&state=XYZ</code>
                  <p><strong>2. Wissel code voor token</strong>:</p>
                  <code className="block p-2 bg-background rounded break-all">POST {supabaseUrl}/functions/v1/xodeon-oauth-token{'\n'}{`{ "api_key": "<jouw key>", "code": "<code uit redirect>", "redirect_uri": "..." }`}</code>
                  <p><strong>3. API data ophalen</strong>:</p>
                  <code className="block p-2 bg-background rounded break-all">GET {supabaseUrl}/functions/v1/xodeon-api?path=me{'\n'}Headers: x-api-key: &lt;jouw key&gt;, Authorization: Bearer &lt;access_token&gt;{'\n'}Endpoints: /me, /friends, /messages, /apps</code>
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
