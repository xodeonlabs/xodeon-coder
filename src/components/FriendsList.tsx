import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { StatusDot, getOnlineStatus } from '@/components/StatusDot';

interface Friend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_dnd?: boolean;
  last_seen_at?: string | null;
}

export function FriendsList({ userId }: { userId: string }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFriends();
  }, [userId]);

  async function loadFriends() {
    setLoading(true);
    
    // Get accepted friendships
    const { data: friendships } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (!friendships || friendships.length === 0) {
      setLoading(false);
      return;
    }

    const friendIds = friendships.map(f => 
      f.sender_id === userId ? f.receiver_id : f.sender_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username, is_dnd, last_seen_at')
      .in('id', friendIds);

    setFriends(profiles || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">Vrienden</h3>
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-16 rounded-full" />)}
        </div>
      </div>
    );
  }

  if (friends.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">Vrienden</h3>
        <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">{friends.length}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {friends.map(friend => {
          const initials = friend.display_name?.slice(0, 2).toUpperCase() || '??';
          return (
            <button
              key={friend.id}
              onClick={() => navigate(`/profiel/${friend.username || friend.id}`)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-secondary/50 transition-all group"
            >
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                  {friend.avatar_url ? (
                    <AvatarImage src={friend.avatar_url} alt={friend.display_name || ''} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <StatusDot isDnd={(friend as any).is_dnd ?? false} className="absolute -bottom-0.5 -right-0.5" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[72px]">
                {friend.display_name || 'Anoniem'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
