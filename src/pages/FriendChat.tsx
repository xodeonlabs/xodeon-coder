import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, MessageCircle, Gamepad2 } from 'lucide-react';
import { ChatRetentionSelector } from '@/components/ChatRetentionSelector';
import { SnakeGame } from '@/components/SnakeGame';
import { StatusDot, getOnlineStatus } from '@/components/StatusDot';

interface ChatFriend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
  is_dnd?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function FriendChatPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<ChatFriend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myId = session?.user?.id;
  const [myRetentionHours, setMyRetentionHours] = useState(24);

  // Load friends list
  useEffect(() => {
    if (!myId) return;
    loadFriends();
    // Load own retention setting
    supabase.from('profiles').select('friend_chat_retention_hours').eq('id', myId).maybeSingle().then(({ data }) => {
      if (data) setMyRetentionHours((data as any).friend_chat_retention_hours ?? 24);
    });
  }, [myId]);

  async function loadFriends() {
    setLoading(true);
    const { data: friendships } = await supabase
      .from('friendships')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`);

    if (!friendships || friendships.length === 0) {
      setLoading(false);
      return;
    }

    const friendIds = friendships.map(f =>
      f.sender_id === myId ? f.receiver_id : f.sender_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username, is_dnd')
      .in('id', friendIds);

    if (!profiles) { setLoading(false); return; }

    // Get last message for each friend
    const friendsWithMessages: ChatFriend[] = await Promise.all(
      profiles.map(async (p) => {
        const { data: lastMsg } = await supabase
          .from('friend_messages')
          .select('content, created_at')
          .or(`and(sender_id.eq.${myId},receiver_id.eq.${p.id}),and(sender_id.eq.${p.id},receiver_id.eq.${myId})`)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from('friend_messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', p.id)
          .eq('receiver_id', myId!)
          .is('read_at', null);

        return {
          ...p,
          lastMessage: lastMsg?.[0]?.content,
          lastMessageAt: lastMsg?.[0]?.created_at,
          unread: count ?? 0,
        };
      })
    );

    // Sort by last message time
    friendsWithMessages.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    setFriends(friendsWithMessages);
    setLoading(false);
  }

  // Load messages for selected friend
  useEffect(() => {
    if (!selectedFriend || !myId) return;
    loadMessages(selectedFriend.id);

    // Mark as read
    supabase
      .from('friend_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', selectedFriend.id)
      .eq('receiver_id', myId)
      .is('read_at', null)
      .then(() => {
        setFriends(prev => prev.map(f =>
          f.id === selectedFriend.id ? { ...f, unread: 0 } : f
        ));
      });

    // Realtime subscription
    const channel = supabase
      .channel(`friend-chat-${selectedFriend.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_messages' },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === myId && msg.receiver_id === selectedFriend.id) ||
            (msg.sender_id === selectedFriend.id && msg.receiver_id === myId)
          ) {
            setMessages(prev => [...prev, msg]);
            // Mark as read immediately
            if (msg.sender_id === selectedFriend.id) {
              supabase
                .from('friend_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedFriend?.id, myId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages(friendId: string) {
    const { data } = await supabase
      .from('friend_messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true })
      .limit(100);

    setMessages(data || []);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedFriend || !myId || sending) return;
    const content = newMessage.trim().slice(0, 2000);
    setSending(true);
    setNewMessage('');

    const { error } = await supabase.from('friend_messages').insert({
      sender_id: myId,
      receiver_id: selectedFriend.id,
      content,
    });

    if (error) {
      setNewMessage(content);
    }
    setSending(false);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Nu';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}u`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/30 px-4 sm:px-6 py-3 glass-card">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => selectedFriend ? setSelectedFriend(null) : navigate(-1)}
            className="p-2 rounded-xl text-foreground/80 hover:bg-secondary/50 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {selectedFriend ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="h-8 w-8">
                  {selectedFriend.avatar_url ? (
                    <AvatarImage src={selectedFriend.avatar_url} alt="" className="object-cover" />
                  ) : null}
                  <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                    {selectedFriend.display_name?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <StatusDot isDnd={(selectedFriend as any).is_dnd ?? false} className="absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground truncate">{selectedFriend.display_name || 'Anoniem'}</h2>
                {selectedFriend.username && <p className="text-[11px] text-muted-foreground">@{selectedFriend.username}</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground font-display">Berichten</h2>
              </div>
              <ChatRetentionSelector
                currentHours={myRetentionHours}
                onUpdate={async (hours) => {
                  const { error } = await supabase.from('profiles').update({ friend_chat_retention_hours: hours } as any).eq('id', myId!);
                  if (!error) setMyRetentionHours(hours);
                }}
                label="Bewaring"
              />
            </>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full">
        {!selectedFriend ? (
          /* Friends list */
          <div className="divide-y divide-border/20">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="text-5xl mb-3 opacity-40">💬</div>
                <p className="text-sm text-muted-foreground">Nog geen vrienden om mee te chatten</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Voeg eerst vrienden toe via het dashboard</p>
              </div>
            ) : (
              friends.map(friend => {
                const initials = friend.display_name?.slice(0, 2).toUpperCase() || '??';
                return (
                  <button
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    className="flex items-center gap-3 w-full px-4 sm:px-6 py-4 hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12">
                        {friend.avatar_url ? (
                          <AvatarImage src={friend.avatar_url} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {(friend.unread ?? 0) > 0 ? (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                          {friend.unread}
                        </span>
                      ) : (
                        <StatusDot isDnd={(friend as any).is_dnd ?? false} className="absolute -bottom-0.5 -right-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {friend.display_name || 'Anoniem'}
                        </p>
                        {friend.lastMessageAt && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {timeAgo(friend.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {friend.lastMessage || 'Nog geen berichten'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          /* Chat view */
          <div className="flex flex-col h-[calc(100vh-57px)]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-2 opacity-30">👋</div>
                  <p className="text-sm text-muted-foreground">Begin een gesprek met {selectedFriend.display_name || 'je vriend'}</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === myId;
                const showTime = i === 0 || (new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000);
                return (
                  <div key={msg.id}>
                    {showTime && (
                      <div className="text-center my-3">
                        <span className="text-[10px] text-muted-foreground/50 bg-secondary/30 px-2 py-0.5 rounded-full">
                          {new Date(msg.created_at).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm break-words ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary/60 text-foreground rounded-bl-md'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Snake Game */}
            {showGame && myId && selectedFriend && (
              <div className="border-t border-border/30 px-4 sm:px-6 py-2">
                <SnakeGame
                  channelName={`friend-${[myId, selectedFriend.id].sort().join('-')}`}
                  userId={myId}
                  userName={session?.user?.email?.split('@')[0] || 'Speler'}
                  onClose={() => setShowGame(false)}
                />
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border/30 px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGame(!showGame)}
                  className={`p-2.5 rounded-xl transition-all ${showGame ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
                  title="Snake spelen"
                >
                  <Gamepad2 className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value.slice(0, 2000))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Schrijf een bericht..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border/40 bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  maxLength={2000}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
