import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Globe, Lock, Copy, Trash2, LogOut, Users, UserPlus, X, Pencil, Building2, FileCode, Link, ExternalLink, BarChart3, Coins, Clock, Settings, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { AdBanner } from '@/components/AdBanner';

interface App {
  id: string;
  name: string;
  is_public: boolean;
  is_remixable: boolean;
  created_at: string;
  updated_at: string;
  owner_id: string;
  organization_id: string | null;
  slug: string | null;
  chat_retention_hours: number;
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
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [publishAppId, setPublishAppId] = useState<string | null>(null);
  const [slugValue, setSlugValue] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [unreadOrgMessages, setUnreadOrgMessages] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ngc_runtime_state');
      if (raw) {
        const state = JSON.parse(raw);
        if (state?.coins) {
          const sum = Object.values(state.coins as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
          setTotalCoins(sum);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchApps(); fetchOrgs(); fetchUnreadCount(); checkAdminRole(); }, []);

  async function checkAdminRole() {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin' as any);
    setIsAdmin(!!(data && data.length > 0));
  }

  async function fetchOrgs() {
    const { data } = await supabase.from('organizations').select('id, name').order('name');
    if (data) setOrgs(data as unknown as Org[]);
  }

  async function fetchUnreadCount() {
    if (!session?.user?.id) return;
    // Get all orgs the user is a member of
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', session.user.id);
    if (!memberships || memberships.length === 0) return;

    const orgIds = memberships.map(m => m.organization_id);

    // Get read statuses
    const { data: readStatuses } = await supabase
      .from('org_chat_read_status')
      .select('organization_id, last_read_at')
      .eq('user_id', session.user.id)
      .in('organization_id', orgIds);

    const readMap: Record<string, string> = {};
    if (readStatuses) {
      for (const rs of readStatuses) {
        readMap[rs.organization_id] = rs.last_read_at;
      }
    }

    // Count unread messages across all orgs
    let total = 0;
    for (const orgId of orgIds) {
      const lastRead = readMap[orgId];
      let query = supabase
        .from('org_chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .neq('user_id', session.user.id);
      if (lastRead) {
        query = query.gt('created_at', lastRead);
      }
      const { count } = await query;
      if (count) total += count;
    }
    setUnreadOrgMessages(total);
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

  async function createTemplate() {
    if (!session?.user?.id || !templateName.trim()) return;
    setCreatingTemplate(true);
    const { data, error } = await supabase.from('apps').insert({
      owner_id: session.user.id,
      name: templateName.trim(),
      ngc_code: DEFAULT_NGC_CODE,
      is_public: true,
      is_remixable: true,
    }).select().single();
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else if (data) {
      toast({ title: 'Template aangemaakt', description: `"${templateName.trim()}" is publiek beschikbaar.` });
      setShowTemplateDialog(false);
      setTemplateName('');
      setTemplateDesc('');
      navigate(`/editor/${data.id}`);
    }
    setCreatingTemplate(false);
  }

  function openPublishDialog(app: App) {
    setPublishAppId(app.id);
    setSlugValue(app.slug || app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }

  async function saveSlug() {
    if (!publishAppId || !slugValue.trim()) return;
    const cleanSlug = slugValue.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-|-$/g, '');
    if (!cleanSlug) { toast({ title: 'Ongeldige slug', variant: 'destructive' }); return; }
    setSavingSlug(true);
    const { error } = await supabase.from('apps').update({ slug: cleanSlug, is_public: true }).eq('id', publishAppId);
    if (error) {
      toast({ title: 'Fout', description: error.message?.includes('unique') ? 'Deze URL is al in gebruik. Kies een andere.' : error.message, variant: 'destructive' });
    } else {
      setApps(apps.map(a => a.id === publishAppId ? { ...a, slug: cleanSlug, is_public: true } : a));
      toast({ title: 'Gepubliceerd!', description: `Je app is nu beschikbaar op /app/${cleanSlug}` });
    }
    setSavingSlug(false);
  }

  function getAppUrl(slug: string) {
    return `${window.location.origin}/app/${slug}`;
  }

  async function copyAppLink(slug: string) {
    await navigator.clipboard.writeText(getAppUrl(slug));
    toast({ title: 'Link gekopieerd!' });
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [session?.user?.id]);

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

  async function updateRetention(id: string, hours: number) {
    const { error } = await supabase.from('apps').update({ chat_retention_hours: hours } as any).eq('id', id);
    if (!error) {
      setApps(apps.map(a => a.id === id ? { ...a, chat_retention_hours: hours } : a));
      toast({ title: 'Bewaartermijn bijgewerkt', description: `Chat wordt nu ${hours} uur bewaard` });
    }
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
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between backdrop-blur-sm gap-2" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0">N</div>
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight truncate">NGC Studio</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-accent/10 text-accent" title="Jouw coins">
              <Coins className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-semibold">{totalCoins}</span>
            </div>
          </div>
          <button onClick={() => navigate('/analytics')} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">Analytics</span>
          </button>
          <button onClick={() => navigate('/organization')} className="relative flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <Building2 className="h-4 w-4" /> <span className="hidden sm:inline">Bedrijven</span>
            {unreadOrgMessages > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-scale-in">
                {unreadOrgMessages > 99 ? '99+' : unreadOrgMessages}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/settings')} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all" title="Instellingen">
            <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Account</span>
          </button>
          <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[180px]">{displayName || session?.user?.email}</span>
          <ProfileAvatar size="sm" editable />
          <button onClick={signOut} className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all" title="Uitloggen">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <AdBanner className="mb-6" />
        {/* Create button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Mijn Apps</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Maak en beheer je NGC applicaties</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setShowTemplateDialog(true)} className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all border border-primary/30 text-primary hover:bg-primary/10 active:scale-95">
              <FileCode className="h-4 w-4 sm:h-5 sm:w-5" />
              Template
            </button>
            <button onClick={createApp} disabled={creating} className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 active:scale-95">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              Nieuwe App
            </button>
          </div>
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
                  {app.slug && (
                    <button
                      onClick={e => { e.stopPropagation(); copyAppLink(app.slug!); }}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1 hover:bg-primary/20 transition-colors"
                      title={getAppUrl(app.slug)}
                    >
                      <Link className="h-3 w-3" />
                      /app/{app.slug}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
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
                  <select
                    value={app.chat_retention_hours ?? 12}
                    onChange={e => updateRetention(app.id, parseInt(e.target.value))}
                    className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 max-w-[100px]"
                    title="Chat bewaartermijn"
                  >
                    <option value={1}>1 uur</option>
                    <option value={6}>6 uur</option>
                    <option value={12}>12 uur</option>
                    <option value={24}>24 uur</option>
                    <option value={48}>2 dagen</option>
                    <option value={168}>1 week</option>
                    <option value={720}>30 dagen</option>
                  </select>
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
                  <button onClick={() => openPublishDialog(app)} className="rounded-lg p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Publiceren / Deel-link">
                    <ExternalLink className="h-4 w-4" />
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

      {/* Template Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowTemplateDialog(false)}>
          <div className="rounded-2xl border border-border/50 p-8 w-full max-w-md shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><FileCode className="h-5 w-5 text-primary" /></div>
                Template aanmaken
              </h3>
              <button onClick={() => setShowTemplateDialog(false)} className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg p-1.5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Maak een publieke template die anderen kunnen remixen.</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Naam</label>
                <input
                  type="text"
                  placeholder="Mijn Template"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createTemplate()}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Beschrijving (optioneel)</label>
                <textarea
                  placeholder="Korte beschrijving van de template..."
                  value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowTemplateDialog(false)} className="px-5 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
              <button onClick={createTemplate} disabled={creatingTemplate || !templateName.trim()} className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                {creatingTemplate ? 'Aanmaken...' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Dialog */}
      {publishAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPublishAppId(null)}>
          <div className="rounded-2xl border border-border/50 p-8 w-full max-w-md shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><ExternalLink className="h-5 w-5 text-primary" /></div>
                App publiceren
              </h3>
              <button onClick={() => setPublishAppId(null)} className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg p-1.5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Kies een unieke URL voor je app. Iedereen met de link kan je app bekijken.</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Publieke URL</label>
              <div className="flex items-center gap-0 rounded-lg border border-border overflow-hidden bg-background">
                <span className="px-3 py-3 text-xs text-muted-foreground bg-secondary/50 shrink-0 border-r border-border">{window.location.origin}/app/</span>
                <input
                  type="text"
                  value={slugValue}
                  onChange={e => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 px-3 py-3 text-sm text-foreground bg-transparent focus:outline-none"
                  placeholder="mijn-app"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">Alleen kleine letters, cijfers en streepjes.</p>
            </div>

            {apps.find(a => a.id === publishAppId)?.slug && (
              <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-2">Huidige link:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-primary flex-1 truncate">{getAppUrl(apps.find(a => a.id === publishAppId)!.slug!)}</code>
                  <button onClick={() => copyAppLink(apps.find(a => a.id === publishAppId)!.slug!)} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0">
                    Kopieer
                  </button>
                  <a href={getAppUrl(apps.find(a => a.id === publishAppId)!.slug!)} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0">
                    Open
                  </a>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('Weet je zeker dat je de publicatie wilt intrekken? Je app is daarna niet meer bereikbaar via de publieke link.')) return;
                    const { error } = await supabase.from('apps').update({ is_public: false, slug: null }).eq('id', publishAppId!);
                    if (!error) {
                      setApps(apps.map(a => a.id === publishAppId ? { ...a, is_public: false, slug: null } : a));
                      toast({ title: 'Publicatie ingetrokken', description: 'Je app is niet meer publiek toegankelijk.' });
                      setPublishAppId(null);
                    } else {
                      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
                    }
                  }}
                  className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Publicatie intrekken
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setPublishAppId(null)} className="px-5 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
              <button onClick={saveSlug} disabled={savingSlug || !slugValue.trim()} className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                {savingSlug ? 'Opslaan...' : 'Publiceren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
