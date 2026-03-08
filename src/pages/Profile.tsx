import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Code2, Users, Eye, ExternalLink, Settings, Sparkles, Mail, Globe, Heart, Camera, Pencil } from 'lucide-react';
import { FriendButton } from '@/components/FriendButton';
import { FriendsList } from '@/components/FriendsList';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { StatusDot, getOnlineStatus, getLastSeenText } from '@/components/StatusDot';
import { AppIcon, IconPicker } from '@/components/IconPicker';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  username: string | null;
  social_links: Record<string, string> | null;
  show_email: boolean;
  email?: string;
  is_dnd?: boolean;
  last_seen_at?: string | null;
  banner_url?: string | null;
}

interface ProfileStats {
  appCount: number;
  orgCount: number;
  totalViews: number;
  friendCount: number;
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ appCount: 0, orgCount: 0, totalViews: 0, friendCount: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isOwnProfile = session?.user?.id === profile?.id;

  useEffect(() => {
    if (!username) return;

    async function load() {
      setLoading(true);

      let prof: ProfileData | null = null;
      let error: any = null;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);

      if (isUuid) {
        const res = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, created_at, username, social_links, show_email, public_email, is_dnd, last_seen_at, banner_url')
          .eq('id', username)
          .single();
        prof = res.data ? { ...res.data, email: (res.data as any).public_email, is_dnd: (res.data as any).is_dnd, last_seen_at: (res.data as any).last_seen_at, banner_url: (res.data as any).banner_url } as ProfileData : null;
        error = res.error;
      } else {
        const res = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, created_at, username, social_links, show_email, public_email, is_dnd, last_seen_at, banner_url')
          .eq('username', username)
          .single();
        prof = res.data ? { ...res.data, email: (res.data as any).public_email, is_dnd: (res.data as any).is_dnd, last_seen_at: (res.data as any).last_seen_at, banner_url: (res.data as any).banner_url } as ProfileData : null;
        error = res.error;
      }

      if (error || !prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(prof);
      const userId = prof.id;

      const [appsRes, orgsRes, friendsRes] = await Promise.all([
        supabase
          .from('apps')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', userId)
          .eq('is_public', true),
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      ]);

      const appCount = appsRes.count ?? 0;

      let totalViews = 0;
      if (appCount > 0) {
        const { data: apps } = await supabase
          .from('apps')
          .select('id')
          .eq('owner_id', userId)
          .eq('is_public', true);

        if (apps && apps.length > 0) {
          const { count } = await supabase
            .from('app_views')
            .select('id', { count: 'exact', head: true })
            .in('app_id', apps.map(a => a.id));
          totalViews = count ?? 0;
        }
      }

      setStats({
        appCount,
        orgCount: orgsRes.count ?? 0,
        totalViews,
        friendCount: friendsRes.count ?? 0,
      });

      setLoading(false);
    }

    load();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-48 sm:h-64">
          <Skeleton className="absolute inset-0 rounded-none" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
            <Skeleton className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-background" />
            <div className="flex-1 space-y-3 pb-4 text-center sm:text-left">
              <Skeleton className="h-8 w-48 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-64 mx-auto sm:mx-0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="text-6xl">👻</div>
        <h2 className="text-xl font-bold text-foreground font-display">Profiel niet gevonden</h2>
        <p className="text-sm text-muted-foreground">Dit profiel bestaat niet of is verwijderd.</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Ga terug
        </button>
      </div>
    );
  }

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : '??';

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), 'd MMMM yyyy', { locale: nl })
    : '';

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Te groot', description: 'Maximaal 5MB', variant: 'destructive' });
      return;
    }
    setUploadingBanner(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${session.user.id}/banner.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl } as any)
        .eq('id', session.user.id);
      if (updateErr) throw updateErr;
      setProfile(prev => prev ? { ...prev, banner_url: publicUrl } : prev);
      toast({ title: '✅ Banner bijgewerkt!' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
    setUploadingBanner(false);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-48 sm:h-64 overflow-hidden">
        {/* Banner image or gradient fallback */}
        {profile?.banner_url ? (
          <img src={profile.banner_url} alt="Profielbanner" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5" />
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/10 blur-[100px]" />
              <div className="absolute top-0 right-0 w-[400px] h-[200px] rounded-full bg-accent/8 blur-[80px]" />
            </div>
          </>
        )}
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 px-4 sm:px-6 py-3 flex items-center justify-between z-20">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-background/30 backdrop-blur-md text-foreground/80 hover:bg-background/50 hover:text-foreground transition-all border border-border/20"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/30 backdrop-blur-md text-foreground/80 hover:bg-background/50 hover:text-foreground transition-all border border-border/20 text-xs font-medium"
              >
                {uploadingBanner ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-foreground/30 border-t-foreground" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{profile?.banner_url ? 'Banner wijzigen' : 'Banner toevoegen'}</span>
              </button>
            )}
            {isOwnProfile && (
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/30 backdrop-blur-md text-foreground/80 hover:bg-background/50 hover:text-foreground transition-all border border-border/20 text-xs font-medium"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bewerk profiel</span>
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerUpload}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-16 sm:-mt-20 z-10 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 blur-sm" />
              <Avatar className="relative h-28 w-28 sm:h-32 sm:w-32 border-4 border-background ring-2 ring-primary/20">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.display_name || 'Avatar'} className="object-cover" />
                ) : null}
                <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-primary/30 to-accent/20 text-primary font-display">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <StatusDot status={getOnlineStatus(profile?.is_dnd ?? false, (profile as any)?.last_seen_at)} size="lg" className="absolute bottom-1 right-1" />
            </div>

            <div className="flex-1 text-center sm:text-left pb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display tracking-tight">
                {profile?.display_name || 'Anonieme gebruiker'}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                <span className={`inline-block h-2 w-2 rounded-full ${getOnlineStatus(profile?.is_dnd ?? false, (profile as any)?.last_seen_at) === 'online' ? 'bg-emerald-500' : getOnlineStatus(profile?.is_dnd ?? false, (profile as any)?.last_seen_at) === 'dnd' ? 'bg-destructive' : 'bg-muted-foreground/50'}`} />
                {getLastSeenText(getOnlineStatus(profile?.is_dnd ?? false, (profile as any)?.last_seen_at), (profile as any)?.last_seen_at)}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start mt-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Lid sinds {memberSince}
              </p>
              {profile?.bio && (
                <p className="mt-3 text-sm text-muted-foreground/90 max-w-lg leading-relaxed">
                  {profile.bio}
                </p>
              )}
              <SocialBar profile={profile!} />
              <div className="mt-3 flex justify-center sm:justify-start">
                <FriendButton targetUserId={profile!.id} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          <StatCard icon={<Code2 className="h-5 w-5 sm:h-6 sm:w-6" />} value={stats.appCount} label="Publieke apps" color="primary" />
          <StatCard icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />} value={stats.orgCount} label="Bedrijven" color="accent" />
          <StatCard icon={<Heart className="h-5 w-5 sm:h-6 sm:w-6" />} value={stats.friendCount} label="Vrienden" color="accent" />
          <StatCard icon={<Eye className="h-5 w-5 sm:h-6 sm:w-6" />} value={stats.totalViews} label="App views" color="primary" />
        </div>

        <FriendsList userId={profile!.id} />
        <ActivityTimeline userId={profile!.id} />
        <PublicApps userId={profile!.id} isOwner={isOwnProfile} />
        <div className="h-12" />
      </div>
    </div>
  );
}

const SOCIAL_CONFIG: Record<string, { icon: string; urlPrefix: string; label: string }> = {
  instagram: { icon: '📸', urlPrefix: 'https://instagram.com/', label: 'Instagram' },
  twitter: { icon: '𝕏', urlPrefix: 'https://x.com/', label: 'X' },
  github: { icon: '💻', urlPrefix: 'https://github.com/', label: 'GitHub' },
  linkedin: { icon: '💼', urlPrefix: '', label: 'LinkedIn' },
  youtube: { icon: '🎬', urlPrefix: '', label: 'YouTube' },
  website: { icon: '🌐', urlPrefix: '', label: 'Website' },
};

function SocialBar({ profile }: { profile: ProfileData }) {
  const socials = profile.social_links || {};
  const entries = Object.entries(socials).filter(([, v]) => v && v.trim());
  const showEmailOnProfile = profile.show_email && profile.email;

  if (entries.length === 0 && !showEmailOnProfile) return null;

  function getSocialUrl(key: string, value: string): string {
    const config = SOCIAL_CONFIG[key];
    if (!config) return value;
    if (value.startsWith('http')) return value;
    if (config.urlPrefix) return `${config.urlPrefix}${value.replace('@', '')}`;
    return value;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
      {showEmailOnProfile && (
        <a
          href={`mailto:${profile.email}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/30 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
        >
          <Mail className="h-3 w-3" />
          {profile.email}
        </a>
      )}
      {entries.map(([key, value]) => {
        const config = SOCIAL_CONFIG[key] || { icon: '🔗', urlPrefix: '', label: key };
        const url = getSocialUrl(key, value);
        const isLink = url.startsWith('http');
        const display = value.startsWith('http') ? config.label : `@${value.replace('@', '')}`;

        return isLink ? (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/30 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
          >
            <span className="text-sm">{config.icon}</span>
            {display}
          </a>
        ) : (
          <span
            key={key}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/30 text-xs text-muted-foreground"
          >
            <span className="text-sm">{config.icon}</span>
            {display}
          </span>
        );
      })}
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: 'primary' | 'accent' }) {
  const gradientClass = color === 'primary'
    ? 'from-primary/15 to-primary/5'
    : 'from-accent/15 to-accent/5';
  const iconClass = color === 'primary' ? 'text-primary' : 'text-accent';
  const glowClass = color === 'primary' ? 'bg-primary/10' : 'bg-accent/10';

  return (
    <div className="relative group">
      <div className={`absolute inset-0 ${glowClass} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className={`relative rounded-2xl border border-border/50 bg-gradient-to-br ${gradientClass} p-4 sm:p-5 text-center transition-all hover:border-border/80 hover:shadow-lg`}>
        <div className={`${iconClass} mb-2 flex justify-center opacity-70`}>{icon}</div>
        <div className="text-2xl sm:text-3xl font-bold text-foreground font-display tabular-nums">{value.toLocaleString('nl-NL')}</div>
        <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">{label}</div>
      </div>
    </div>
  );
}

function PublicApps({ userId, isOwner = false }: { userId: string; isOwner?: boolean }) {
  const [apps, setApps] = useState<Array<{
    id: string;
    name: string;
    icon: string | null;
    slug: string | null;
    created_at: string;
    ngc_code: string;
    banner_url: string | null;
  }>>([]);
  const [appImages, setAppImages] = useState<Record<string, string[]>>({});
  const [appViews, setAppViews] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [iconPickerApp, setIconPickerApp] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState<string | null>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [bannerAppId, setBannerAppId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('apps')
        .select('id, name, icon, slug, created_at, ngc_code, banner_url')
        .eq('owner_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }
      setApps(data as any);

      const imageMap: Record<string, string[]> = {};
      await Promise.all(
        data.map(async (app) => {
          const { data: files } = await supabase.storage
            .from('app-images')
            .list(app.id, { limit: 3, sortBy: { column: 'created_at', order: 'desc' } });
          if (files && files.length > 0) {
            imageMap[app.id] = files
              .filter(f => f.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i))
              .map(f => supabase.storage.from('app-images').getPublicUrl(`${app.id}/${f.name}`).data.publicUrl);
          }
        })
      );
      setAppImages(imageMap);

      const appIds = data.map(a => a.id);
      const viewMap: Record<string, number> = {};
      await Promise.all(
        appIds.map(async (id) => {
          const { count } = await supabase
            .from('app_views')
            .select('id', { count: 'exact', head: true })
            .eq('app_id', id);
          viewMap[id] = count ?? 0;
        })
      );
      setAppViews(viewMap);
      setLoading(false);
    }
    load();
  }, [userId]);

  function extractDescription(code: string): string | null {
    const match = code.match(/Tekst="([^"]{10,120})"/);
    return match ? match[1] : null;
  }

  async function handleIconChange(appId: string, icon: string) {
    const { error } = await supabase.from('apps').update({ icon }).eq('id', appId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }
    setApps(prev => prev.map(a => a.id === appId ? { ...a, icon } : a));
    toast({ title: '✅ Icoon bijgewerkt!' });
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bannerAppId) return;

    if (file.size > 4 * 1024 * 1024) {
      toast({ title: 'Te groot', description: 'Maximaal 4MB', variant: 'destructive' });
      return;
    }

    setUploadingBanner(bannerAppId);
    try {
      const ext = file.name.split('.').pop();
      const path = `${bannerAppId}/banner.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('app-images')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('app-images').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from('apps')
        .update({ banner_url: publicUrl } as any)
        .eq('id', bannerAppId);
      if (updateErr) throw updateErr;

      setApps(prev => prev.map(a => a.id === bannerAppId ? { ...a, banner_url: publicUrl } : a));
      toast({ title: '✅ Banner bijgewerkt!' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
    setUploadingBanner(null);
    setBannerAppId(null);
    if (bannerRef.current) bannerRef.current.value = '';
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">Publieke Apps</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/50 p-8 sm:p-12 text-center">
        <div className="text-4xl mb-3 opacity-40">📱</div>
        <p className="text-sm text-muted-foreground">Nog geen publieke apps</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">Publieke Apps</h3>
        <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">{apps.length}</span>
      </div>

      <input
        ref={bannerRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBannerUpload}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app, idx) => {
          const images = appImages[app.id] || [];
          const views = appViews[app.id] ?? 0;
          const desc = extractDescription(app.ngc_code);
          const date = new Date(app.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
          const bannerSrc = app.banner_url || (images.length > 0 ? images[0] : null);

          return (
            <div
              key={app.id}
              onClick={() => !iconPickerApp && app.slug ? navigate(`/app/${app.slug}`) : null}
              className={`group relative rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 ${app.slug && !iconPickerApp ? 'cursor-pointer' : ''} animate-slide-up`}
              style={{ animationDelay: `${Math.min(idx * 80, 400)}ms` }}
            >
              {/* Banner area */}
              {bannerSrc ? (
                <div className="aspect-[16/10] bg-muted/20 overflow-hidden relative">
                  <img
                    src={bannerSrc}
                    alt={`Banner van ${app.name}`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
                  {app.slug && (
                    <div className="absolute top-3 left-3 p-1.5 rounded-lg bg-background/60 backdrop-blur-md text-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {isOwner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setBannerAppId(app.id); bannerRef.current?.click(); }}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-background/60 backdrop-blur-md text-foreground/70 hover:bg-background/80 hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
                      title="Banner wijzigen"
                    >
                      {uploadingBanner === app.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground/30 border-t-foreground" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="aspect-[16/10] bg-gradient-to-br from-primary/8 via-accent/5 to-muted/10 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
                    backgroundSize: '20px 20px',
                  }} />
                  <AppIcon iconName={app.icon || 'file-code'} size={48} className="opacity-30 group-hover:scale-110 transition-transform duration-500 text-muted-foreground" />
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
                  {isOwner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setBannerAppId(app.id); bannerRef.current?.click(); }}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-background/60 backdrop-blur-md text-foreground/70 hover:bg-background/80 hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
                      title="Banner toevoegen"
                    >
                      {uploadingBanner === app.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground/30 border-t-foreground" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className={`relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/10 flex items-center justify-center shrink-0 ${isOwner ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`}
                    onClick={(e) => { if (isOwner) { e.stopPropagation(); setIconPickerApp(app.id); } }}
                    title={isOwner ? 'Icoon wijzigen' : undefined}
                  >
                    <AppIcon iconName={app.icon || 'file-code'} size={16} className="text-primary/70" />
                    {isOwner && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-2 w-2 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-foreground font-display truncate flex-1">{app.name}</h4>
                </div>

                {desc && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed pl-[42px]">{desc}</p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-3 border-t border-border/30">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {views.toLocaleString('nl-NL')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {date}
                  </span>
                  {app.slug && (
                    <span className="ml-auto px-2 py-0.5 rounded-md bg-primary/8 text-primary/70 text-[10px] font-mono font-medium">
                      /{app.slug}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {iconPickerApp && (
        <IconPicker
          value={apps.find(a => a.id === iconPickerApp)?.icon || 'file-code'}
          onChange={(icon) => handleIconChange(iconPickerApp, icon)}
          onClose={() => setIconPickerApp(null)}
        />
      )}
    </div>
  );
}
