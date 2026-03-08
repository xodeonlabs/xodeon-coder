import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Globe, Lock, Copy, Trash2, LogOut, Users, UserPlus, X, Pencil, Building2, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface App {
  id: string;
  name: string;
  is_public: boolean;
  is_remixable: boolean;
  created_at: string;
  updated_at: string;
  owner_id: string;
  organization_id: string | null;
}

interface Org {
  id: string;
  name: string;
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
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [orgs, setOrgs] = useState<Org[]>([]);

  useEffect(() => { fetchApps(); fetchOrgs(); }, []);

  async function fetchOrgs() {
    const { data } = await supabase.from('organizations').select('id, name').order('name');
    if (data) setOrgs(data as unknown as Org[]);
  }

  async function linkAppToOrg(appId: string, orgId: string | null) {
    const { error } = await supabase.from('apps').update({ organization_id: orgId } as any).eq('id', appId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      setApps(apps.map(a => a.id === appId ? { ...a, organization_id: orgId } : a));
      toast({ title: orgId ? 'Gekoppeld aan bedrijf' : 'Ontkoppeld van bedrijf' });
    }
  }

  // Auto-save guest code as a new app after login/signup
  useEffect(() => {
    const guestCode = localStorage.getItem('ngc_guest_code');
    if (!guestCode || !session?.user?.id) return;
    localStorage.removeItem('ngc_guest_code');

    (async () => {
      const { data, error } = await supabase
        .from('apps')
        .insert({ owner_id: session.user.id, name: 'Gast Project', ngc_code: guestCode })
        .select()
        .single();
      if (!error && data) {
        toast({ title: 'Gastcode opgeslagen!', description: 'Je gastproject is bewaard als "Gast Project".' });
        navigate(`/editor/${data.id}`);
      } else {
        toast({ title: 'Opslaan mislukt', description: error?.message || 'Onbekende fout', variant: 'destructive' });
        fetchApps();
      }
    })();
  }, [session?.user?.id]);

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

  async function renameApp(id: string, newName: string) {
    if (!newName.trim()) return;
    const { error } = await supabase.from('apps').update({ name: newName.trim() }).eq('id', id);
    if (!error) {
      setApps(apps.map(a => a.id === id ? { ...a, name: newName.trim() } : a));
    }
    setEditingNameId(null);
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
        toast({ title: 'Verstuurd', description: data?.message || 'Uitnodiging is verwerkt.' });
        setInviteEmail('');
        setInviteAppId(null);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Onbekende fout';
      toast({ title: 'Fout', description: errorMessage, variant: 'destructive' });
    }
    setInviting(false);
  }

  const myApps = apps.filter(a => a.owner_id === session?.user?.id);
  const sharedApps = apps.filter(a => a.owner_id !== session?.user?.id);

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between backdrop-blur-sm" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm">N</div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">NGC Studio</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/organization')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <Building2 className="h-4 w-4" /> Bedrijven
          </button>
          <span className="text-sm text-muted-foreground">{session?.user?.email}</span>
          <button onClick={signOut} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all" title="Uitloggen">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Create button */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Mijn Apps</h2>
            <p className="text-base text-muted-foreground mt-2">Maak en beheer je NGC applicaties</p>
          </div>
          <button onClick={createApp} disabled={creating} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 active:scale-95">
            <Plus className="h-5 w-5" />
            Nieuwe App
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
          </div>
        ) : myApps.length === 0 ? (
          <div className="rounded-xl border border-border/40 p-16 text-center" style={{ background: 'hsl(var(--card))' }}>
            <div className="mb-4 text-4xl"></div>
            <p className="text-lg text-muted-foreground mb-6">Je hebt nog geen apps. Maak je eerste app!</p>
            <button onClick={createApp} disabled={creating} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
              <Plus className="h-5 w-5" />
              Nieuwe App
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myApps.map(app => (
              <div key={app.id} className="group rounded-xl border border-border/40 p-5 transition-all hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 cursor-pointer hover:-translate-y-1" style={{ background: 'hsl(var(--card))' }} onClick={() => navigate(`/editor/${app.id}`)}>
                <div className="flex items-start justify-between mb-4">
                  {editingNameId === app.id ? (
                    <input
                      autoFocus
                      className="font-semibold text-foreground bg-background border border-primary/30 rounded-lg px-2 py-1 text-sm w-full mr-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={editingNameValue}
                      onChange={e => setEditingNameValue(e.target.value)}
                      onBlur={() => renameApp(app.id, editingNameValue)}
                      onKeyDown={e => { if (e.key === 'Enter') renameApp(app.id, editingNameValue); if (e.key === 'Escape') setEditingNameId(null); }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <h3 className="font-semibold text-base text-foreground truncate pr-2">{app.name}</h3>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <span title={app.is_public ? 'Publiek' : 'Privé'}>
                      {app.is_public ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </span>
                    {app.is_remixable && <span title="Remixbaar"><Copy className="h-4 w-4 text-accent" /></span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm text-muted-foreground">Gewijzigd: {new Date(app.updated_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  {app.organization_id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {orgs.find(o => o.id === app.organization_id)?.name || 'Bedrijf'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  {orgs.length > 0 && (
                    <select
                      value={app.organization_id || ''}
                      onChange={e => linkAppToOrg(app.id, e.target.value || null)}
                      className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 max-w-[120px]"
                      title="Koppel aan bedrijf"
                    >
                      <option value="">Geen bedrijf</option>
                      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )}
                  <button onClick={() => { setEditingNameId(app.id); setEditingNameValue(app.name); }} className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Naam wijzigen">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => togglePublic(app)} className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title={app.is_public ? 'Maak privé' : 'Maak publiek'}>
                    {app.is_public ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                  </button>
                  <button onClick={() => toggleRemixable(app)} className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title={app.is_remixable ? 'Remix uit' : 'Remix aan'}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setInviteAppId(app.id); setInviteEmail(''); }} className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Samenwerker uitnodigen">
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteApp(app.id, app.name)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto" title="Verwijderen">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shared apps */}
        {/* Shared apps */}
        {sharedApps.length > 0 && (
          <div className="mt-14 pt-12 border-t border-border/40">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Users className="h-5 w-5 text-accent" /></div>
              Gedeeld met mij
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedApps.map(app => (
                <div key={app.id} className="rounded-xl border border-border/40 p-5 transition-all hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10 cursor-pointer hover:-translate-y-1" style={{ background: 'hsl(var(--card))' }} onClick={() => navigate(`/editor/${app.id}`)}>
                  <h3 className="font-semibold text-base text-foreground truncate mb-2">{app.name}</h3>
                  <p className="text-sm text-muted-foreground">Gewijzigd: {new Date(app.updated_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      {inviteAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setInviteAppId(null)}>
          <div className="rounded-2xl border border-border/50 p-8 w-full max-w-md shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><UserPlus className="h-5 w-5 text-primary" /></div>
                Samenwerker uitnodigen
              </h3>
              <button onClick={() => setInviteAppId(null)} className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg p-1.5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-base text-muted-foreground mb-6">Voer het e-mailadres in van de gebruiker die je wilt uitnodigen.</p>
            <input
              type="email"
              placeholder="email@voorbeeld.nl"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && inviteCollaborator()}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setInviteAppId(null)} className="px-5 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
              <button onClick={inviteCollaborator} disabled={inviting || !inviteEmail.trim()} className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                {inviting ? 'Uitnodigen...' : 'Uitnodigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
