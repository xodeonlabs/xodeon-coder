import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserCheck, UserX, Users, Clock } from 'lucide-react';

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export function FriendRequests() {
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const myId = session?.user?.id;

  useEffect(() => {
    if (!myId) return;
    loadRequests();

    const channel = supabase
      .channel('friend-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        loadRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myId]);

  async function loadRequests() {
    if (!myId) return;
    setLoading(true);

    const { data } = await supabase
      .from('friendships')
      .select('id, sender_id, receiver_id, status, created_at')
      .eq('status', 'pending')
      .eq('receiver_id', myId)
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const senderIds = data.map(r => r.sender_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username')
      .in('id', senderIds);

    const profileMap: Record<string, any> = {};
    if (profiles) {
      for (const p of profiles) profileMap[p.id] = p;
    }

    setRequests(data.map(r => ({ ...r, profile: profileMap[r.sender_id] })));
    setLoading(false);
  }

  async function accept(id: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', id);
    if (error) {
      toast({ title: 'Fout', description: 'Kon verzoek niet accepteren', variant: 'destructive' });
    } else {
      toast({ title: 'Vriendschapsverzoek geaccepteerd! 🎉' });
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  }

  async function reject(id: string) {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Fout', description: 'Kon verzoek niet afwijzen', variant: 'destructive' });
    } else {
      toast({ title: 'Verzoek afgewezen' });
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Zojuist';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}u`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  if (loading || requests.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5 mb-6 animate-slide-up border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground font-display">
          Vriendschapsverzoeken
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold tabular-nums">
          {requests.length}
        </span>
      </div>

      <div className="space-y-2">
        {requests.map(req => {
          const profile = req.profile;
          const initials = profile?.display_name?.slice(0, 2).toUpperCase() || '??';
          const name = profile?.display_name || 'Anonieme gebruiker';

          return (
            <div
              key={req.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
            >
              <div
                className="cursor-pointer shrink-0"
                onClick={() => navigate(`/profiel/${profile?.username || req.sender_id}`)}
              >
                <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => navigate(`/profiel/${profile?.username || req.sender_id}`)}
                >
                  {name}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(req.created_at)} geleden
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => accept(req.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Accepteren</span>
                </button>
                <button
                  onClick={() => reject(req.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
                  title="Afwijzen"
                >
                  <UserX className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
