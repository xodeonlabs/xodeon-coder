import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CURSOR_COLORS = [
  '#f472b6', '#38bdf8', '#4ade80', '#fb923c', '#a78bfa',
  '#f87171', '#facc15', '#2dd4bf', '#818cf8', '#e879f9',
];

export interface RemoteCursor {
  userId: string;
  email: string;
  color: string;
  x: number;
  y: number;
  section?: string; // which editor tab they're in
}

function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function useLiveCursors(appId: string | undefined) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      myUserId.current = data.user?.id ?? null;
    });
  }, []);

  useEffect(() => {
    if (!appId) return;

    const channel = supabase.channel(`cursors-${appId}`, {
      config: { presence: { key: 'cursor' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{
          user_id: string;
          email: string;
          x: number;
          y: number;
          section?: string;
        }>();

        const remote: RemoteCursor[] = [];
        for (const key of Object.keys(state)) {
          for (const presence of state[key]) {
            if (presence.user_id !== myUserId.current) {
              remote.push({
                userId: presence.user_id,
                email: presence.email,
                color: pickColor(presence.user_id),
                x: presence.x,
                y: presence.y,
                section: presence.section,
              });
            }
          }
        }
        setCursors(remote);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            channel.track({
              user_id: data.user.id,
              email: data.user.email ?? '?',
              x: 0,
              y: 0,
              section: 'global',
            });
          }
        }
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [appId]);

  const updateCursor = useCallback((x: number, y: number, section?: string) => {
    const channel = channelRef.current;
    if (!channel || !myUserId.current) return;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        channel.track({
          user_id: data.user.id,
          email: data.user.email ?? '?',
          x,
          y,
          section,
        });
      }
    });
  }, []);

  return { cursors, updateCursor };
}
