import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Eye, TrendingUp, BarChart3, Globe, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AppWithViews {
  id: string;
  name: string;
  slug: string | null;
  is_public: boolean;
  total_views: number;
}

interface DailyView {
  date: string;
  views: number;
}

export default function Analytics() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppWithViews[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) loadAnalytics();
  }, [session?.user?.id]);

  async function loadAnalytics() {
    setLoading(true);

    // Get user's public apps
    const { data: userApps } = await supabase
      .from('apps')
      .select('id, name, slug, is_public')
      .eq('owner_id', session?.user?.id || '')
      .order('name');

    if (!userApps || userApps.length === 0) {
      setApps([]);
      setLoading(false);
      return;
    }

    // Get view counts per app
    const appIds = userApps.map(a => a.id);
    const { data: views } = await supabase
      .from('app_views')
      .select('app_id, viewed_at')
      .in('app_id', appIds);

    // Calculate totals
    const viewCounts: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};

    (views || []).forEach(v => {
      viewCounts[v.app_id] = (viewCounts[v.app_id] || 0) + 1;
      const day = new Date(v.viewed_at).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });

    const appsWithViews: AppWithViews[] = userApps.map(a => ({
      ...a,
      total_views: viewCounts[a.id] || 0,
    }));

    appsWithViews.sort((a, b) => b.total_views - a.total_views);
    setApps(appsWithViews);

    // Build last 30 days data
    const days: DailyView[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, views: dailyMap[key] || 0 });
    }
    setDailyViews(days);
    setLoading(false);
  }

  // Filter daily views for selected app
  useEffect(() => {
    if (!selectedAppId) {
      loadAnalytics();
      return;
    }

    (async () => {
      const { data: views } = await supabase
        .from('app_views')
        .select('viewed_at')
        .eq('app_id', selectedAppId);

      const dailyMap: Record<string, number> = {};
      (views || []).forEach(v => {
        const day = new Date(v.viewed_at).toISOString().split('T')[0];
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      });

      const days: DailyView[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        days.push({ date: key, views: dailyMap[key] || 0 });
      }
      setDailyViews(days);
    })();
  }, [selectedAppId]);

  const totalViews = useMemo(() => apps.reduce((sum, a) => sum + a.total_views, 0), [apps]);
  const publicApps = useMemo(() => apps.filter(a => a.is_public).length, [apps]);
  const todayViews = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return dailyViews.find(d => d.date === today)?.views || 0;
  }, [dailyViews]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <button onClick={() => navigate('/')} className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground">Analytics</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Statistieken van je gepubliceerde apps</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border/40 p-5" style={{ background: 'hsl(var(--card))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Totaal views</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalViews}</p>
          </div>
          <div className="rounded-xl border border-border/40 p-5" style={{ background: 'hsl(var(--card))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Vandaag</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{todayViews}</p>
          </div>
          <div className="rounded-xl border border-border/40 p-5" style={{ background: 'hsl(var(--card))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Globe className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Publieke apps</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{publicApps}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border/40 p-6 mb-8" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Views afgelopen 30 dagen
              {selectedAppId && (
                <span className="text-muted-foreground font-normal ml-2">
                  — {apps.find(a => a.id === selectedAppId)?.name}
                </span>
              )}
            </h2>
            {selectedAppId && (
              <button
                onClick={() => setSelectedAppId(null)}
                className="text-xs text-primary hover:underline"
              >
                Alle apps tonen
              </button>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyViews}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={d => {
                    const date = new Date(d);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'hsl(var(--foreground))',
                  }}
                  labelFormatter={d => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  fill="url(#viewsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Apps table */}
        <div className="rounded-xl border border-border/40 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="px-5 py-4 border-b border-border/30">
            <h2 className="text-sm font-semibold text-foreground">Apps overzicht</h2>
          </div>
          {apps.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm">Geen apps gevonden. Maak je eerste app op het dashboard.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {apps.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id === selectedAppId ? null : app.id)}
                  className={`w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-secondary/30 transition-colors ${
                    selectedAppId === app.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{app.name}</p>
                    {app.slug && (
                      <p className="text-[10px] text-muted-foreground truncate">/app/{app.slug}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {app.is_public ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">Publiek</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Privé</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 min-w-[60px] justify-end">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{app.total_views}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
