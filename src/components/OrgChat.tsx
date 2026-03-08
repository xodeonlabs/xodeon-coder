import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, Check, CheckCheck } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getCached, setCache, CACHE_TTL } from '@/lib/cache';

interface OrgChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface OrgChatProps {
  organizationId: string;
}

export function OrgChat({ organizationId }: OrgChatProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<OrgChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [otherReadAt, setOtherReadAt] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load messages + profiles + read status
  useEffect(() => {
    if (!session?.user?.id) return;

    // Load messages
    supabase
      .from('org_chat_messages')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(async ({ data }) => {
        if (!data) return;
        setMessages(data as OrgChatMessage[]);
        await loadProfiles(data.map(m => m.user_id));
      });

    // Load own read status
    supabase
      .from('org_chat_read_status')
      .select('last_read_at')
      .eq('organization_id', organizationId)
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setLastReadAt((data as any).last_read_at);
      });

    // Load others' read status (to show read receipts)
    loadOtherReadStatus();
  }, [organizationId, session?.user?.id]);

  async function loadOtherReadStatus() {
    // We can only read our own read status due to RLS, so we skip others for now
    // Read receipts will show based on message order
  }

  async function loadProfiles(userIds: string[]) {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;
    
    // Check cache for already-loaded profiles
    const cachedProfiles = getCached<Record<string, { display_name: string | null; avatar_url: string | null }>>('chat-profiles', CACHE_TTL.long) || {};
    const cachedAdmins = getCached<string[]>('chat-admins', CACHE_TTL.long) || [];
    const needed = unique.filter(id => !cachedProfiles[id]);
    
    if (needed.length === 0) {
      setProfiles(prev => ({ ...prev, ...cachedProfiles }));
      setAdminIds(prev => { const merged = new Set(prev); cachedAdmins.forEach(id => merged.add(id)); return merged; });
      return;
    }
    
    const { data } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', needed);
    if (data) {
      const newProfiles = { ...cachedProfiles };
      for (const p of data) {
        newProfiles[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      }
      setProfiles(prev => ({ ...prev, ...newProfiles }));
      setCache('chat-profiles', newProfiles);
    }
    // Batch admin check - only for new users
    const adminSet = new Set<string>(cachedAdmins);
    for (const uid of needed) {
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' });
      if (isAdmin) adminSet.add(uid);
    }
    setAdminIds(prev => {
      const merged = new Set(prev);
      adminSet.forEach(id => merged.add(id));
      return merged;
    });
    setCache('chat-admins', Array.from(adminSet));
  }

  // Mark as read when viewing
  const markAsRead = useCallback(async () => {
    if (!session?.user?.id || messages.length === 0) return;
    const now = new Date().toISOString();
    setLastReadAt(now);
    await supabase.from('org_chat_read_status').upsert({
      organization_id: organizationId,
      user_id: session.user.id,
      last_read_at: now,
    } as any, { onConflict: 'organization_id,user_id' });
  }, [organizationId, session?.user?.id, messages.length]);

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    markAsRead();
  }, [messages.length, markAsRead]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`org-chat-${organizationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'org_chat_messages', filter: `organization_id=eq.${organizationId}` },
        async (payload) => {
          const msg = payload.new as OrgChatMessage;
          setMessages(prev => [...prev, msg]);
          if (!profiles[msg.user_id]) {
            await loadProfiles([msg.user_id]);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, profiles]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !session?.user) return;
    setSending(true);
    await supabase.from('org_chat_messages').insert({
      organization_id: organizationId,
      user_id: session.user.id,
      content: input.trim(),
    } as any);
    setInput('');
    setSending(false);
  }, [input, organizationId, session]);

  const currentUserId = session?.user?.id;

  // Determine unread count
  const unreadCount = lastReadAt
    ? messages.filter(m => m.user_id !== currentUserId && m.created_at > lastReadAt).length
    : 0;

  // Find first unread message index
  const firstUnreadIdx = lastReadAt
    ? messages.findIndex(m => m.user_id !== currentUserId && m.created_at > lastReadAt)
    : -1;

  return (
    <div className="flex flex-col h-full">
      {/* Unread badge header */}
      {unreadCount > 0 && (
        <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/20 flex items-center justify-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-semibold text-primary">
            {unreadCount} ongelezen bericht{unreadCount > 1 ? 'en' : ''}
          </span>
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nog geen berichten in deze groepschat</p>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.user_id === currentUserId;
          const profile = profiles[msg.user_id];
          const isAdminUser = adminIds.has(msg.user_id);
          const name = isAdminUser ? 'Admin' : (profile?.display_name || msg.user_id.slice(0, 8));
          const isFirstUnread = idx === firstUnreadIdx;

          return (
            <div key={msg.id}>
              {/* Unread divider */}
              {isFirstUnread && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-primary/30" />
                  <span className="text-[10px] font-semibold text-primary px-2">Nieuw</span>
                  <div className="flex-1 h-px bg-primary/30" />
                </div>
              )}

              <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                    {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                    <AvatarFallback className={`text-[8px] font-bold ${isAdminUser ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  {!isMe && <span className={`text-[10px] mb-0.5 px-1 font-semibold ${isAdminUser ? 'text-destructive' : 'text-muted-foreground'}`}>{name}</span>}
                  <div
                    className={`rounded-lg px-2.5 py-1.5 text-xs break-words ${
                      isMe
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 px-1">
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <CheckCheck className="h-3 w-3 text-primary/60" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-2 flex gap-1.5">
        <input
          className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          placeholder="Typ een bericht..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="rounded-lg p-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
