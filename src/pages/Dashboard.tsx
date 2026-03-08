import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Globe, Lock, Copy, Trash2, LogOut, Users, UserPlus, X, Pencil, Building2, FileCode, FileText, Link, ExternalLink, BarChart3, Coins, Clock, Settings, Shield, Sparkles, Zap, Handshake, Percent, LayoutGrid, Menu, MessageCircle, Pin, PinOff, CopyPlus, Code, TrendingUp, BookTemplate, FileQuestion } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ProfileAvatar } from '@/components/ProfileAvatar';

import { AppIcon, IconPicker } from '@/components/IconPicker';
import { CoinConfirmDialog } from '@/components/CoinConfirmDialog';
import confetti from 'canvas-confetti';
import { getCached, setCache, clearCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { useDailyBonus } from '@/hooks/useDailyBonus';
import { DailyBonusOverlay } from '@/components/DailyBonusOverlay';
import { FriendRequests } from '@/components/FriendRequests';
import { UserSearch } from '@/components/UserSearch';

const APP_GRADIENTS = [
  'from-blue-500/15 to-cyan-500/5',
  'from-purple-500/15 to-pink-500/5',
  'from-emerald-500/15 to-teal-500/5',
  'from-orange-500/15 to-amber-500/5',
  'from-rose-500/15 to-red-500/5',
  'from-indigo-500/15 to-violet-500/5',
  'from-lime-500/15 to-green-500/5',
  'from-fuchsia-500/15 to-purple-500/5',
];

const QUOTES = [
  { text: 'De beste apps beginnen met één regel code.', emoji: '✨' },
  { text: 'Elke expert was ooit een beginner.', emoji: '🌱' },
  { text: 'Code is poëzie die machines kunnen lezen.', emoji: '📜' },
  { text: 'Fouten maken is het begin van iets moois.', emoji: '💎' },
  { text: 'Bouw iets waar je trots op bent.', emoji: '🏆' },
  { text: 'De enige limiet is je verbeelding.', emoji: '🚀' },
  { text: 'Kleine stappen leiden tot grote apps.', emoji: '👣' },
  { text: 'Vandaag is een mooie dag om te creëren.', emoji: '🎨' },
];

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
  icon: string | null;
  ngc_code: string;
}

interface Org {
  id: string;
  name: string;
  icon?: string;
}

const DEFAULT_NGC_CODE = `App:
    Var(gebruiker)=""
    Var(wachtwoord)=""
    Var(regGebruiker)=""
    Var(regWachtwoord)=""
    Page Login:
        Frame LoginBg:
            Positie="0,0"
            Grootte="500,400"
            Kleur="rgb(15,23,42)"
        Frame LoginBox:
            Positie="100,50"
            Grootte="300,280"
            Kleur="rgb(30,41,59)"
            Hoekradius="16"
            Text Titel:
                Tekst="🔐 Inloggen"
                Positie="20,15"
                Grootte="260,30"
                Kleur="rgb(255,255,255)"
            TextBox UserInput:
                Positie="20,55"
                Grootte="260,38"
                Placeholder="Gebruikersnaam..."
                Variabele="gebruiker"
                Hoekradius="8"
            TextBox PassInput:
                Positie="20,105"
                Grootte="260,38"
                Placeholder="Wachtwoord..."
                Variabele="wachtwoord"
                Hoekradius="8"
            Button LoginBtn:
                Tekst="Inloggen"
                Positie="20,160"
                Grootte="260,42"
                Kleur="rgb(59,130,246)"
                Hoekradius="10"
                Click:
                    Data.Get(gebruikers)
                    GaNaar Home
            Button NaarRegistreer:
                Tekst="Account aanmaken →"
                Positie="20,215"
                Grootte="260,36"
                Kleur="rgb(51,65,85)"
                Hoekradius="8"
                Click:
                    GaNaar Registreer
    Page Registreer:
        Frame RegBg:
            Positie="0,0"
            Grootte="500,400"
            Kleur="rgb(15,23,42)"
        Frame RegBox:
            Positie="100,40"
            Grootte="300,310"
            Kleur="rgb(30,41,59)"
            Hoekradius="16"
            Text RegTitel:
                Tekst="📝 Registreren"
                Positie="20,15"
                Grootte="260,30"
                Kleur="rgb(255,255,255)"
            TextBox RegUser:
                Positie="20,55"
                Grootte="260,38"
                Placeholder="Kies een gebruikersnaam..."
                Variabele="regGebruiker"
                Hoekradius="8"
            TextBox RegPass:
                Positie="20,105"
                Grootte="260,38"
                Placeholder="Kies een wachtwoord..."
                Variabele="regWachtwoord"
                Hoekradius="8"
            Button RegBtn:
                Tekst="Registreren"
                Positie="20,160"
                Grootte="260,42"
                Kleur="rgb(34,197,94)"
                Hoekradius="10"
                Click:
                    Data.Add(gebruikers, naam=Var(regGebruiker), wachtwoord=Var(regWachtwoord))
                    GaNaar Login
            Button NaarLogin:
                Tekst="← Terug naar inloggen"
                Positie="20,215"
                Grootte="260,36"
                Kleur="rgb(51,65,85)"
                Hoekradius="8"
                Click:
                    GaNaar Login
    Page Home:
        Frame HomeBg:
            Positie="0,0"
            Grootte="500,400"
            Kleur="rgb(15,23,42)"
        Frame HomeBox:
            Positie="100,60"
            Grootte="300,280"
            Kleur="rgb(30,41,59)"
            Hoekradius="16"
            Text Welkom:
                Tekst="Welkom, {gebruiker}! 🎉"
                Positie="20,20"
                Grootte="260,30"
                Kleur="rgb(255,255,255)"
            Text HomeInfo:
                Tekst="Je bent succesvol ingelogd."
                Positie="20,55"
                Grootte="260,20"
                Kleur="rgb(148,163,184)"
            Text DataInfo:
                Tekst="Geregistreerde accounts staan in Data."
                Positie="20,80"
                Grootte="260,20"
                Kleur="rgb(100,116,139)"
            Button UitlogBtn:
                Tekst="Uitloggen"
                Positie="20,120"
                Grootte="260,42"
                Kleur="rgb(239,68,68)"
                Hoekradius="10"
                Click:
                    Var(gebruiker)=""
                    Var(wachtwoord)=""
                    GaNaar Login
            Button WisDataBtn:
                Tekst="🗑 Alle accounts wissen"
                Positie="20,175"
                Grootte="260,36"
                Kleur="rgb(51,65,85)"
                Hoekradius="8"
                Click:
                    Data.Clear(gebruikers)
`;

interface OrgMembership {
  organization_id: string;
  role: string;
}

interface Contract {
  id: string;
  app_id: string;
  collaborator_id: string;
  proposed_by: string;
  percentage: number;
  counter_percentage: number | null;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const dailyBonus = useDailyBonus(session?.user?.id);
  const [showBonusOverlay, setShowBonusOverlay] = useState(true);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewAppDialog, setShowNewAppDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; app: App | null; name: string; category: string }>({ open: false, app: null, name: '', category: 'algemeen' });
  const [inviteAppId, setInviteAppId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePercentage, setInvitePercentage] = useState(10);
  const [inviting, setInviting] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgMemberships, setOrgMemberships] = useState<OrgMembership[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [publishAppId, setPublishAppId] = useState<string | null>(null);
  const [slugValue, setSlugValue] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [unreadOrgMessages, setUnreadOrgMessages] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [iconPickerAppId, setIconPickerAppId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractAppId, setContractAppId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pinnedAppIds, setPinnedAppIds] = useState<string[]>([]);

  // Load pinned apps
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('pinned_apps' as any).select('app_id, sort_order').eq('user_id', session.user.id).order('sort_order').then(({ data }) => {
      if (data) setPinnedAppIds((data as any[]).map((p: any) => p.app_id));
    });
  }, [session?.user?.id]);

  const togglePin = async (appId: string) => {
    if (!session?.user?.id) return;
    if (pinnedAppIds.includes(appId)) {
      await supabase.from('pinned_apps' as any).delete().eq('user_id', session.user.id).eq('app_id', appId);
      setPinnedAppIds(prev => prev.filter(id => id !== appId));
      window.dispatchEvent(new Event('pinned-apps-changed'));
      toast({ title: 'App losgemaakt' });
    } else {
      if (pinnedAppIds.length >= 3) {
        toast({ title: 'Maximum 3 apps', description: 'Maak eerst een andere app los.', variant: 'destructive' });
        return;
      }
      await supabase.from('pinned_apps' as any).insert({ user_id: session.user.id, app_id: appId, sort_order: pinnedAppIds.length } as any);
      setPinnedAppIds(prev => [...prev, appId]);
      window.dispatchEvent(new Event('pinned-apps-changed'));
      toast({ title: 'App vastgepind!' });
    }
  };

  useEffect(() => {
    async function loadCoins() {
      if (!session?.user?.id) return;
      const cached = getCached<number>(CACHE_KEYS.coins(session.user.id), CACHE_TTL.short);
      if (cached !== null) { setTotalCoins(cached); return; }
      const { data } = await supabase.from('user_coins' as any).select('balance').eq('user_id', session.user.id).maybeSingle();
      if (data) {
        const bal = (data as any).balance ?? 100;
        setTotalCoins(bal);
        setCache(CACHE_KEYS.coins(session.user.id), bal);
      } else {
        await supabase.from('user_coins' as any).insert({ user_id: session.user.id, balance: 100 } as any);
        setTotalCoins(100);
        setCache(CACHE_KEYS.coins(session.user.id), 100);
      }
    }
    loadCoins();
  }, [session?.user?.id]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 6) return 'Goedenacht';
    if (h < 12) return 'Goedemorgen';
    if (h < 18) return 'Goedemiddag';
    return 'Goedenavond';
  };

  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); handleNewAppClick(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); navigate('/analytics'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [session?.user?.id]);

  useEffect(() => { if (session?.user?.id) { fetchApps(); fetchOrgs(); fetchUnreadCount(); fetchOrgMemberships(); fetchContracts(); } }, [session?.user?.id]);
  useEffect(() => { checkAdminRole(); }, [session?.user?.id]);

  // Realtime contract notifications
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel('contract-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'collaborator_contracts' },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          if (!updated || updated.status === old?.status) return;
          
          const isOwner = apps.some(a => a.id === updated.app_id && a.owner_id === session.user.id);
          const isCollaborator = updated.collaborator_id === session.user.id;
          
          if (isOwner && updated.status === 'counter') {
            toast({ title: '🔄 Tegenvoorstel ontvangen', description: `Een samenwerker stelt ${updated.counter_percentage}% voor.` });
            fetchContracts();
          } else if (isOwner && updated.status === 'accepted') {
            toast({ title: '✅ Contract geaccepteerd', description: `Een samenwerker heeft het contract geaccepteerd!` });
            fetchContracts();
          } else if (isOwner && updated.status === 'rejected') {
            toast({ title: '❌ Contract afgewezen', description: `Een samenwerker heeft het contract afgewezen.`, variant: 'destructive' });
            fetchContracts();
          } else if (isCollaborator && updated.status === 'pending' && old?.status === 'counter') {
            toast({ title: '📋 Nieuw voorstel', description: `De eigenaar heeft een nieuw percentage voorgesteld: ${updated.percentage}%.` });
            fetchContracts();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, apps]);

  // Realtime friend request notifications
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel('friend-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships' },
        async (payload) => {
          const row = payload.new as any;
          if (row.receiver_id === session.user.id && row.status === 'pending') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', row.sender_id)
              .single();
            const name = profile?.display_name || 'Iemand';
            toast({ title: '🤝 Vriendschapsverzoek', description: `${name} wil je vriend worden!` });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friendships' },
        async (payload) => {
          const row = payload.new as any;
          const old = payload.old as any;
          if (row.status === 'accepted' && old?.status === 'pending' && row.sender_id === session.user.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', row.receiver_id)
              .single();
            const name = profile?.display_name || 'Iemand';
            toast({ title: '🎉 Verzoek geaccepteerd!', description: `${name} en jij zijn nu vrienden!` });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  async function checkAdminRole() {
    if (!session?.user?.id) return;
    const cached = getCached<boolean>(CACHE_KEYS.adminRole(session.user.id), CACHE_TTL.long);
    if (cached !== null) { setIsAdmin(cached); return; }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin' as any);
    const result = !!(data && data.length > 0);
    setIsAdmin(result);
    setCache(CACHE_KEYS.adminRole(session.user.id), result);
  }

  async function fetchOrgs() {
    if (!session?.user?.id) return;
    const cached = getCached<Org[]>(CACHE_KEYS.orgs(session.user.id), CACHE_TTL.medium);
    if (cached) { setOrgs(cached); return; }
    const { data } = await supabase.from('organizations').select('id, name, icon' as any).order('name');
    if (data) { setOrgs(data as unknown as Org[]); setCache(CACHE_KEYS.orgs(session.user.id), data as unknown as Org[]); }
  }

  async function fetchOrgMemberships() {
    if (!session?.user?.id) return;
    const cached = getCached<OrgMembership[]>(CACHE_KEYS.orgMemberships(session.user.id), CACHE_TTL.medium);
    if (cached) { setOrgMemberships(cached); return; }
    const { data } = await supabase.from('organization_members').select('organization_id, role').eq('user_id', session.user.id);
    if (data) { setOrgMemberships(data as unknown as OrgMembership[]); setCache(CACHE_KEYS.orgMemberships(session.user.id), data as unknown as OrgMembership[]); }
  }

  async function fetchContracts() {
    if (!session?.user?.id) return;
    const cached = getCached<Contract[]>(CACHE_KEYS.contracts(session.user.id), CACHE_TTL.short);
    if (cached) { setContracts(cached); return; }
    const { data } = await supabase.from('collaborator_contracts' as any).select('*');
    if (data) { setContracts(data as unknown as Contract[]); setCache(CACHE_KEYS.contracts(session.user.id), data as unknown as Contract[]); }
  }

  function isOrgAdmin(orgId: string): boolean {
    const membership = orgMemberships.find(m => m.organization_id === orgId);
    return membership?.role === 'owner' || membership?.role === 'admin';
  }

  // Only orgs where user is admin/owner
  const adminOrgs = orgs.filter(o => isOrgAdmin(o.id));

  async function fetchUnreadCount() {
    if (!session?.user?.id) return;
    const cached = getCached<number>(CACHE_KEYS.unreadCount(session.user.id), CACHE_TTL.short);
    if (cached !== null) { setUnreadOrgMessages(cached); return; }
    const { data: memberships } = await supabase.from('organization_members').select('organization_id').eq('user_id', session.user.id);
    if (!memberships || memberships.length === 0) return;
    const orgIds = memberships.map(m => m.organization_id);
    const { data: readStatuses } = await supabase.from('org_chat_read_status').select('organization_id, last_read_at').eq('user_id', session.user.id).in('organization_id', orgIds);
    const readMap: Record<string, string> = {};
    if (readStatuses) { for (const rs of readStatuses) { readMap[rs.organization_id] = rs.last_read_at; } }
    let total = 0;
    for (const orgId of orgIds) {
      const lastRead = readMap[orgId];
      let query = supabase.from('org_chat_messages').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).neq('user_id', session.user.id);
      if (lastRead) query = query.gt('created_at', lastRead);
      const { count } = await query;
      if (count) total += count;
    }
    setUnreadOrgMessages(total);
    setCache(CACHE_KEYS.unreadCount(session.user.id), total);
  }

  async function linkAppToOrg(appId: string, orgId: string | null) {
    // Check if user is admin/owner of the org
    if (orgId && !isOrgAdmin(orgId)) {
      toast({ title: 'Geen toegang', description: 'Je moet admin of eigenaar zijn van het bedrijf om apps te koppelen.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('apps').update({ organization_id: orgId } as any).eq('id', appId);
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); }
    else { setApps(apps.map(a => a.id === appId ? { ...a, organization_id: orgId } : a)); toast({ title: orgId ? 'Gekoppeld aan bedrijf' : 'Ontkoppeld van bedrijf' }); }
  }

  useEffect(() => {
    const guestCode = localStorage.getItem('ngc_guest_code');
    if (!guestCode || !session?.user?.id) return;
    localStorage.removeItem('ngc_guest_code');
    (async () => {
      const { data, error } = await supabase.from('apps').insert({ owner_id: session.user.id, name: 'Gast Project', ngc_code: guestCode }).select().single();
      if (!error && data) { toast({ title: 'Gastcode opgeslagen!' }); navigate(`/editor/${data.id}`); }
      else { toast({ title: 'Opslaan mislukt', description: error?.message || 'Onbekende fout', variant: 'destructive' }); fetchApps(); }
    })();
  }, [session?.user?.id]);

  async function fetchApps() {
    if (!session?.user?.id) { setLoading(false); return; }
    const cached = getCached<App[]>(CACHE_KEYS.apps(session.user.id), CACHE_TTL.short);
    if (cached) { setApps(cached); setLoading(false); return; }
    const { data, error } = await supabase.from('apps').select('*').order('updated_at', { ascending: false });
    if (error) { toast({ title: 'Fout bij laden', description: error.message, variant: 'destructive' }); }
    else { setApps(data || []); setCache(CACHE_KEYS.apps(session.user.id), data || []); }
    setLoading(false);
  }

  function handleNewAppClick() {
    setShowNewAppDialog(true);
  }

  async function createApp() {
    if (!session?.user?.id) return;
    setShowNewAppDialog(false);
    setCreating(true);
    clearCache(CACHE_KEYS.apps(session.user.id));
    const { data, error } = await supabase.from('apps').insert({ owner_id: session.user.id, name: 'Nieuwe App', ngc_code: DEFAULT_NGC_CODE }).select().single();
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); }
    else if (data) { navigate(`/editor/${data.id}`); }
    setCreating(false);
  }

  function useTemplateFlow() {
    setShowNewAppDialog(false);
    navigate('/templates');
  }

  async function duplicateApp(app: App) {
    if (!session?.user?.id) return;
    clearCache(CACHE_KEYS.apps(session.user.id));
    const { data, error } = await supabase.from('apps').insert({
      owner_id: session.user.id,
      name: `${app.name} (kopie)`,
      ngc_code: app.ngc_code,
    }).select().single();
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); }
    else if (data) {
      setApps(prev => [data as App, ...prev]);
      toast({ title: '📋 App gedupliceerd!', description: `"${app.name}" is gekopieerd.` });
    }
  }

  function openTemplateDialog(app: App) {
    setTemplateDialog({ open: true, app, name: app.name, category: 'algemeen' });
  }

  async function confirmConvertToTemplate() {
    if (!session?.user?.id || !templateDialog.app) return;
    const { error } = await supabase.from('templates').insert({
      author_id: session.user.id,
      name: templateDialog.name || templateDialog.app.name,
      description: `Template op basis van "${templateDialog.app.name}"`,
      ngc_code: templateDialog.app.ngc_code,
      category: templateDialog.category,
      is_published: true,
    });
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '📦 Template aangemaakt!', description: `"${templateDialog.name}" is nu beschikbaar als template.` });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    }
    setTemplateDialog({ open: false, app: null, name: '', category: 'algemeen' });
  }

  async function createTemplate() {
    setCreatingTemplate(true);
    const { data, error } = await supabase.from('apps').insert({ owner_id: session.user.id, name: templateName.trim(), ngc_code: DEFAULT_NGC_CODE, is_public: true, is_remixable: true }).select().single();
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); }
    else if (data) { toast({ title: 'Template aangemaakt' }); setShowTemplateDialog(false); setTemplateName(''); setTemplateDesc(''); navigate(`/editor/${data.id}`); }
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
      toast({ title: 'Fout', description: error.message?.includes('unique') ? 'Deze URL is al in gebruik.' : error.message, variant: 'destructive' });
    } else {
      setApps(apps.map(a => a.id === publishAppId ? { ...a, slug: cleanSlug, is_public: true } : a));
      toast({ title: '🎉 Gepubliceerd!', description: `Je app is nu beschikbaar op /app/${cleanSlug}` });
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#38bdf8', '#818cf8', '#f472b6', '#34d399', '#fbbf24'] });
      setTimeout(() => confetti({ particleCount: 50, spread: 120, origin: { y: 0.5 } }), 300);
    }
    setSavingSlug(false);
  }

  function getAppUrl(slug: string) { return `${window.location.origin}/app/${slug}`; }

  async function copyAppLink(slug: string) {
    await navigator.clipboard.writeText(getAppUrl(slug));
    toast({ title: 'Link gekopieerd!' });
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    const cached = getCached<string>(CACHE_KEYS.displayName(session.user.id), CACHE_TTL.long);
    if (cached) { setDisplayName(cached); return; }
    supabase.from('profiles').select('display_name, username').eq('id', session.user.id).single()
      .then(({ data }) => {
        if (data?.display_name) { setDisplayName(data.display_name); setCache(CACHE_KEYS.displayName(session.user.id), data.display_name); }
        if ((data as any)?.username) setProfileUsername((data as any).username);
      });
  }, [session?.user?.id]);

  async function deleteApp(id: string, name: string) {
    if (!confirm(`Weet je zeker dat je \"${name}\" wilt verwijderen?`)) return;
    const { error } = await supabase.from('apps').delete().eq('id', id);
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); }
    else { setApps(apps.filter(a => a.id !== id)); clearCache(CACHE_KEYS.apps(session?.user?.id || '')); toast({ title: 'Verwijderd' }); }
  }

  async function togglePublic(app: App) {
    const { error } = await supabase.from('apps').update({ is_public: !app.is_public }).eq('id', app.id);
    if (!error) setApps(apps.map(a => a.id === app.id ? { ...a, is_public: !a.is_public } : a));
  }

  async function toggleRemixable(app: App) {
    const { error } = await supabase.from('apps').update({ is_remixable: !app.is_remixable }).eq('id', app.id);
    if (!error) setApps(apps.map(a => a.id === app.id ? { ...a, is_remixable: !a.is_remixable } : a));
  }

  const [coinConfirm, setCoinConfirm] = useState<{ open: boolean; amount: number; description: string; onConfirm: () => void }>({ open: false, amount: 0, description: '', onConfirm: () => {} });

  function requestCoinConfirm(amount: number, description: string, onConfirm: () => void) {
    setCoinConfirm({ open: true, amount, description, onConfirm });
  }

  async function updateRetention(id: string, hours: number) {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    const currentHours = app.chat_retention_hours ?? 12;
    if (hours > 12 && hours > currentHours) {
      const extraBlocks = Math.ceil((hours - Math.max(currentHours, 12)) / 12);
      const cost = extraBlocks * 5;
      if (cost > 0) {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;
        const { data: coinRow } = await supabase.from('user_coins').select('id, balance').eq('user_id', authData.user.id).maybeSingle();
        const balance = (coinRow as any)?.balance ?? 0;
        if (balance < cost) { toast({ title: 'Niet genoeg coins', description: `Je hebt ${cost} coins nodig maar je hebt er ${balance}.`, variant: 'destructive' }); return; }
        requestCoinConfirm(cost, `Bewaartijd verlengen naar ${hours >= 24 ? Math.round(hours / 24) + ' dag(en)' : hours + ' uur'}`, async () => {
          await supabase.from('user_coins').update({ balance: balance - cost, updated_at: new Date().toISOString() } as any).eq('id', (coinRow as any).id);
          toast({ title: `${cost} coins afgeschreven` });
          const { error } = await supabase.from('apps').update({ chat_retention_hours: hours } as any).eq('id', id);
          if (!error) setApps(prev => prev.map(a => a.id === id ? { ...a, chat_retention_hours: hours } : a));
        });
        return;
      }
    }
    const { error } = await supabase.from('apps').update({ chat_retention_hours: hours } as any).eq('id', id);
    if (!error) {
      setApps(apps.map(a => a.id === id ? { ...a, chat_retention_hours: hours } : a));
      if (hours <= 12) toast({ title: 'Bewaartermijn bijgewerkt' });
    }
  }

  async function renameApp(id: string, newName: string) {
    if (!newName.trim()) return;
    const { error } = await supabase.from('apps').update({ name: newName.trim() }).eq('id', id);
    if (!error) setApps(apps.map(a => a.id === id ? { ...a, name: newName.trim() } : a));
    setEditingNameId(null);
  }

  async function updateAppIcon(id: string, icon: string) {
    const { error } = await supabase.from('apps').update({ icon } as any).eq('id', id);
    if (!error) setApps(apps.map(a => a.id === id ? { ...a, icon } : a));
    setIconPickerAppId(null);
  }

  async function inviteCollaborator() {
    if (!inviteAppId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-collaborator', { body: { email: inviteEmail.trim(), app_id: inviteAppId } });
      if (error) throw error;
      if (data?.error) { toast({ title: 'Fout', description: data.error, variant: 'destructive' }); }
      else {
        // Create contract for the collaborator
        if (data?.collaborator_id && invitePercentage > 0) {
          await supabase.from('collaborator_contracts' as any).insert({
            app_id: inviteAppId,
            collaborator_id: data.collaborator_id,
            proposed_by: session?.user?.id,
            percentage: invitePercentage,
            status: 'pending',
          } as any);
          toast({ title: 'Uitgenodigd met contract', description: `${invitePercentage}% voorstel verstuurd.` });
        } else {
          toast({ title: 'Verstuurd' });
        }
        setInviteEmail('');
        setInvitePercentage(10);
        setInviteAppId(null);
        clearCache(CACHE_KEYS.contracts(session?.user?.id || ''));
        fetchContracts();
      }
    } catch (e) {
      toast({ title: 'Fout', description: e instanceof Error ? e.message : 'Onbekende fout', variant: 'destructive' });
    }
    setInviting(false);
  }

  async function respondToContract(contractId: string, action: 'accepted' | 'rejected' | 'counter', counterPct?: number) {
    if (action === 'counter' && counterPct) {
      await supabase.from('collaborator_contracts' as any).update({
        status: 'counter',
        counter_percentage: counterPct,
        updated_at: new Date().toISOString(),
      } as any).eq('id', contractId);
      toast({ title: 'Tegenvoorstel verstuurd', description: `${counterPct}% voorgesteld.` });
    } else if (action === 'accepted') {
      const contract = contracts.find(c => c.id === contractId);
      // If there's a counter, accept the counter percentage
      const finalPct = contract?.counter_percentage || contract?.percentage || 10;
      await supabase.from('collaborator_contracts' as any).update({
        status: 'accepted',
        percentage: finalPct,
        counter_percentage: null,
        updated_at: new Date().toISOString(),
      } as any).eq('id', contractId);
      toast({ title: 'Contract geaccepteerd', description: `${finalPct}% per transactie.` });
    } else {
      await supabase.from('collaborator_contracts' as any).update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      } as any).eq('id', contractId);
      toast({ title: 'Contract afgewezen' });
    }
    clearCache(CACHE_KEYS.contracts(session?.user?.id || ''));
    fetchContracts();
  }

  const myApps = apps.filter(a => a.owner_id === session?.user?.id);
  const sharedApps = apps.filter(a => a.owner_id !== session?.user?.id);

  // Stats
  const stats = useMemo(() => {
    const totalLines = myApps.reduce((sum, a) => sum + (a.ngc_code?.split('\n').length || 0), 0);
    const publicApps = myApps.filter(a => a.is_public).length;
    const thisWeek = myApps.filter(a => {
      const d = new Date(a.updated_at);
      const now = new Date();
      return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { totalApps: myApps.length, totalLines, publicApps, activeThisWeek: thisWeek };
  }, [myApps]);

  // Typewriter effect for quote
  const [typedText, setTypedText] = useState('');
  const fullQuoteText = `${quote.emoji} ${quote.text}`;
  useEffect(() => {
    setTypedText('');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setTypedText(fullQuoteText.slice(0, i));
      if (i >= fullQuoteText.length) clearInterval(timer);
    }, 35);
    return () => clearInterval(timer);
  }, [fullQuoteText]);

  return (
    <div className="min-h-screen bg-background">
      {showBonusOverlay && !dailyBonus.loading && dailyBonus.claimed && (
        <DailyBonusOverlay state={dailyBonus} onClose={() => setShowBonusOverlay(false)} />
      )}
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full bg-accent/[0.03] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/30 px-4 sm:px-6 py-3 glass-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
           <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center border border-primary/10 shrink-0 overflow-hidden">
              <img src="/ngc-logo.png" alt="NGC" className="h-full w-full object-cover rounded-xl" />
            </div>
            <h1 className="hidden sm:block text-lg font-bold text-foreground font-display tracking-tight">NGC Studio</h1>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex lg:hidden items-center gap-1 sm:gap-2">
            {/* Coins */}
            <div className="relative group/coins flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-accent/5 border border-accent/10 text-accent cursor-default transition-colors hover:bg-accent/10">
              <Coins className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold tabular-nums">{totalCoins}</span>
              <div className="absolute top-full mt-2 right-0 hidden group-hover/coins:block z-50 glass-card-highlight rounded-xl p-4 shadow-2xl min-w-[200px] animate-scale-in">
                <div className="text-xs text-muted-foreground mb-1.5">💰 Coin Overzicht</div>
                <div className="text-xl font-bold text-foreground font-display">{totalCoins}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Gebruik coins voor retentie, ads en meer.</div>
                <div className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground/50">
                  ⌨️ Ctrl+N Nieuwe app · Ctrl+K Analytics
                </div>
              </div>
            </div>

            <NavBtn onClick={() => navigate('/templates')} icon={<LayoutGrid className="h-4 w-4" />} label="Templates" />
            <NavBtn onClick={() => navigate('/berichten')} icon={<MessageCircle className="h-4 w-4" />} label="Berichten" />
            <NavBtn onClick={() => navigate('/groepen')} icon={<Users className="h-4 w-4" />} label="Groepen" />
            <NavBtn onClick={() => navigate('/analytics')} icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
            <NavBtn onClick={() => navigate('/organization')} icon={<Building2 className="h-4 w-4" />} label="Bedrijven" badge={unreadOrgMessages} />
            <NavBtn onClick={() => navigate('/alliances')} icon={<Handshake className="h-4 w-4" />} label="Allianties" />
            {isAdmin && <NavBtn onClick={() => navigate('/admin')} icon={<Shield className="h-4 w-4" />} label="Admin" variant="destructive" />}
            <NavBtn onClick={() => navigate('/settings')} icon={<Settings className="h-4 w-4" />} label="Account" />

            <span
              onClick={() => navigate(`/profiel/${profileUsername || session?.user?.id}`)}
              className="hidden lg:inline text-xs text-muted-foreground truncate max-w-[140px] cursor-pointer hover:text-primary hover:underline transition-colors"
            >
              {displayName || session?.user?.email}
            </span>
            <div onClick={() => navigate(`/profiel/${profileUsername || session?.user?.id}`)} className="cursor-pointer">
              <ProfileAvatar size="sm" />
            </div>
            <button onClick={signOut} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all" title="Uitloggen">
              <LogOut className="h-4 w-4" />
            </button>
          </nav>

          {/* Mobile: coins + avatar + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-accent/5 border border-accent/10 text-accent">
              <Coins className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold tabular-nums">{totalCoins}</span>
            </div>
            <div onClick={() => navigate(`/profiel/${profileUsername || session?.user?.id}`)} className="cursor-pointer">
              <ProfileAvatar size="sm" />
            </div>
          </div>
        </div>

      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <FriendRequests />

        {/* User search */}
        <div className="mb-6">
          <UserSearch />
        </div>

        {/* Hero section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 animate-slide-up">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-display tracking-tight">
              {getGreeting()}{displayName ? `, ${displayName}` : ''} 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5 italic min-h-[1.5em]">
              {typedText}<span className="animate-pulse">|</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={handleNewAppClick} disabled={creating} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-50 active:scale-[0.98]">
              <Plus className="h-4 w-4" />
              Nieuwe App
            </button>
          </div>
        </div>

        {/* Stats widget */}
        {!loading && myApps.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {[
              { icon: <FileCode className="h-4 w-4" />, label: 'Apps', value: stats.totalApps, color: 'primary' },
              { icon: <Code className="h-4 w-4" />, label: 'Regels code', value: stats.totalLines.toLocaleString(), color: 'accent' },
              { icon: <Globe className="h-4 w-4" />, label: 'Publiek', value: stats.publicApps, color: 'primary' },
              { icon: <TrendingUp className="h-4 w-4" />, label: 'Actief (7d)', value: stats.activeThisWeek, color: 'accent' },
            ].map(stat => (
              <div key={stat.label} className="glass-card rounded-xl p-3 sm:p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${stat.color}/10 text-${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : myApps.length === 0 ? (
          <div className="glass-card-highlight rounded-2xl p-12 sm:p-16 text-center relative overflow-hidden animate-scale-in">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative">
              <div className="mb-5 text-6xl">🚀</div>
              <h3 className="text-xl font-bold text-foreground font-display mb-2">Begin je avontuur!</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{quote.emoji} {quote.text}</p>
              <button onClick={handleNewAppClick} disabled={creating} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 transition-all active:scale-[0.98]">
                <Plus className="h-5 w-5" /> Maak je eerste app
              </button>
              <p className="text-[10px] text-muted-foreground/40 mt-4">💡 Ctrl+N om snel een app aan te maken</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {myApps.map((app, idx) => (
              <div
                key={app.id}
                className="group glass-card rounded-2xl p-5 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 cursor-pointer hover:-translate-y-1 relative overflow-hidden animate-slide-up"
                style={{ animationDelay: `${Math.min(idx * 60, 300)}ms` }}
                onClick={() => navigate(`/editor/${app.id}`)}
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${APP_GRADIENTS[idx % APP_GRADIENTS.length]} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                <div className="relative flex items-start gap-3 mb-3">
                  <button
                    onClick={e => { e.stopPropagation(); setIconPickerAppId(app.id); }}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/5 border border-primary/10 flex items-center justify-center shrink-0 text-primary hover:from-primary/25 hover:to-accent/15 transition-colors"
                    title="Icoon wijzigen"
                  >
                    <AppIcon iconName={app.icon || 'file-code'} size={18} />
                  </button>
                  <div className="flex-1 min-w-0">
                    {editingNameId === app.id ? (
                      <input
                        autoFocus
                        className="font-semibold text-foreground bg-background border border-primary/30 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={editingNameValue}
                        onChange={e => setEditingNameValue(e.target.value)}
                        onBlur={() => renameApp(app.id, editingNameValue)}
                        onKeyDown={e => { if (e.key === 'Enter') renameApp(app.id, editingNameValue); if (e.key === 'Escape') setEditingNameId(null); }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="font-semibold text-sm text-foreground truncate">{app.name}</h3>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {new Date(app.updated_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {app.is_public ? <Globe className="h-3.5 w-3.5 text-primary/70" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    {app.is_remixable && <Copy className="h-3.5 w-3.5 text-accent/70" />}
                  </div>
                </div>

                {/* Tags */}
                <div className="relative flex items-center gap-1.5 mb-3 flex-wrap">
                  {app.organization_id && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent/80 border border-accent/10 flex items-center gap-1">
                      <AppIcon iconName={orgs.find(o => o.id === app.organization_id)?.icon || 'building-2'} size={10} />
                      {orgs.find(o => o.id === app.organization_id)?.name || 'Bedrijf'}
                    </span>
                  )}
                  {app.slug && (
                    <button
                      onClick={e => { e.stopPropagation(); copyAppLink(app.slug!); }}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/10 flex items-center gap-1 hover:bg-primary/15 transition-colors"
                      title={getAppUrl(app.slug)}
                    >
                      <Link className="h-2.5 w-2.5" />
                      /app/{app.slug}
                    </button>
                  )}
                </div>

                {/* Actions (on hover) */}
                <div className="relative flex items-center gap-1 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                  {adminOrgs.length > 0 && (
                    <select value={app.organization_id || ''} onChange={e => linkAppToOrg(app.id, e.target.value || null)}
                      className="text-[11px] rounded-lg border border-border/40 bg-background/80 px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 max-w-[100px]"
                    >
                      <option value="">Geen bedrijf</option>
                      {adminOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )}
                  <select value={app.chat_retention_hours ?? 12} onChange={e => updateRetention(app.id, parseInt(e.target.value))}
                    className="text-[11px] rounded-lg border border-border/40 bg-background/80 px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 max-w-[110px]"
                  >
                    <option value={1}>1 uur</option>
                    <option value={6}>6 uur</option>
                    <option value={12}>12u (gratis)</option>
                    <option value={24}>24u (5🪙)</option>
                    <option value={48}>2d (15🪙)</option>
                    <option value={168}>1w (65🪙)</option>
                    <option value={720}>30d (295🪙)</option>
                  </select>
                  <ActionBtn onClick={() => { setEditingNameId(app.id); setEditingNameValue(app.name); }} icon={<Pencil className="h-3.5 w-3.5" />} title="Hernoemen" />
                  <ActionBtn onClick={() => togglePublic(app)} icon={app.is_public ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />} title={app.is_public ? 'Maak privé' : 'Maak publiek'} />
                  <ActionBtn onClick={() => toggleRemixable(app)} icon={<Copy className="h-3.5 w-3.5" />} title={app.is_remixable ? 'Remix uit' : 'Remix aan'} />
                  <ActionBtn onClick={() => { setInviteAppId(app.id); setInviteEmail(''); setInvitePercentage(10); }} icon={<UserPlus className="h-3.5 w-3.5" />} title="Uitnodigen + Contract" />
                  <ActionBtn onClick={() => setContractAppId(app.id)} icon={<FileText className="h-3.5 w-3.5" />} title="Contracten bekijken" className="hover:text-accent" />
                  <ActionBtn onClick={() => openPublishDialog(app)} icon={<ExternalLink className="h-3.5 w-3.5" />} title="Publiceren" className="hover:text-primary" />
                  <ActionBtn onClick={() => togglePin(app.id)} icon={pinnedAppIds.includes(app.id) ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} title={pinnedAppIds.includes(app.id) ? 'Losmaken' : 'Vastpinnen'} className={pinnedAppIds.includes(app.id) ? 'text-primary hover:text-destructive' : 'hover:text-primary'} />
                  <ActionBtn onClick={() => openTemplateDialog(app)} icon={<BookTemplate className="h-3.5 w-3.5" />} title="Maak template" className="hover:text-primary" />
                  <ActionBtn onClick={() => duplicateApp(app)} icon={<CopyPlus className="h-3.5 w-3.5" />} title="Dupliceren" className="hover:text-accent" />
                  <ActionBtn onClick={() => deleteApp(app.id, app.name)} icon={<Trash2 className="h-3.5 w-3.5" />} title="Verwijderen" className="ml-auto hover:text-destructive hover:bg-destructive/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending contracts for me */}
        {contracts.filter(c => c.collaborator_id === session?.user?.id && (c.status === 'pending' || c.status === 'counter')).length > 0 && (
          <div className="mt-10 pt-8 border-t border-border/20">
            <h2 className="text-xl font-bold text-foreground font-display mb-5 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/10"><Handshake className="h-4 w-4 text-accent" /></div>
              Openstaande contracten
            </h2>
            <ContractList
              contracts={contracts.filter(c => c.collaborator_id === session?.user?.id && (c.status === 'pending' || c.status === 'counter'))}
              currentUserId={session?.user?.id || ''}
              onRespond={respondToContract}
              appNames={Object.fromEntries(apps.map(a => [a.id, a.name]))}
              showAppName
            />
          </div>
        )}

        {/* Shared apps */}
        {sharedApps.length > 0 && (
          <div className="mt-12 pt-10 border-t border-border/20">
            <h2 className="text-xl font-bold text-foreground font-display mb-5 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/10"><Users className="h-4 w-4 text-accent" /></div>
              Gedeeld met mij
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedApps.map(app => {
                const appContract = contracts.find(c => c.app_id === app.id && c.collaborator_id === session?.user?.id && c.status === 'accepted');
                return (
                  <div key={app.id} className="glass-card rounded-2xl p-5 transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 cursor-pointer hover:-translate-y-1 group relative" onClick={() => navigate(`/editor/${app.id}`)}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate mb-1.5">{app.name}</h3>
                        <p className="text-[11px] text-muted-foreground/60">{new Date(app.updated_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); togglePin(app.id); }}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${pinnedAppIds.includes(app.id) ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-secondary/50'}`}
                        title={pinnedAppIds.includes(app.id) ? 'Losmaken' : 'Vastpinnen'}
                      >
                        {pinnedAppIds.includes(app.id) ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {appContract && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-accent/80">
                        <Handshake className="h-3 w-3" />
                        <span>Contract: {appContract.percentage}% per transactie</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity bar */}
        {myApps.length > 0 && (
          <div className="mt-10 glass-card rounded-2xl p-5 animate-slide-up delay-300">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-semibold text-foreground font-display">Activiteit</span>
              <span className="text-[10px] text-muted-foreground/40 ml-auto">30 dagen</span>
            </div>
            <div className="flex items-end gap-[3px] h-10">
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (29 - i));
                const dayStr = d.toISOString().split('T')[0];
                const count = myApps.filter(a => a.updated_at.startsWith(dayStr)).length;
                const h = count ? Math.min(100, 25 + count * 25) : 6;
                return (
                  <div key={i} className="flex-1 rounded-full transition-all hover:opacity-90" style={{ height: `${h}%`, background: count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))', opacity: count > 0 ? 0.7 : 0.2 }} title={`${dayStr}: ${count} update(s)`} />
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Invite Dialog with Contract */}
      {inviteAppId && (
        <ModalOverlay onClose={() => setInviteAppId(null)}>
          <ModalCard>
            <ModalHeader icon={<UserPlus className="h-5 w-5 text-primary" />} title="Samenwerker + Contract" onClose={() => setInviteAppId(null)} />
            <p className="text-sm text-muted-foreground mb-4">Nodig een samenwerker uit met een coin-contract.</p>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">E-mail</label>
                <input
                  type="email" placeholder="email@voorbeeld.nl" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border border-border/40 bg-background/80 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-1">
                  <Percent className="h-3 w-3" /> Contract percentage (per transactie)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={50} value={invitePercentage}
                    onChange={e => setInvitePercentage(parseInt(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-sm font-bold text-foreground tabular-nums w-12 text-right">{invitePercentage}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  {invitePercentage === 0 ? 'Geen contract — gratis samenwerking' : `De samenwerker ontvangt ${invitePercentage}% van elke coin-transactie. Kan onderhandeld worden.`}
                </p>
              </div>
            </div>
            <ModalFooter>
              <ModalCancelBtn onClick={() => setInviteAppId(null)} />
              <ModalActionBtn onClick={inviteCollaborator} disabled={inviting || !inviteEmail.trim()} loading={inviting} label="Uitnodigen" />
            </ModalFooter>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* Contracts Dialog */}
      {contractAppId && (
        <ModalOverlay onClose={() => setContractAppId(null)}>
          <ModalCard>
            <ModalHeader icon={<Handshake className="h-5 w-5 text-accent" />} title="Contracten" onClose={() => setContractAppId(null)} />
            <ContractList
              contracts={contracts.filter(c => c.app_id === contractAppId)}
              currentUserId={session?.user?.id || ''}
              onRespond={respondToContract}
            />
          </ModalCard>
        </ModalOverlay>
      )}

      {/* Template Dialog */}
      {showTemplateDialog && (
        <ModalOverlay onClose={() => setShowTemplateDialog(false)}>
          <ModalCard>
            <ModalHeader icon={<FileCode className="h-5 w-5 text-primary" />} title="Template aanmaken" onClose={() => setShowTemplateDialog(false)} />
            <p className="text-sm text-muted-foreground mb-5">Maak een publieke template die anderen kunnen remixen.</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Naam</label>
                <input type="text" placeholder="Mijn Template" value={templateName} onChange={e => setTemplateName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTemplate()} className="w-full rounded-xl border border-border/40 bg-background/80 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Beschrijving (optioneel)</label>
                <textarea placeholder="Korte beschrijving..." value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-border/40 bg-background/80 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
            </div>
            <ModalFooter>
              <ModalCancelBtn onClick={() => setShowTemplateDialog(false)} />
              <ModalActionBtn onClick={createTemplate} disabled={creatingTemplate || !templateName.trim()} loading={creatingTemplate} label="Aanmaken" />
            </ModalFooter>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* Publish Dialog */}
      {publishAppId && (
        <ModalOverlay onClose={() => setPublishAppId(null)}>
          <ModalCard>
            <ModalHeader icon={<ExternalLink className="h-5 w-5 text-primary" />} title="App publiceren" onClose={() => setPublishAppId(null)} />
            <p className="text-sm text-muted-foreground mb-5">Kies een unieke URL voor je app.</p>
            <div className="mb-4">
              <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Publieke URL</label>
              <div className="flex items-center gap-0 rounded-xl border border-border/40 overflow-hidden bg-background/80">
                <span className="px-3 py-2.5 text-xs text-muted-foreground/50 bg-secondary/30 shrink-0 border-r border-border/20">/app/</span>
                <input type="text" value={slugValue} onChange={e => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="flex-1 px-3 py-2.5 text-sm text-foreground bg-transparent focus:outline-none" placeholder="mijn-app" autoFocus />
              </div>
            </div>
            {apps.find(a => a.id === publishAppId)?.slug && (
              <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Huidige link</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-primary flex-1 truncate">{getAppUrl(apps.find(a => a.id === publishAppId)!.slug!)}</code>
                  <button onClick={() => copyAppLink(apps.find(a => a.id === publishAppId)!.slug!)} className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors">Kopieer</button>
                  <a href={getAppUrl(apps.find(a => a.id === publishAppId)!.slug!)} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors">Open</a>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('Publicatie intrekken?')) return;
                    const { error } = await supabase.from('apps').update({ is_public: false, slug: null }).eq('id', publishAppId!);
                    if (!error) { setApps(apps.map(a => a.id === publishAppId ? { ...a, is_public: false, slug: null } : a)); toast({ title: 'Publicatie ingetrokken' }); setPublishAppId(null); }
                    else toast({ title: 'Fout', description: error.message, variant: 'destructive' });
                  }}
                  className="mt-3 w-full px-3 py-2 text-xs font-medium rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Publicatie intrekken
                </button>
              </div>
            )}
            <ModalFooter>
              <ModalCancelBtn onClick={() => setPublishAppId(null)} />
              <ModalActionBtn onClick={saveSlug} disabled={savingSlug || !slugValue.trim()} loading={savingSlug} label="Publiceren" />
            </ModalFooter>
          </ModalCard>
        </ModalOverlay>
      )}

      {iconPickerAppId && (
        <IconPicker
          value={apps.find(a => a.id === iconPickerAppId)?.icon || 'file-code'}
          onChange={icon => updateAppIcon(iconPickerAppId, icon)}
          onClose={() => setIconPickerAppId(null)}
        />
      )}

      <CoinConfirmDialog
        open={coinConfirm.open}
        onOpenChange={(open) => setCoinConfirm(prev => ({ ...prev, open }))}
        amount={coinConfirm.amount}
        description={coinConfirm.description}
        onConfirm={() => { coinConfirm.onConfirm(); setCoinConfirm(prev => ({ ...prev, open: false })); }}
      />

      {/* New App Dialog */}
      <Dialog open={showNewAppDialog} onOpenChange={setShowNewAppDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe app aanmaken</DialogTitle>
            <DialogDescription>Hoe wil je beginnen?</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={createApp}
              disabled={creating}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <FileCode className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Vanaf nul</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Begin met een leeg project</p>
              </div>
            </button>
            <button
              onClick={useTemplateFlow}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <BookTemplate className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Template</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Start vanuit een bestaand sjabloon</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Sub-components ─── */

function NavBtn({ onClick, icon, label, badge, variant }: { onClick: () => void; icon: React.ReactNode; label: string; badge?: number; variant?: 'destructive' }) {
  return (
    <button onClick={onClick} className={`relative flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-[0.97] ${variant === 'destructive' ? 'text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {!!badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1 animate-scale-in">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function MobileNavItem({ onClick, icon, label, badge, variant }: { onClick: () => void; icon: React.ReactNode; label: string; badge?: number; variant?: 'destructive' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${variant === 'destructive' ? 'text-destructive hover:bg-destructive/10' : 'text-foreground/80 hover:text-foreground hover:bg-secondary/40'}`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {!!badge && badge > 0 && (
        <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function ActionBtn({ onClick, icon, title, className = '' }: { onClick: () => void; icon: React.ReactNode; title: string; className?: string }) {
  return (
    <button onClick={onClick} className={`rounded-lg p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-colors ${className}`} title={title}>
      {icon}
    </button>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-scale-in" onClick={onClose}>
      {children}
    </div>
  );
}

function ModalCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card-highlight rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl shadow-black/30" onClick={e => e.stopPropagation()}>
      {children}
    </div>
  );
}

function ModalHeader({ icon, title, onClose }: { icon: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-lg font-bold text-foreground font-display flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/10">{icon}</div>
        {title}
      </h3>
      <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground hover:bg-secondary/50 rounded-lg p-1 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2.5">{children}</div>;
}

function ModalCancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-4 py-2 text-sm font-medium rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
      Annuleren
    </button>
  );
}

function ModalActionBtn({ onClick, disabled, loading, label }: { onClick: () => void; disabled: boolean; loading: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-50 transition-all active:scale-[0.98]">
      {loading ? 'Bezig...' : label}
    </button>
  );
}

interface ContractListProps {
  contracts: Contract[];
  currentUserId: string;
  onRespond: (id: string, action: 'accepted' | 'rejected' | 'counter', counterPct?: number) => void;
  appNames?: Record<string, string>;
  showAppName?: boolean;
}

function ContractList({ contracts: items, currentUserId, onRespond, appNames, showAppName }: ContractListProps) {
  const [counterValues, setCounterValues] = useState<Record<string, number>>({});

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground/50 py-4 text-center">Geen contracten gevonden.</p>;
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Wachtend', color: 'text-yellow-400' },
    counter: { label: 'Tegenvoorstel', color: 'text-orange-400' },
    accepted: { label: 'Geaccepteerd', color: 'text-emerald-400' },
    rejected: { label: 'Afgewezen', color: 'text-destructive' },
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {items.map(c => {
        const isCollaborator = c.collaborator_id === currentUserId;
        const isOwner = c.proposed_by === currentUserId || !isCollaborator;
        const statusInfo = statusLabels[c.status] || { label: c.status, color: 'text-muted-foreground' };
        const canRespond = (c.status === 'pending' && isCollaborator) || (c.status === 'counter' && isOwner);
        const displayPct = c.status === 'counter' && c.counter_percentage ? c.counter_percentage : c.percentage;

        return (
          <div key={c.id} className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-accent/70" />
                <span className="text-sm font-medium text-foreground">
                  {showAppName && appNames?.[c.app_id] ? appNames[c.app_id] : 'Contract'}
                </span>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/30 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all" style={{ width: `${displayPct * 2}%` }} />
              </div>
              <span className="text-sm font-bold text-foreground tabular-nums">{displayPct}%</span>
            </div>

            {c.status === 'counter' && c.counter_percentage && (
              <p className="text-[10px] text-muted-foreground">
                Tegenvoorstel: {c.counter_percentage}% (origineel: {c.percentage}%)
              </p>
            )}

            {canRespond && (
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => onRespond(c.id, 'accepted')} className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                  Accepteren
                </button>
                <button onClick={() => onRespond(c.id, 'rejected')} className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors">
                  Afwijzen
                </button>
                {isCollaborator && c.status === 'pending' && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="number" min={1} max={50}
                      value={counterValues[c.id] ?? c.percentage}
                      onChange={e => setCounterValues(prev => ({ ...prev, [c.id]: parseInt(e.target.value) || 1 }))}
                      className="w-14 px-2 py-1 text-[11px] rounded-lg border border-border/40 bg-background/80 text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent/40"
                    />
                    <button onClick={() => onRespond(c.id, 'counter', counterValues[c.id] ?? c.percentage)} className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors">
                      Tegenvoorstel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
