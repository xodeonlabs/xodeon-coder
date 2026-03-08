import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const UPDATE_INTERVAL = 60_000; // 1 minute

export function usePresence() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user?.id) return;

    const update = () => {
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq('id', session.user.id)
        .then(() => {});
    };

    // Update immediately
    update();

    // Then every minute
    const interval = setInterval(update, UPDATE_INTERVAL);

    // Also update on visibility change
    const onVisibility = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session?.user?.id]);
}
