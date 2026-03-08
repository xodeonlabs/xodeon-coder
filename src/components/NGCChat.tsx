import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send } from 'lucide-react';
import { getCached, setCache, CACHE_TTL } from '@/lib/cache';

interface ChatMessage {
  id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

interface NGCChatProps {
  appId: string;
}

export function NGCChat({ appId }: NGCChatProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load messages and profiles
  useEffect(() => {
    supabase
      .from('chat_messages')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        if (!data) return;
        setMessages(data as ChatMessage[]);
        const userIds = [...new Set(data.map(m => m.user_id))];
        if (userIds.length > 0) {
          // Use cached profiles
          const cachedProfiles = getCached<Record<string, string>>('app-chat-profiles', CACHE_TTL.long) || {};
          const cachedAdmins = getCached<string[]>('app-chat-admins', CACHE_TTL.long) || [];
          const needed = userIds.filter(id => !cachedProfiles[id]);
          
          if (needed.length > 0) {
            const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', needed);
            if (profs) {
              for (const p of profs) { if (p.display_name) cachedProfiles[p.id] = p.display_name; }
              setCache('app-chat-profiles', cachedProfiles);
            }
            for (const uid of needed) {
              const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' });
              if (isAdmin) cachedAdmins.push(uid);
            }
            setCache('app-chat-admins', cachedAdmins);
          }
          setProfiles(cachedProfiles);
          setAdminIds(new Set(cachedAdmins));
        }
      });
  }, [appId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${appId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `app_id=eq.${appId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [appId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !session?.user) return;
    setSending(true);
    await supabase.from('chat_messages').insert({
      app_id: appId,
      user_id: session.user.id,
      user_email: session.user.email || 'Onbekend',
      content: input.trim(),
    });
    setInput('');
    setSending(false);
  }, [input, appId, session]);

  const currentUserId = session?.user?.id;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nog geen berichten</p>
        )}
        {messages.map(msg => {
          const isMe = msg.user_id === currentUserId;
          const isAdminUser = adminIds.has(msg.user_id);
          const shortName = isAdminUser ? 'Admin' : (profiles[msg.user_id] || msg.user_email.split('@')[0]);
          const displayName = isAdminUser ? 'Admin' : (profiles[msg.user_id] || msg.user_email.split('@')[0]);
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className={`text-[10px] mb-0.5 px-1 font-semibold ${isAdminUser ? 'text-destructive' : 'text-muted-foreground'}`}>{displayName}</span>
              <div
                className={`rounded-lg px-2.5 py-1.5 text-xs max-w-[85%] break-words ${
                  isMe
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 flex gap-1.5">
        <input
          className="flex-1 rounded bg-background border border-border px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          placeholder="Typ een bericht..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="rounded p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
