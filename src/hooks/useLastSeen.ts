import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getOnlineStatus, getLastSeenText, type OnlineStatus } from '@/components/StatusDot';

/**
 * Hook that returns a live-updating "last seen" text for a given user.
 * Re-computes the relative time every 30s and listens for realtime profile changes.
 */
export function useLastSeen(userId: string | undefined | null) {
  const [isDnd, setIsDnd] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('is_dnd, last_seen_at')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setIsDnd(data.is_dnd ?? false);
          setLastSeenAt(data.last_seen_at ?? null);
        }
      });
  }, [userId]);

  // Realtime updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`last-seen-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const p = payload.new as any;
          setIsDnd(p.is_dnd ?? false);
          setLastSeenAt(p.last_seen_at ?? null);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Tick every 30s to update relative time
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const status: OnlineStatus = getOnlineStatus(isDnd, lastSeenAt);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const text = getLastSeenText(status, lastSeenAt);

  return { status, text, isDnd, lastSeenAt };
}
