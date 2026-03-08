import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Code2, Users, UserCheck, Clock, Sparkles } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'app_created' | 'org_joined' | 'friend_added';
  title: string;
  date: string;
  icon: string;
}

export function ActivityTimeline({ userId }: { userId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, [userId]);

  async function loadActivity() {
    setLoading(true);
    const activities: ActivityItem[] = [];

    const [appsRes, orgsRes, friendsRes] = await Promise.all([
      supabase
        .from('apps')
        .select('id, name, icon, created_at')
        .eq('owner_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('organization_members')
        .select('id, organization_id, created_at, organizations(name, icon)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('friendships')
        .select('id, sender_id, receiver_id, updated_at')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(10),
    ]);

    if (appsRes.data) {
      for (const app of appsRes.data) {
        activities.push({
          id: `app-${app.id}`,
          type: 'app_created',
          title: `${app.icon || '📱'} ${app.name} gepubliceerd`,
          date: app.created_at,
          icon: 'app',
        });
      }
    }

    if (orgsRes.data) {
      for (const mem of orgsRes.data) {
        const org = mem.organizations as any;
        if (org) {
          activities.push({
            id: `org-${mem.id}`,
            type: 'org_joined',
            title: `Lid geworden van ${org.name}`,
            date: mem.created_at,
            icon: 'org',
          });
        }
      }
    }

    if (friendsRes.data) {
      const friendIds = friendsRes.data.map(f =>
        f.sender_id === userId ? f.receiver_id : f.sender_id
      );
      let friendNames: Record<string, string> = {};
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', friendIds);
        if (profiles) {
          friendNames = Object.fromEntries(profiles.map(p => [p.id, p.display_name || 'Iemand']));
        }
      }
      for (const f of friendsRes.data) {
        const friendId = f.sender_id === userId ? f.receiver_id : f.sender_id;
        activities.push({
          id: `friend-${f.id}`,
          type: 'friend_added',
          title: `Vrienden geworden met ${friendNames[friendId] || 'Iemand'}`,
          date: f.updated_at,
          icon: 'friend',
        });
      }
    }

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(activities.slice(0, 15));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">Activiteit</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const iconMap = {
    app: <Code2 className="h-3.5 w-3.5" />,
    org: <Users className="h-3.5 w-3.5" />,
    friend: <UserCheck className="h-3.5 w-3.5" />,
  };

  const colorMap = {
    app: 'bg-primary/15 text-primary border-primary/20',
    org: 'bg-accent/15 text-accent border-accent/20',
    friend: 'bg-primary/15 text-primary border-primary/20',
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Zojuist';
    if (mins < 60) return `${mins}m geleden`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}u geleden`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d geleden`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mnd geleden`;
    return `${Math.floor(months / 12)}j geleden`;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">Recente activiteit</h3>
      </div>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />

        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="relative flex items-start gap-3 py-2 px-1 rounded-xl hover:bg-secondary/30 transition-colors group">
              {/* Dot */}
              <div className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border shrink-0 ${colorMap[item.icon as keyof typeof colorMap]}`}>
                {iconMap[item.icon as keyof typeof iconMap]}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm text-foreground/90 truncate">{item.title}</p>
              </div>
              {/* Time */}
              <span className="text-[11px] text-muted-foreground shrink-0 pt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                {timeAgo(item.date)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
