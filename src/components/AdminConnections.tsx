import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Users, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AppRow {
  id: string; name: string; domain: string; owner_id: string;
  api_key_prefix: string; is_active: boolean; created_at: string;
}
interface UsageStat { external_app_id: string; endpoint: string; count: number; }
interface GrantRow { id: string; user_id: string; external_app_id: string; scopes: string[]; granted_at: string; revoked_at: string | null; }

export default function AdminConnections() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [stats, setStats] = useState<UsageStat[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; username: string | null }>>({});
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const load = async () => {
    const { data: a } = await supabase.from('external_apps' as any).select('*').order('created_at', { ascending: false });
    setApps((a as any) ?? []);

    const { data: usage } = await supabase.from('external_app_usage' as any).select('external_app_id, endpoint');
    const agg: Record<string, UsageStat> = {};
    ((usage as any) ?? []).forEach((u: any) => {
      const k = `${u.external_app_id}|${u.endpoint}`;
      agg[k] = agg[k] ?? { external_app_id: u.external_app_id, endpoint: u.endpoint, count: 0 };
      agg[k].count++;
    });
    setStats(Object.values(agg));

    const { data: g } = await supabase.from('oauth_user_grants' as any).select('*').order('granted_at', { ascending: false });
    setGrants((g as any) ?? []);

    const userIds = Array.from(new Set([...((a as any) ?? []).map((x: any) => x.owner_id), ...((g as any) ?? []).map((x: any) => x.user_id)]));
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, display_name, username').in('id', userIds);
      const map: any = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = { display_name: p.display_name, username: p.username }; });
      setProfiles(map);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('external_apps' as any).update({ is_active: !current }).eq('id', id);
    toast.success(current ? 'App uitgeschakeld' : 'App ingeschakeld');
    load();
  };

  const deleteApp = async (id: string) => {
    if (!confirm('App verwijderen?')) return;
    await supabase.from('external_apps' as any).delete().eq('id', id);
    toast.success('Verwijderd');
    load();
  };

  const usageFor = (appId: string) => stats.filter((s) => s.external_app_id === appId);
  const usersFor = (appId: string) => grants.filter((g) => g.external_app_id === appId && !g.revoked_at);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Externe app-connecties</h2>
      {apps.length === 0 && <Card className="p-6 text-center text-muted-foreground">Nog geen externe apps geregistreerd.</Card>}
      {apps.map((app) => {
        const owner = profiles[app.owner_id];
        const usage = usageFor(app.id);
        const total = usage.reduce((s, u) => s + u.count, 0);
        const users = usersFor(app.id);
        const open = selectedApp === app.id;
        return (
          <Card key={app.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold flex items-center gap-2">
                  {app.name}
                  <span className={`px-2 py-0.5 rounded text-[10px] ${app.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>{app.is_active ? 'Actief' : 'Uit'}</span>
                </h3>
                <p className="text-xs text-muted-foreground truncate">{app.domain || '—'} • eigenaar: @{owner?.username ?? app.owner_id.slice(0, 8)} • key: {app.api_key_prefix}…</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {total} API calls</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {users.length} gebruikers</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => toggleActive(app.id, app.is_active)}>{app.is_active ? 'Pauzeer' : 'Activeer'}</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteApp(app.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setSelectedApp(open ? null : app.id)}>
              {open ? 'Verberg details' : 'Toon endpoints + gebruikers'}
            </Button>
            {open && (
              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1">Endpoints gebruikt</p>
                  {usage.length === 0 ? <p className="text-xs text-muted-foreground">Nog geen aanroepen</p> :
                    <ul className="text-xs space-y-1">
                      {usage.sort((a, b) => b.count - a.count).map((u) => (
                        <li key={u.endpoint} className="flex justify-between p-1.5 rounded bg-muted/30"><code>/{u.endpoint}</code><span>{u.count}×</span></li>
                      ))}
                    </ul>}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1">Ingelogde gebruikers</p>
                  {users.length === 0 ? <p className="text-xs text-muted-foreground">Nog geen autorisaties</p> :
                    <ul className="text-xs space-y-1">
                      {users.map((g) => {
                        const u = profiles[g.user_id];
                        return <li key={g.id} className="p-1.5 rounded bg-muted/30">
                          @{u?.username ?? g.user_id.slice(0, 8)} <span className="text-muted-foreground">— scopes: {g.scopes.join(', ')}</span>
                        </li>;
                      })}
                    </ul>}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
