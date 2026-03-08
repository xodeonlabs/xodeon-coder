import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus, UserCheck, Clock, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

interface FriendButtonProps {
  targetUserId: string;
  onStatusChange?: () => void;
}

export function FriendButton({ targetUserId, onStatusChange }: FriendButtonProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<FriendStatus>('none');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const myId = session?.user?.id;

  useEffect(() => {
    if (!myId || myId === targetUserId) { setLoading(false); return; }
    checkStatus();
  }, [myId, targetUserId]);

  async function checkStatus() {
    setLoading(true);
    // Check both directions
    const { data } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id, status')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${myId})`)
      .limit(1);

    if (data && data.length > 0) {
      const f = data[0];
      if (f.status === 'accepted') setStatus('accepted');
      else if (f.status === 'pending' && f.sender_id === myId) setStatus('pending_sent');
      else if (f.status === 'pending' && f.receiver_id === myId) setStatus('pending_received');
      else setStatus('none');
    } else {
      setStatus('none');
    }
    setLoading(false);
  }

  async function sendRequest() {
    setActing(true);
    const { error } = await supabase.from('friendships').insert({
      sender_id: myId!,
      receiver_id: targetUserId,
      status: 'pending',
    });
    if (error) {
      toast({ title: 'Fout', description: 'Kon verzoek niet verzenden', variant: 'destructive' });
    } else {
      setStatus('pending_sent');
      toast({ title: 'Verzoek verzonden! 🤝' });
      onStatusChange?.();
    }
    setActing(false);
  }

  async function acceptRequest() {
    setActing(true);
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('sender_id', targetUserId)
      .eq('receiver_id', myId!);
    if (error) {
      toast({ title: 'Fout', description: 'Kon verzoek niet accepteren', variant: 'destructive' });
    } else {
      setStatus('accepted');
      toast({ title: 'Jullie zijn nu vrienden! 🎉' });
      onStatusChange?.();
    }
    setActing(false);
  }

  async function removeFriend() {
    setActing(true);
    // Delete in both directions
    await supabase
      .from('friendships')
      .delete()
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${myId})`);
    setStatus('none');
    toast({ title: 'Vriend verwijderd' });
    onStatusChange?.();
    setActing(false);
  }

  if (!myId || myId === targetUserId || loading) return null;

  const disabled = acting;

  if (status === 'none') {
    return (
      <button
        onClick={sendRequest}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
      >
        <UserPlus className="h-4 w-4" />
        Vriend toevoegen
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button
        onClick={removeFriend}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all active:scale-95 disabled:opacity-50 border border-border/50"
      >
        <Clock className="h-4 w-4" />
        Verzoek verzonden
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={acceptRequest}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
        >
          <UserCheck className="h-4 w-4" />
          Accepteren
        </button>
        <button
          onClick={removeFriend}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-secondary text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all active:scale-95 disabled:opacity-50 border border-border/50"
        >
          <UserX className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // accepted
  return (
    <button
      onClick={removeFriend}
      disabled={disabled}
      className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all active:scale-95 disabled:opacity-50"
    >
      <UserCheck className="h-4 w-4 group-hover:hidden" />
      <UserX className="h-4 w-4 hidden group-hover:block" />
      <span className="group-hover:hidden">Vrienden</span>
      <span className="hidden group-hover:inline">Ontvrienden</span>
    </button>
  );
}
