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
  const [apps, setApps] = useState<Array<{
    id: string;
    name: string;
    icon: string | null;
    slug: string | null;
    created_at: string;
    ngc_code: string;
  }>>([]);
  const [appImages, setAppImages] = useState<Record<string, string[]>>({});
  const [appViews, setAppViews] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('apps')
        .select('id, name, icon, slug, created_at, ngc_code')
        .eq('owner_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!data || data.length === 0) return;
      setApps(data);

      // Load screenshots from app-images bucket for each app
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

      // Load view counts
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
    }
    load();
  }, [userId]);

  if (apps.length === 0) return null;

  // Extract a simple description from NGC code (first Text element's Tekst value)
  function extractDescription(code: string): string | null {
    const match = code.match(/Tekst="([^"]{10,120})"/);
    return match ? match[1] : null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Publieke Apps</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map(app => {
          const images = appImages[app.id] || [];
          const views = appViews[app.id] ?? 0;
          const desc = extractDescription(app.ngc_code);
          const date = new Date(app.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });

          return (
            <div
              key={app.id}
              onClick={() => app.slug ? navigate(`/app/${app.slug}`) : null}
              className={`group rounded-xl border border-border/50 bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${app.slug ? 'cursor-pointer' : ''}`}
            >
              {/* Screenshot area */}
              {images.length > 0 ? (
                <div className="aspect-video bg-muted/30 overflow-hidden relative">
                  <img
                    src={images[0]}
                    alt={`Screenshot van ${app.name}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {images.length > 1 && (
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {images.slice(1, 3).map((img, i) => (
                        <div key={i} className="w-8 h-8 rounded border border-background/80 overflow-hidden shadow-sm">
                          <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                  <span className="text-4xl opacity-50">{app.icon || '📱'}</span>
                </div>
              )}

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-lg">{app.icon || '📱'}</span>
                  <h4 className="text-sm font-bold text-foreground truncate flex-1">{app.name}</h4>
                </div>
                {desc && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{desc}</p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {date}
                  </span>
                  {app.slug && (
                    <span className="ml-auto text-primary/60 text-[10px] font-mono">/{app.slug}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}