import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Globe, Lock, Copy, Trash2, LogOut, Users, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface App {
  id: string;
  name: string;
  is_public: boolean;
  is_remixable: boolean;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

const DEFAULT_NGC_CODE = `App:
    Var(gebruiker)=""
    Var(wachtwoord)=""
    Var(ingelogd)=0
    Page Login:
        Frame LoginBox:
            Positie="100,80"
            Grootte="300,280"
            Kleur="#1e293b"
            Text Titel:
                Tekst="Inloggen"
                Positie="20,15"
                Grootte="260,30"
                Kleur="#ffffff"
            TextBox UserInput:
                Positie="20,60"
                Grootte="260,35"
                Placeholder="Gebruikersnaam..."
                Variabele="gebruiker"
            TextBox PassInput:
                Positie="20,110"
                Grootte="260,35"
                Placeholder="Wachtwoord..."
                Variabele="wachtwoord"
            Button LoginBtn:
                Tekst="Inloggen"
                Positie="20,165"
                Grootte="260,40"
                Kleur="#3b82f6"
                Hoekradius="8"
                Click:
                    Var(ingelogd)=1
            Text Info:
                Tekst="Nog geen account?"
                Positie="20,220"
                Grootte="260,20"
                Kleur="#94a3b8"
`;

export default function Dashboard() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteAppId, setInviteAppId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { fetchApps(); }, []);

  async function fetchApps() {
    const { data, error } = await supabase.from('apps').select('*').order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Fout bij laden', description: error.message, variant: 'destructive' });
    } else {
      setApps(data || []);
    }
    setLoading(false);
  }

  async function createApp() {
    if (!session?.user?.id) return;
    setCreating(true);
    const { data, error } = await supabase.from('apps').insert({ owner_id: session.user.id, name: 'Nieuwe App', ngc_code: DEFAULT_NGC_CODE }).select().single();
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else if (data) {
      navigate(`/editor/${data.id}`);
    }
    setCreating(false);
  }

  async function deleteApp(id: string, name: string) {
    if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen?`)) return;
    const { error } = await supabase.from('apps').delete().eq('id', id);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      setApps(apps.filter(a => a.id !== id));
      toast({ title: 'Verwijderd', description: `"${name}" is verwijderd.` });
    }
  }

  async function togglePublic(app: App) {
    const { error } = await supabase.from('apps').update({ is_public: !app.is_public }).eq('id', app.id);
    if (!error) setApps(apps.map(a => a.id === app.id ? { ...a, is_public: !a.is_public } : a));
  }

  async function toggleRemixable(app: App) {
    const { error } = await supabase.from('apps').update({ is_remixable: !app.is_remixable }).eq('id', app.id);
    if (!error) setApps(apps.map(a => a.id === app.id ? { ...a, is_remixable: !a.is_remixable } : a));
  }

  async function inviteCollaborator() {
    if (!inviteAppId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-collaborator', {
        body: { email: inviteEmail.trim(), app_id: inviteAppId },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Fout', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Uitgenodigd!', description: `${inviteEmail} is toegevoegd als samenwerker.` });
        setInviteEmail('');
        setInviteAppId(null);
      }
    } catch (e: any) {
      toast({ title: 'Fout', description: e.message || 'Onbekende fout', variant: 'destructive' });
    }
    setInviting(false);
  }

  const myApps = apps.filter(a => a.owner_id === session?.user?.id);
  const sharedApps = apps.filter(a => a.owner_id !== session?.user?.id);

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between" style={{ background: 'hsl(var(--ide-toolbar))' }}>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">NGC Studio</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors" title="Uitloggen">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Create button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Mijn Apps</h2>
            <p className="text-sm text-muted-foreground mt-1">Maak en beheer je NGC applicaties</p>
          </div>
          <button onClick={createApp} disabled={creating} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Plus className="h-4 w-4" />
            Nieuwe App
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-muted-foreground">Laden...</span>
          </div>
        ) : myApps.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-muted-foreground mb-4">Je hebt nog geen apps. Maak je eerste app!</p>
            <button onClick={createApp} disabled={creating} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Nieuwe App
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myApps.map(app => (
              <div key={app.id} className="group rounded-xl border border-border p-4 transition-all hover:border-primary/40 cursor-pointer" style={{ background: 'hsl(var(--card))' }} onClick={() => navigate(`/editor/${app.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-foreground truncate pr-2">{app.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <span title={app.is_public ? 'Publiek' : 'Privé'}>
                      {app.is_public ? <Globe className="h-3.5 w-3.5 text-primary" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </span>
                    {app.is_remixable && <span title="Remixbaar"><Copy className="h-3.5 w-3.5 text-accent" /></span>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Laatst bewerkt: {new Date(app.updated_at).toLocaleDateString('nl-NL')}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => togglePublic(app)} className="rounded p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title={app.is_public ? 'Maak privé' : 'Maak publiek'}>
                    {app.is_public ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => toggleRemixable(app)} className="rounded p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title={app.is_remixable ? 'Remix uit' : 'Remix aan'}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setInviteAppId(app.id); setInviteEmail(''); }} className="rounded p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Samenwerker uitnodigen">
                    <UserPlus className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteApp(app.id, app.name)} className="rounded p-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto" title="Verwijderen">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shared apps */}
        {sharedApps.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gedeeld met mij
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedApps.map(app => (
                <div key={app.id} className="rounded-xl border border-border p-4 transition-all hover:border-accent/40 cursor-pointer" style={{ background: 'hsl(var(--card))' }} onClick={() => navigate(`/editor/${app.id}`)}>
                  <h3 className="font-semibold text-foreground truncate mb-1">{app.name}</h3>
                  <p className="text-xs text-muted-foreground">Laatst bewerkt: {new Date(app.updated_at).toLocaleDateString('nl-NL')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      {inviteAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setInviteAppId(null)}>
          <div className="rounded-xl border border-border p-6 w-full max-w-md shadow-xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Samenwerker uitnodigen
              </h3>
              <button onClick={() => setInviteAppId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Voer het e-mailadres in van de gebruiker die je wilt uitnodigen.</p>
            <input
              type="email"
              placeholder="email@voorbeeld.nl"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && inviteCollaborator()}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setInviteAppId(null)} className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                Annuleren
              </button>
              <button onClick={inviteCollaborator} disabled={inviting || !inviteEmail.trim()} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {inviting ? 'Uitnodigen...' : 'Uitnodigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
