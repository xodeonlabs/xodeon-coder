import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Code2, Users, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface ProfileStats {
  appCount: number;
  orgCount: number;
  totalViews: number;
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ appCount: 0, orgCount: 0, totalViews: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, created_at')
        .eq('id', userId)
        .single();

      if (error || !prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(prof);

      // Fetch stats in parallel
      const [appsRes, orgsRes] = await Promise.all([
        supabase
          .from('apps')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', userId)
          .eq('is_public', true),
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      const appCount = appsRes.count ?? 0;

      // Get total views for public apps
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
      });

      setLoading(false);
    }

    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 backdrop-blur-sm" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-40" />
        </header>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">Profiel niet gevonden</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary hover:underline">Ga terug</button>
      </div>
    );
  }

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : '??';

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), 'd MMMM yyyy', { locale: nl })
    : '';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 backdrop-blur-sm" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">Profiel</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="h-24 w-24 border-4 border-primary/20">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name || 'Avatar'} />
            ) : null}
            <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {profile?.display_name || 'Anonieme gebruiker'}
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 justify-center mt-1">
              <Calendar className="h-3.5 w-3.5" />
              Lid sinds {memberSince}
            </p>
          </div>
          {profile?.bio && (
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{profile.bio}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 flex flex-col items-center gap-1.5">
              <Code2 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{stats.appCount}</span>
              <span className="text-xs text-muted-foreground">Publieke apps</span>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex flex-col items-center gap-1.5">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{stats.orgCount}</span>
              <span className="text-xs text-muted-foreground">Bedrijven</span>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex flex-col items-center gap-1.5">
              <Eye className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{stats.totalViews}</span>
              <span className="text-xs text-muted-foreground">App views</span>
            </CardContent>
          </Card>
        </div>

        {/* Public apps listing */}
        <PublicApps userId={userId!} />
      </div>
    </div>
  );
}

function PublicApps({ userId }: { userId: string }) {
  const [apps, setApps] = useState<Array<{ id: string; name: string; icon: string | null; slug: string | null }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('apps')
      .select('id, name, icon, slug')
      .eq('owner_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setApps(data);
      });
  }, [userId]);

  if (apps.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Publieke Apps</h3>
      <div className="grid gap-2">
        {apps.map(app => (
          <button
            key={app.id}
            onClick={() => app.slug ? navigate(`/app/${app.slug}`) : null}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-all text-left"
          >
            <Badge variant="secondary" className="text-base px-2 py-1">{app.icon || '📱'}</Badge>
            <span className="text-sm font-medium text-foreground">{app.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
