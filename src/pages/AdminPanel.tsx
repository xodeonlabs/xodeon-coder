import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, Users, Trash2, UserPlus, Crown, ShieldCheck, User, Building2, AppWindow, BarChart3 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'apps' | 'orgs'>('users');

  // Add role
  const [addRoleUserId, setAddRoleUserId] = useState('');
  const [addRoleValue, setAddRoleValue] = useState<'admin' | 'moderator' | 'user'>('user');
  const [addingRole, setAddingRole] = useState(false);

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
    const [profilesRes, rolesRes, appsRes, orgsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('apps').select('id, name, owner_id, is_public, updated_at').order('updated_at', { ascending: false }),
      supabase.from('organizations').select('id, name, owner_id'),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as UserProfile[]);
    if (rolesRes.data) setRoles(rolesRes.data as unknown as UserRoleRow[]);
    if (appsRes.data) setApps(appsRes.data as unknown as AppRow[]);
    if (orgsRes.data) setOrgs(orgsRes.data as unknown as OrgRow[]);

    // Fetch auth users (emails) via edge function
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-list-users');
      if (!fnError && fnData) {
        setAuthUsers(fnData as AuthUser[]);
      }
    } catch { /* ignore */ }

    setLoading(false);
  }

  async function removeRole(roleId: string) {
    const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
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
      toast({ title: 'Rol toegevoegd!' });
      setAddRoleUserId('');
      fetchAll();
    }
    setAddingRole(false);
  }

  function getUserName(userId: string) {
    const p = profiles.find(p => p.id === userId);
    return p?.display_name || `${userId.slice(0, 8)}...`;
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
        <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-3">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'users' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Users className="h-4 w-4" /> Gebruikers & Rollen
          </button>
          <button
            onClick={() => setTab('apps')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'apps' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <AppWindow className="h-4 w-4" /> Apps
          </button>
          <button
            onClick={() => setTab('orgs')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'orgs' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            <Building2 className="h-4 w-4" /> Bedrijven
          </button>
        </div>

        {/* Users & Roles tab */}
        {tab === 'users' && (
          <div className="space-y-6">
            {/* Add role form */}
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
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name || p.id.slice(0, 12)}</option>
                  ))}
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

            {/* Profiles list */}
            <div className="rounded-xl border border-border/50 p-5" style={{ background: 'hsl(var(--card))' }}>
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Alle gebruikers ({profiles.length})
              </h3>
              <div className="space-y-2">
                {profiles.map(profile => {
                  const userRoles = roles.filter(r => r.user_id === profile.id);
                  return (
                    <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg px-4 py-3 bg-background/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                          <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">
                            {(profile.display_name || profile.id).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{profile.display_name || `${profile.id.slice(0, 12)}...`}</p>
                          {profile.bio && <p className="text-[11px] text-muted-foreground truncate">{profile.bio}</p>}
                          <p className="text-[10px] text-muted-foreground font-mono">{profile.id.slice(0, 12)}...</p>
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
                  onClick={() => navigate(`/editor/${app.id}`)}
                  className="flex items-center justify-between rounded-lg px-4 py-3 bg-background/50 cursor-pointer hover:bg-secondary/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{app.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Eigenaar: {getUserName(app.owner_id)} · {app.is_public ? '🌍 Publiek' : '🔒 Privé'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(app.updated_at).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}
                  </span>
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
                </div>
              ))}
              {orgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Geen bedrijven gevonden.</p>}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
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
        </div>
      </div>
    </div>
  );
}
