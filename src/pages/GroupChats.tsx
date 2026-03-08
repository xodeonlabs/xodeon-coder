import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, Plus, Users, Hash, UserPlus, Trash2, X, Search, Gamepad2, Check, CheckCheck } from 'lucide-react';
import { ChatRetentionSelector } from '@/components/ChatRetentionSelector';
import { SnakeGame } from '@/components/SnakeGame';
import { StatusDot, getOnlineStatus } from '@/components/StatusDot';

interface ChatGroup {
  id: string;
  name: string;
  icon: string;
  type: 'friend_group' | 'private' | 'org_channel';
  organization_id: string | null;
  created_by: string;
  chat_retention_hours: number;
  created_at: string;
}

interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface MemberProfile {
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_dnd?: boolean;
  last_seen_at?: string | null;
}

export default function GroupChats() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const myId = session?.user?.id;

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [readStatuses, setReadStatuses] = useState<Record<string, string>>({});
  // Maps group_id -> { user_id -> last_read_at } for all members
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💬');
  const [newType, setNewType] = useState<'friend_group' | 'private' | 'org_channel'>('friend_group');
  const [creating, setCreating] = useState(false);

  // Add member
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string | null; avatar_url: string | null; username: string | null }[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (myId) loadGroups(); }, [myId]);

  async function loadGroups() {
    setLoading(true);
    const { data } = await supabase
      .from('chat_groups' as any)
      .select('*')
      .order('updated_at', { ascending: false });
    setGroups((data as any as ChatGroup[]) || []);
    setLoading(false);
  }

  async function selectGroup(group: ChatGroup) {
    setSelectedGroup(group);
    setShowGame(false);

    // Load messages
    const { data: msgs } = await supabase
      .from('chat_group_messages' as any)
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(200);
    setMessages((msgs as any as GroupMessage[]) || []);

    // Load members
    const { data: members } = await supabase
      .from('chat_group_members' as any)
      .select('user_id')
      .eq('group_id', group.id);
    const ids = (members as any[])?.map(m => m.user_id) || [];
    setMemberIds(ids);

    // Load profiles
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username, is_dnd, last_seen_at')
        .in('id', ids);
      const map: Record<string, MemberProfile> = {};
      (profs || []).forEach(p => { map[p.id] = p; });
      setProfiles(map);
    }

    // Load read statuses for all members of this group
    const { data: readData } = await supabase
      .from('chat_group_read_status' as any)
      .select('user_id, last_read_at')
      .eq('group_id', group.id);
    const statusMap: Record<string, string> = {};
    (readData as any[] || []).forEach((r: any) => { statusMap[r.user_id] = r.last_read_at; });
    setReadStatuses(statusMap);

    // Mark as read for current user
    if (myId) {
      await supabase.from('chat_group_read_status' as any).upsert(
        { group_id: group.id, user_id: myId, last_read_at: new Date().toISOString() } as any,
        { onConflict: 'group_id,user_id' }
      );
    }
  }

  // Realtime messages
  useEffect(() => {
    if (!selectedGroup) return;
    const channel = supabase
      .channel(`group-chat-${selectedGroup.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_group_messages',
        filter: `group_id=eq.${selectedGroup.id}`,
      }, (payload) => {
        const msg = payload.new as unknown as GroupMessage;
        setMessages(prev => [...prev, msg]);
        // Load profile if unknown
        if (!profiles[msg.user_id]) {
          supabase.from('profiles').select('id, display_name, avatar_url, username, is_dnd').eq('id', msg.user_id).maybeSingle().then(({ data }) => {
            if (data) setProfiles(prev => ({ ...prev, [data.id]: data }));
          });
        }
        // Update own read status when receiving messages
        if (myId && msg.user_id !== myId) {
          supabase.from('chat_group_read_status' as any).upsert(
            { group_id: selectedGroup.id, user_id: myId, last_read_at: new Date().toISOString() } as any,
            { onConflict: 'group_id,user_id' }
          );
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_group_read_status',
        filter: `group_id=eq.${selectedGroup.id}`,
      }, (payload) => {
        const row = payload.new as any;
        if (row?.user_id && row?.last_read_at) {
          setReadStatuses(prev => ({ ...prev, [row.user_id]: row.last_read_at }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function createGroup() {
    if (!newName.trim() || !myId || creating) return;
    setCreating(true);

    const { data, error } = await supabase
      .from('chat_groups' as any)
      .insert({ name: newName.trim(), icon: newIcon, type: newType, created_by: myId } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      setCreating(false);
      return;
    }

    // Add self as member
    await supabase.from('chat_group_members' as any).insert({ group_id: (data as any).id, user_id: myId } as any);

    setShowCreate(false);
    setNewName('');
    setNewIcon('💬');
    setCreating(false);
    loadGroups();
    toast({ title: 'Groep aangemaakt!' });
  }

  async function sendMessage() {
    if (!input.trim() || !selectedGroup || !myId || sending) return;
    const content = input.trim().slice(0, 2000);
    setSending(true);
    setInput('');

    const { error } = await supabase.from('chat_group_messages' as any).insert({
      group_id: selectedGroup.id,
      user_id: myId,
      content,
    } as any);

    if (error) { setInput(content); toast({ title: 'Fout bij verzenden', variant: 'destructive' }); }
    setSending(false);
  }

  async function searchUsers() {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username')
      .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
      .limit(10);
    setSearchResults((data || []).filter(p => p.id !== myId && !memberIds.includes(p.id)));
  }

  async function addMember(userId: string) {
    if (!selectedGroup) return;
    const { error } = await supabase.from('chat_group_members' as any).insert({ group_id: selectedGroup.id, user_id: userId } as any);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }
    setMemberIds(prev => [...prev, userId]);
    const found = searchResults.find(r => r.id === userId);
    if (found) setProfiles(prev => ({ ...prev, [userId]: found }));
    setSearchResults(prev => prev.filter(r => r.id !== userId));
    toast({ title: 'Lid toegevoegd!' });
  }

  async function removeMember(userId: string) {
    if (!selectedGroup) return;
    await supabase.from('chat_group_members' as any).delete().eq('group_id', selectedGroup.id).eq('user_id', userId);
    setMemberIds(prev => prev.filter(id => id !== userId));
    toast({ title: 'Lid verwijderd' });
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Weet je zeker dat je deze groep wilt verwijderen?')) return;
    await supabase.from('chat_groups' as any).delete().eq('id', groupId);
    setSelectedGroup(null);
    loadGroups();
    toast({ title: 'Groep verwijderd' });
  }

  async function leaveGroup(groupId: string) {
    if (!myId) return;
    await supabase.from('chat_group_members' as any).delete().eq('group_id', groupId).eq('user_id', myId);
    setSelectedGroup(null);
    loadGroups();
    toast({ title: 'Je hebt de groep verlaten' });
  }

  if (!session) return null;

  const typeLabels: Record<string, string> = { friend_group: '👥 Vriendengroep', private: '🔒 Privé', org_channel: '# Kanaal' };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/30 px-4 sm:px-6 py-3 glass-card">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => selectedGroup ? setSelectedGroup(null) : navigate(-1)}
            className="p-2 rounded-xl text-foreground/80 hover:bg-secondary/50 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {selectedGroup ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl">{selectedGroup.icon}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-foreground truncate">{selectedGroup.name}</h2>
                <p className="text-[10px] text-muted-foreground">{memberIds.length} leden</p>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedGroup.created_by === myId && (
                  <ChatRetentionSelector
                    currentHours={selectedGroup.chat_retention_hours}
                    onUpdate={async (hours) => {
                      await supabase.from('chat_groups' as any).update({ chat_retention_hours: hours } as any).eq('id', selectedGroup.id);
                      setSelectedGroup({ ...selectedGroup, chat_retention_hours: hours });
                    }}
                  />
                )}
                <button onClick={() => setShowAddMember(!showAddMember)} className="p-2 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all">
                  <UserPlus className="h-4 w-4" />
                </button>
                {selectedGroup.created_by === myId ? (
                  <button onClick={() => deleteGroup(selectedGroup.id)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={() => leaveGroup(selectedGroup.id)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all text-[10px] font-medium">
                    Verlaten
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground font-display">Groepschats</h2>
              <div className="flex-1" />
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Nieuw
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Add member panel */}
      {showAddMember && selectedGroup && (
        <div className="border-b border-border/30 px-4 sm:px-6 py-3 bg-secondary/20">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchUsers()}
                  placeholder="Zoek gebruikers..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/40 bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button onClick={searchUsers} className="px-3 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Zoek
              </button>
              <button onClick={() => { setShowAddMember(false); setSearchResults([]); setSearchQuery(''); }} className="p-2 rounded-xl text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/50">
                    <Avatar className="h-6 w-6">
                      {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                      <AvatarFallback className="text-[8px] bg-primary/20 text-primary">{u.display_name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground flex-1">{u.display_name || u.username || 'Onbekend'}</span>
                    <button onClick={() => addMember(u.id)} className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      Toevoegen
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Current members */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {memberIds.map(id => {
                const p = profiles[id];
                return (
                  <div key={id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/50 text-[10px]">
                    <Avatar className="h-4 w-4">
                      {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                      <AvatarFallback className="text-[6px] bg-primary/20 text-primary">{p?.display_name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
                    </Avatar>
                    <span className="text-foreground font-medium">{p?.display_name || 'Onbekend'}</span>
                    {selectedGroup.created_by === myId && id !== myId && (
                      <button onClick={() => removeMember(id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-4xl mx-auto w-full">
        {/* Create dialog */}
        {showCreate && (
          <div className="p-4 sm:p-6 border-b border-border/30">
            <div className="rounded-xl border border-border/40 p-4 space-y-3" style={{ background: 'hsl(var(--card))' }}>
              <h3 className="text-sm font-bold text-foreground">Nieuwe groepschat</h3>
              <div className="flex items-center gap-3">
                <input
                  value={newIcon}
                  onChange={e => setNewIcon(e.target.value)}
                  className="w-12 text-center text-xl rounded-lg border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  maxLength={2}
                />
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Naam van de groep"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Type</label>
                <div className="flex gap-2">
                  {(['friend_group', 'private', 'org_channel'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        newType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={createGroup} disabled={creating || !newName.trim()} className="px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                  {creating ? 'Bezig...' : 'Aanmaken'}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedGroup ? (
          /* Group list */
          <div className="divide-y divide-border/20">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : groups.length === 0 && !showCreate ? (
              <div className="text-center py-20 px-4">
                <div className="text-5xl mb-3 opacity-40">👥</div>
                <p className="text-sm text-muted-foreground">Nog geen groepschats</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Maak een groep aan met de knop hierboven</p>
              </div>
            ) : (
              groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => selectGroup(group)}
                  className="flex items-center gap-3 w-full px-4 sm:px-6 py-4 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-xl">
                    {group.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">{group.name}</h3>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground font-medium">
                        {group.type === 'friend_group' ? '👥' : group.type === 'org_channel' ? '#' : '🔒'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(group.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Chat view */
          <div className="flex flex-col h-[calc(100vh-57px)]">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-2 opacity-30">💬</div>
                  <p className="text-sm text-muted-foreground">Begin een gesprek in {selectedGroup.name}</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMine = msg.user_id === myId;
                const profile = profiles[msg.user_id];
                const name = profile?.display_name || 'Onbekend';
                const showTime = i === 0 || (new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000);
                const showName = !isMine && (i === 0 || messages[i - 1].user_id !== msg.user_id);
                
                // Calculate read status for own messages
                let readByOthers = 0;
                let totalOthers = 0;
                if (isMine) {
                  const otherMemberIds = memberIds.filter(id => id !== myId);
                  totalOthers = otherMemberIds.length;
                  readByOthers = otherMemberIds.filter(id => {
                    const lastRead = readStatuses[id];
                    return lastRead && new Date(lastRead) >= new Date(msg.created_at);
                  }).length;
                }

                return (
                  <div key={msg.id}>
                    {showTime && (
                      <div className="text-center my-3">
                        <span className="text-[10px] text-muted-foreground/50 bg-secondary/30 px-2 py-0.5 rounded-full">
                          {new Date(msg.created_at).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
                      {!isMine && showName && (
                        <div className="relative shrink-0 mt-0.5">
                          <Avatar className="h-6 w-6">
                            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                            <AvatarFallback className="text-[8px] font-bold bg-primary/20 text-primary">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <StatusDot isDnd={profile?.is_dnd ?? false} className="absolute -bottom-0.5 -right-0.5 h-2 w-2 border" />
                        </div>
                      )}
                      {!isMine && !showName && <div className="w-6" />}
                      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        {showName && !isMine && <span className="text-[10px] text-muted-foreground mb-0.5 px-1 font-semibold">{name}</span>}
                        <div className={`px-3.5 py-2 rounded-2xl text-sm break-words ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary/60 text-foreground rounded-bl-md'
                        }`}>
                          {msg.content}
                        </div>
                        {isMine && totalOthers > 0 && (
                          <div className="flex items-center gap-1 mt-0.5 px-1">
                            {readByOthers === totalOthers ? (
                              <>
                                <CheckCheck className="h-3 w-3 text-accent" />
                                <span className="text-[9px] text-accent font-medium">Gelezen</span>
                              </>
                            ) : readByOthers > 0 ? (
                              <>
                                <CheckCheck className="h-3 w-3 text-muted-foreground/60" />
                                <span className="text-[9px] text-muted-foreground/60 font-medium">Gelezen door {readByOthers}/{totalOthers}</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3 text-muted-foreground/40" />
                                <span className="text-[9px] text-muted-foreground/40 font-medium">Bezorgd</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Snake Game */}
            {showGame && myId && (
              <div className="border-t border-border/30 px-4 sm:px-6 py-2">
                <SnakeGame
                  channelName={`group-${selectedGroup.id}`}
                  userId={myId}
                  userName={profiles[myId]?.display_name || session?.user?.email?.split('@')[0] || 'Speler'}
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
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, 2000))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Schrijf een bericht..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border/40 bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  maxLength={2000}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-40"
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
