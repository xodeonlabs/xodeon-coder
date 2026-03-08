import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, Users, Trash2, UserPlus, Crown, ShieldCheck, User, Building2, AppWindow, Megaphone, Plus, Eye, EyeOff, Pencil, Ban, ShieldOff, Activity } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const EMOJI_LIST = [
  { emoji: '🚀', label: 'rocket' }, { emoji: '🎮', label: 'game' }, { emoji: '🐍', label: 'snake' },
  { emoji: '💡', label: 'lightbulb idea' }, { emoji: '🎯', label: 'target' }, { emoji: '🔥', label: 'fire' },
  { emoji: '⭐', label: 'star' }, { emoji: '❤️', label: 'heart' }, { emoji: '🎵', label: 'music' },
  { emoji: '📱', label: 'phone mobile' }, { emoji: '💻', label: 'laptop computer' }, { emoji: '🖥️', label: 'desktop monitor' },
  { emoji: '🎨', label: 'art palette' }, { emoji: '📷', label: 'camera photo' }, { emoji: '🎬', label: 'film movie' },
  { emoji: '📚', label: 'books' }, { emoji: '✏️', label: 'pencil write' }, { emoji: '🔧', label: 'wrench tool' },
  { emoji: '⚡', label: 'lightning energy' }, { emoji: '🌍', label: 'globe world earth' }, { emoji: '🏠', label: 'home house' },
  { emoji: '🛒', label: 'shopping cart' }, { emoji: '💰', label: 'money bag' }, { emoji: '🎁', label: 'gift present' },
  { emoji: '🏆', label: 'trophy winner' }, { emoji: '👑', label: 'crown king' }, { emoji: '💎', label: 'gem diamond' },
  { emoji: '🔒', label: 'lock security' }, { emoji: '🔑', label: 'key' }, { emoji: '🛡️', label: 'shield protect' },
  { emoji: '📊', label: 'chart stats' }, { emoji: '📈', label: 'graph trending up' }, { emoji: '🗓️', label: 'calendar date' },
  { emoji: '⏰', label: 'clock time alarm' }, { emoji: '🌟', label: 'glowing star' }, { emoji: '✨', label: 'sparkles' },
  { emoji: '🎉', label: 'party celebration' }, { emoji: '🎪', label: 'circus tent' }, { emoji: '🎲', label: 'dice game' },
  { emoji: '🧩', label: 'puzzle' }, { emoji: '🤖', label: 'robot ai' }, { emoji: '👾', label: 'alien space invader' },
  { emoji: '🦊', label: 'fox' }, { emoji: '🐱', label: 'cat' }, { emoji: '🐶', label: 'dog' },
  { emoji: '☕', label: 'coffee' }, { emoji: '🍕', label: 'pizza food' }, { emoji: '🍎', label: 'apple fruit' },
  { emoji: '🌈', label: 'rainbow' }, { emoji: '☀️', label: 'sun' }, { emoji: '🌙', label: 'moon night' },
  { emoji: '🎸', label: 'guitar' }, { emoji: '🎧', label: 'headphones' }, { emoji: '📡', label: 'satellite signal' },
  { emoji: '🧪', label: 'test tube science' }, { emoji: '🔬', label: 'microscope' }, { emoji: '💊', label: 'pill medicine' },
  { emoji: '🚗', label: 'car' }, { emoji: '✈️', label: 'airplane travel' }, { emoji: '🚂', label: 'train' },
  { emoji: '📝', label: 'memo note' }, { emoji: '📌', label: 'pin' }, { emoji: '🏷️', label: 'tag label' },
];

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
}

interface AppRow {
  id: string;
  name: string;
  owner_id: string;
  is_public: boolean;
  updated_at: string;
}

interface OrgRow {
  id: string;
  name: string;
  owner_id: string;
}

interface AdRow {
  id: string;
  emoji: string;
  title: string;
  description: string;
  url: string;
  gradient: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export default function AdminPanel() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'apps' | 'orgs' | 'ads' | 'activity'>('users');

  // Add role
  const [addRoleUserId, setAddRoleUserId] = useState('');
  const [addRoleValue, setAddRoleValue] = useState<'admin' | 'moderator' | 'user'>('user');
  const [addingRole, setAddingRole] = useState(false);

  // Ad form
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<AdRow | null>(null);
  const [adForm, setAdForm] = useState({ emoji: '🚀', title: '', description: '', url: '', gradient: 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))' });
  const [savingAd, setSavingAd] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');

  // Management confirmations
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; type: 'user' | 'app' | 'org'; name: string } | null>(null);
  const [managingUser, setManagingUser] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [session]);

  async function checkAdmin() {
    if (!session?.user?.id) { setIsAdmin(false); return; }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin' as any);
    const hasAdmin = (data && data.length > 0);
    setIsAdmin(hasAdmin);
    if (hasAdmin) fetchAll();
    else setLoading(false);
  }

  async function fetchAll() {
    setLoading(true);
    const [profilesRes, rolesRes, appsRes, orgsRes, adsRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('apps').select('id, name, owner_id, is_public, updated_at').order('updated_at', { ascending: false }),
      supabase.from('organizations').select('id, name, owner_id'),
      supabase.from('ads' as any).select('*').order('sort_order', { ascending: true }),
      supabase.from('admin_activity_log' as any).select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as UserProfile[]);
    if (rolesRes.data) setRoles(rolesRes.data as unknown as UserRoleRow[]);
    if (appsRes.data) setApps(appsRes.data as unknown as AppRow[]);
    if (orgsRes.data) setOrgs(orgsRes.data as unknown as OrgRow[]);
    if (adsRes.data) setAds(adsRes.data as unknown as AdRow[]);
    if (logsRes.data) setActivityLogs(logsRes.data as any[]);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-list-users');
      if (!fnError && fnData) {
        setAuthUsers(fnData as AuthUser[]);
      }
    } catch { /* ignore */ }

    setLoading(false);
  }

  async function logAction(action: string, targetType: string, targetId?: string, details?: string) {
    if (!session?.user?.id) return;
    await (supabase.from('admin_activity_log' as any) as any).insert({
      admin_id: session.user.id,
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || '',
    });
  }

  async function removeRole(roleId: string) {
    const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      const roleName = roles.find(r => r.id === roleId);
      await logAction('Rol verwijderd', 'user', roleName?.user_id, `Rol: ${roleName?.role}`);
      setRoles(roles.filter(r => r.id !== roleId));
      toast({ title: 'Rol verwijderd' });
    }
  }

  async function addRole() {
    if (!addRoleUserId.trim()) return;
    setAddingRole(true);
    const { error } = await supabase.from('user_roles').insert({
      user_id: addRoleUserId.trim(),
      role: addRoleValue,
    } as any);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      await logAction('Rol toegevoegd', 'user', addRoleUserId.trim(), `Rol: ${addRoleValue}`);
      toast({ title: 'Rol toegevoegd!' });
      setAddRoleUserId('');
      fetchAll();
    }
    setAddingRole(false);
  }

  async function manageUser(userId: string, action: 'ban' | 'unban' | 'delete') {
    setManagingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { target_user_id: userId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const messages = { ban: 'Gebruiker geblokkeerd', unban: 'Gebruiker gedeblokkeerd', delete: 'Gebruiker verwijderd' };
      await logAction(messages[action], 'user', userId);
      toast({ title: messages[action] });
      setConfirmAction(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Fout', description: e.message, variant: 'destructive' });
    }
    setManagingUser(false);
  }

  function isUserBanned(userId: string): boolean {
    const authUser = authUsers.find(u => u.id === userId);
    return !!(authUser as any)?.banned_until && new Date((authUser as any).banned_until) > new Date();
  }

  function getUserEmail(userId: string) {
    return authUsers.find(u => u.id === userId)?.email || null;
  }

  function getUserName(userId: string) {
    const p = profiles.find(p => p.id === userId);
    if (p?.display_name) return p.display_name;
    const email = getUserEmail(userId);
    if (email) return email;
    return `${userId.slice(0, 8)}...`;
  }

  function getUserAvatar(userId: string) {
    return profiles.find(p => p.id === userId)?.avatar_url || null;
  }

  const roleIcon = (role: string) => {
    if (role === 'admin') return <Crown className="h-4 w-4 text-yellow-400" />;
    if (role === 'moderator') return <ShieldCheck className="h-4 w-4 text-primary" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  const roleLabel = (role: string) => {
    if (role === 'admin') return 'Admin';
    if (role === 'moderator') return 'Moderator';
    return 'Gebruiker';
  };

  // === Ad CRUD ===
  function openAdForm(ad?: AdRow) {
    if (ad) {
      setEditingAd(ad);
      setAdForm({ emoji: ad.emoji, title: ad.title, description: ad.description, url: ad.url, gradient: ad.gradient });
    } else {
      setEditingAd(null);
      setAdForm({ emoji: '🚀', title: '', description: '', url: '', gradient: 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))' });
    }
    setShowAdForm(true);
  }

  async function saveAd() {
    if (!adForm.title.trim()) return;
    setSavingAd(true);
    if (editingAd) {
      const { error } = await (supabase.from('ads' as any) as any).update({
        emoji: adForm.emoji,
        title: adForm.title,
        description: adForm.description,
        url: adForm.url,
        gradient: adForm.gradient,
      }).eq('id', editingAd.id);
      if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      else {
        await logAction('Advertentie bijgewerkt', 'ad', editingAd.id, adForm.title);
        toast({ title: 'Advertentie bijgewerkt!' });
      }
    } else {
      const { error } = await (supabase.from('ads' as any) as any).insert({
        emoji: adForm.emoji,
        title: adForm.title,
        description: adForm.description,
        url: adForm.url,
        gradient: adForm.gradient,
        sort_order: ads.length,
      });
      if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      else {
        await logAction('Advertentie aangemaakt', 'ad', undefined, adForm.title);
        toast({ title: 'Advertentie toegevoegd!' });
      }
    }
    setShowAdForm(false);
    setSavingAd(false);
    fetchAll();
  }

  async function toggleAdActive(ad: AdRow) {
    await (supabase.from('ads' as any) as any).update({ is_active: !ad.is_active }).eq('id', ad.id);
    await logAction(ad.is_active ? 'Advertentie gedeactiveerd' : 'Advertentie geactiveerd', 'ad', ad.id, ad.title);
    setAds(ads.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a));
  }

  async function deleteAd(id: string) {
    const ad = ads.find(a => a.id === id);
    const { error } = await (supabase.from('ads' as any) as any).delete().eq('id', id);
    if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    else {
      await logAction('Advertentie verwijderd', 'ad', id, ad?.title || '');
      setAds(ads.filter(a => a.id !== id));
      toast({ title: 'Advertentie verwijderd' });
    }
  }

  async function deleteApp(id: string) {
    const app = apps.find(a => a.id === id);
    const { error } = await supabase.from('apps').delete().eq('id', id);
    if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    else {
      await logAction('App verwijderd', 'app', id, app?.name || '');
      setApps(apps.filter(a => a.id !== id));
      toast({ title: 'App verwijderd' });
    }
  }

  async function deleteOrg(id: string) {
    const org = orgs.find(o => o.id === id);
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    else {
      await logAction('Bedrijf verwijderd', 'org', id, org?.name || '');
      setOrgs(orgs.filter(o => o.id !== id));
      toast({ title: 'Bedrijf verwijderd' });
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setManagingUser(true);
    try {
      if (confirmAction.type === 'user') {
        await manageUser(confirmAction.id, confirmAction.action as 'ban' | 'unban' | 'delete');
      } else if (confirmAction.type === 'app') {
        await deleteApp(confirmAction.id);
        setConfirmAction(null);
      } else if (confirmAction.type === 'org') {
        await deleteOrg(confirmAction.id);
        setConfirmAction(null);
      }
    } catch (e: any) {
      toast({ title: 'Fout', description: e.message, variant: 'destructive' });
    }
    setManagingUser(false);
  }

  const GRADIENT_PRESETS = [
    { label: 'Groen', value: 'linear-gradient(135deg, hsl(145 40% 14%), hsl(var(--secondary)))' },
    { label: 'Blauw', value: 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))' },
    { label: 'Paars', value: 'linear-gradient(135deg, hsl(280 40% 14%), hsl(var(--secondary)))' },
    { label: 'Goud', value: 'linear-gradient(135deg, hsl(40 40% 14%), hsl(var(--secondary)))' },
    { label: 'Rood', value: 'linear-gradient(135deg, hsl(0 40% 14%), hsl(var(--secondary)))' },
    { label: 'Roze', value: 'linear-gradient(135deg, hsl(330 40% 14%), hsl(var(--secondary)))' },
    { label: 'Cyaan', value: 'linear-gradient(135deg, hsl(180 40% 14%), hsl(var(--secondary)))' },
    { label: 'Oranje', value: 'linear-gradient(135deg, hsl(25 50% 14%), hsl(var(--secondary)))' },
    { label: 'Indigo', value: 'linear-gradient(135deg, hsl(240 40% 14%), hsl(var(--secondary)))' },
    { label: 'Lime', value: 'linear-gradient(135deg, hsl(80 40% 14%), hsl(var(--secondary)))' },
    { label: 'Magenta', value: 'linear-gradient(135deg, hsl(300 40% 14%), hsl(var(--secondary)))' },
    { label: 'Warm', value: 'linear-gradient(135deg, hsl(15 45% 16%), hsl(35 40% 12%))' },
    { label: 'Ocean', value: 'linear-gradient(135deg, hsl(210 50% 16%), hsl(190 40% 12%))' },
    { label: 'Sunset', value: 'linear-gradient(135deg, hsl(350 45% 16%), hsl(30 50% 12%))' },
    { label: 'Forest', value: 'linear-gradient(135deg, hsl(140 35% 14%), hsl(100 30% 10%))' },
    { label: 'Night', value: 'linear-gradient(135deg, hsl(250 35% 12%), hsl(220 40% 8%))' },
  ];

  if (isAdmin === null || loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4" style={{ background: 'hsl(var(--background))' }}>
        <Shield className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Geen toegang</h1>
        <p className="text-muted-foreground text-sm">Je hebt geen admin rechten.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Terug naar dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between backdrop-blur-sm" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">Admin Paneel</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-3 overflow-x-auto">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'users' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Users className="h-4 w-4" /> Gebruikers & Rollen
          </button>
          <button
            onClick={() => setTab('apps')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'apps' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <AppWindow className="h-4 w-4" /> Apps
          </button>
          <button
            onClick={() => setTab('orgs')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'orgs' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Building2 className="h-4 w-4" /> Bedrijven
          </button>
          <button
            onClick={() => setTab('ads')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'ads' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Megaphone className="h-4 w-4" /> Advertenties
          </button>
          <button
            onClick={() => setTab('activity')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === 'activity' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Activity className="h-4 w-4" /> Activiteit
          </button>
        </div>

        {/* Users & Roles tab */}
        {tab === 'users' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Rol toewijzen
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={addRoleUserId}
                  onChange={e => setAddRoleUserId(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecteer gebruiker...</option>
                  {profiles.map(p => {
                    const email = getUserEmail(p.id);
                    const label = p.display_name ? `${p.display_name} (${email || p.id.slice(0, 8)})` : email || p.id.slice(0, 12);
                    return <option key={p.id} value={p.id}>{label}</option>;
                  })}
                </select>
                <select
                  value={addRoleValue}
                  onChange={e => setAddRoleValue(e.target.value as any)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="user">Gebruiker</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={addRole}
                  disabled={addingRole || !addRoleUserId}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
                >
                  {addingRole ? 'Toevoegen...' : 'Toevoegen'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Alle gebruikers ({profiles.length})
              </h3>
              <div className="space-y-2">
                {profiles.map(profile => {
                  const userRoles = roles.filter(r => r.user_id === profile.id);
                  const email = getUserEmail(profile.id);
                  const authUser = authUsers.find(u => u.id === profile.id);
                  const displayLabel = profile.display_name || email || `${profile.id.slice(0, 12)}...`;
                  const initials = (profile.display_name || email || profile.id).slice(0, 2).toUpperCase();
                  return (
                    <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg px-4 py-3 bg-background/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                          <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{displayLabel}</p>
                          {email && profile.display_name && <p className="text-[11px] text-muted-foreground truncate">{email}</p>}
                          {profile.bio && <p className="text-[11px] text-muted-foreground truncate">{profile.bio}</p>}
                          <p className="text-[10px] text-muted-foreground">
                            {authUser?.last_sign_in_at ? `Laatst actief: ${new Date(authUser.last_sign_in_at).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Nog niet ingelogd'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {userRoles.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">Geen rollen</span>
                        )}
                        {userRoles.map(r => (
                          <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary text-xs font-medium text-foreground">
                            {roleIcon(r.role)}
                            {roleLabel(r.role)}
                            <button onClick={() => removeRole(r.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {isUserBanned(profile.id) && (
                          <span className="px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">Geblokkeerd</span>
                        )}
                        {/* Ban/Unban & Delete - only show for non-self users */}
                        {profile.id !== session?.user?.id && (
                          <div className="flex items-center gap-1 ml-1">
                            {isUserBanned(profile.id) ? (
                              <button
                                onClick={() => setConfirmAction({ id: profile.id, action: 'unban', type: 'user', name: displayLabel })}
                                className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Deblokkeren"
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmAction({ id: profile.id, action: 'ban', type: 'user', name: displayLabel })}
                                className="p-1 rounded-lg text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                                title="Blokkeren"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmAction({ id: profile.id, action: 'delete', type: 'user', name: displayLabel })}
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Verwijderen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Apps tab */}
        {tab === 'apps' && (
          <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <AppWindow className="h-4 w-4 text-accent" /> Alle apps ({apps.length})
            </h3>
            <div className="space-y-2">
              {apps.map(app => (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3 bg-background/50 hover:bg-secondary/30 transition-colors"
                >
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/editor/${app.id}`)}>
                    <p className="text-sm font-semibold text-foreground truncate">{app.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Eigenaar: {getUserName(app.owner_id)} · {app.is_public ? '🌍 Publiek' : '🔒 Privé'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(app.updated_at).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setConfirmAction({ id: app.id, action: 'delete', type: 'app', name: app.name })}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {apps.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Geen apps gevonden.</p>}
            </div>
          </div>
        )}

        {/* Orgs tab */}
        {tab === 'orgs' && (
          <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" /> Alle bedrijven ({orgs.length})
            </h3>
            <div className="space-y-2">
              {orgs.map(org => (
                <div key={org.id} className="flex items-center justify-between rounded-lg px-4 py-3 bg-background/50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{org.name}</p>
                    <p className="text-[11px] text-muted-foreground">Eigenaar: {getUserName(org.owner_id)}</p>
                  </div>
                  <button
                    onClick={() => setConfirmAction({ id: org.id, action: 'delete', type: 'org', name: org.name })}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Verwijderen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {orgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Geen bedrijven gevonden.</p>}
            </div>
          </div>
        )}

        {/* Ads tab */}
        {tab === 'ads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" /> Advertenties ({ads.length})
              </h3>
              <button
                onClick={() => openAdForm()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" /> Nieuwe ad
              </button>
            </div>

            <div className="space-y-2">
              {ads.map(ad => (
                <div
                  key={ad.id}
                  className="rounded-xl border border-border/50 overflow-hidden"
                  style={{ background: 'hsl(var(--card))' }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
                      style={{ background: ad.gradient }}
                    >
                      {ad.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{ad.title}</p>
                        {!ad.is_active && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Inactief</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{ad.description}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{ad.url}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleAdActive(ad)}
                        className={`p-1.5 rounded-lg transition-colors ${ad.is_active ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-secondary/50'}`}
                        title={ad.is_active ? 'Deactiveren' : 'Activeren'}
                      >
                        {ad.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => openAdForm(ad)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        title="Bewerken"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteAd(ad.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {ads.length === 0 && (
                <div className="rounded-xl border border-border/50 p-8 text-center" style={{ background: 'hsl(var(--card))' }}>
                  <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nog geen advertenties. Klik op "Nieuwe ad" om er een aan te maken.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity tab */}
        {tab === 'activity' && (
          <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Recente activiteiten ({activityLogs.length})
            </h3>
            {activityLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nog geen activiteiten gelogd.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityLogs.map((log: any) => {
                  const adminName = getUserName(log.admin_id);
                  const targetName = log.target_id ? getUserName(log.target_id) : null;
                  const time = new Date(log.created_at);
                  const timeStr = time.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  
                  const actionIcons: Record<string, JSX.Element> = {
                    'Rol toegevoegd': <UserPlus className="h-3.5 w-3.5 text-primary" />,
                    'Rol verwijderd': <Trash2 className="h-3.5 w-3.5 text-orange-500" />,
                    'Gebruiker geblokkeerd': <Ban className="h-3.5 w-3.5 text-orange-500" />,
                    'Gebruiker gedeblokkeerd': <ShieldOff className="h-3.5 w-3.5 text-primary" />,
                    'Gebruiker verwijderd': <Trash2 className="h-3.5 w-3.5 text-destructive" />,
                    'Advertentie aangemaakt': <Plus className="h-3.5 w-3.5 text-primary" />,
                    'Advertentie bijgewerkt': <Pencil className="h-3.5 w-3.5 text-primary" />,
                    'Advertentie verwijderd': <Trash2 className="h-3.5 w-3.5 text-destructive" />,
                    'Advertentie geactiveerd': <Eye className="h-3.5 w-3.5 text-primary" />,
                    'Advertentie gedeactiveerd': <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />,
                  };

                  return (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-background/50 hover:bg-secondary/20 transition-colors">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-secondary/60 shrink-0">
                        {actionIcons[log.action] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{adminName}</span>
                          {' '}<span className="text-muted-foreground">{log.action.toLowerCase()}</span>
                          {targetName && log.target_type === 'user' && (
                            <>{' '}<span className="font-medium">{targetName}</span></>
                          )}
                          {log.details && (
                            <span className="text-muted-foreground"> · {log.details}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timeStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          <div className="rounded-xl border border-border/50 p-4 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-2xl font-bold text-foreground font-mono">{profiles.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Gebruikers</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-2xl font-bold text-foreground font-mono">{apps.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Apps</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-2xl font-bold text-foreground font-mono">{orgs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Bedrijven</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4 text-center" style={{ background: 'hsl(var(--card))' }}>
            <p className="text-2xl font-bold text-foreground font-mono">{ads.filter(a => a.is_active).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Actieve ads</p>
          </div>
        </div>
      </div>

      {/* Ad form dialog */}
      {showAdForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAdForm(false)}>
          <div className="rounded-2xl border border-border/50 p-5 sm:p-6 w-full max-w-lg shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {editingAd ? 'Advertentie bewerken' : 'Nieuwe advertentie'}
            </h3>

            {/* Preview */}
            <div className="rounded-xl border border-border/50 overflow-hidden mb-4" style={{ background: adForm.gradient }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                  <span className="text-lg">{adForm.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{adForm.title || 'Titel...'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{adForm.description || 'Beschrijving...'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-20 relative">
                  <label className="text-xs font-medium text-foreground uppercase tracking-wide">Emoji</label>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg text-center focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1 hover:bg-secondary/30 transition-colors"
                  >
                    {adForm.emoji}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-1 z-[60] rounded-xl border border-border/50 shadow-2xl w-72" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
                      <div className="p-2 border-b border-border/50">
                        <input
                          type="text"
                          placeholder="Zoek emoji..."
                          value={emojiSearch}
                          onChange={e => setEmojiSearch(e.target.value)}
                          autoFocus
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="p-2 grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
                        {EMOJI_LIST
                          .filter(e => e.label.toLowerCase().includes(emojiSearch.toLowerCase()))
                          .map(e => (
                            <button
                              key={e.emoji}
                              onClick={() => { setAdForm({ ...adForm, emoji: e.emoji }); setShowEmojiPicker(false); setEmojiSearch(''); }}
                              className={`p-1.5 rounded-lg text-lg hover:bg-secondary/60 transition-colors ${adForm.emoji === e.emoji ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
                              title={e.label}
                            >
                              {e.emoji}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground uppercase tracking-wide">Titel</label>
                  <input
                    type="text"
                    placeholder="Bv. Mijn Coole App"
                    value={adForm.title}
                    onChange={e => setAdForm({ ...adForm, title: e.target.value })}
                    autoFocus
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">Beschrijving</label>
                <input
                  type="text"
                  placeholder="Korte beschrijving van de ad"
                  value={adForm.description}
                  onChange={e => setAdForm({ ...adForm, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={adForm.url}
                  onChange={e => setAdForm({ ...adForm, url: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">Kleur</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {GRADIENT_PRESETS.map(g => (
                    <button
                      key={g.label}
                      onClick={() => setAdForm({ ...adForm, gradient: g.value })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${adForm.gradient === g.value ? 'border-primary ring-2 ring-primary/30' : 'border-border/50'}`}
                      style={{ background: g.value }}
                      title={g.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAdForm(false)} className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
              <button
                onClick={saveAd}
                disabled={savingAd || !adForm.title.trim()}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
              >
                {savingAd ? 'Opslaan...' : editingAd ? 'Bijwerken' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm ban/delete dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setConfirmAction(null)}>
          <div className="rounded-2xl border border-border/50 p-5 sm:p-6 w-full max-w-sm shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${confirmAction.action === 'delete' ? 'bg-destructive/15' : confirmAction.action === 'ban' ? 'bg-orange-500/15' : 'bg-primary/15'}`}>
                {confirmAction.action === 'delete' ? <Trash2 className="h-5 w-5 text-destructive" /> :
                 confirmAction.action === 'ban' ? <Ban className="h-5 w-5 text-orange-500" /> :
                 <ShieldOff className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {confirmAction.action === 'delete' ? 'Gebruiker verwijderen' :
                   confirmAction.action === 'ban' ? 'Gebruiker blokkeren' : 'Gebruiker deblokkeren'}
                </h3>
                <p className="text-xs text-muted-foreground">{confirmAction.name}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {confirmAction.action === 'delete'
                ? 'Weet je zeker dat je deze gebruiker wilt verwijderen? Dit kan niet ongedaan worden gemaakt. Alle data van deze gebruiker wordt verwijderd.'
                : confirmAction.action === 'ban'
                ? 'Deze gebruiker wordt geblokkeerd en kan niet meer inloggen.'
                : 'Deze gebruiker wordt gedeblokkeerd en kan weer inloggen.'}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
              <button
                onClick={() => manageUser(confirmAction.userId, confirmAction.action)}
                disabled={managingUser}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 ${
                  confirmAction.action === 'delete'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : confirmAction.action === 'ban'
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {managingUser ? 'Bezig...' :
                 confirmAction.action === 'delete' ? 'Verwijderen' :
                 confirmAction.action === 'ban' ? 'Blokkeren' : 'Deblokkeren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
