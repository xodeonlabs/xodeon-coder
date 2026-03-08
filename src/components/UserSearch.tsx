import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, X, User, AppWindow, Building2, MessageCircle } from 'lucide-react';
import { FriendButton } from '@/components/FriendButton';
import { AppIcon } from '@/components/IconPicker';

interface UserResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface AppResult {
  id: string;
  name: string;
  icon: string | null;
  is_public: boolean;
  owner_id: string;
}

interface OrgResult {
  id: string;
  name: string;
  icon: string | null;
  bio: string;
}

interface ChatGroupResult {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

type SearchCategory = 'all' | 'users' | 'apps' | 'orgs' | 'chats';

export function UserSearch() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [apps, setApps] = useState<AppResult[]>([]);
  const [orgs, setOrgs] = useState<OrgResult[]>([]);
  const [chats, setChats] = useState<ChatGroupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<SearchCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(value: string) {
    const sanitized = value.replace(/[^\w\s.\-@àáâãäåèéêëìíîïòóôõöùúûüýÿñçšžœæ]/gi, '').slice(0, 50);
    setQuery(sanitized);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (sanitized.trim().length < 2) {
      setUsers([]);
      setApps([]);
      setOrgs([]);
      setChats([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => searchAll(sanitized.trim()), 300);
  }

  async function searchAll(term: string) {
    setLoading(true);
    setOpen(true);

    const searchTerm = `%${term}%`;

    const [usersRes, appsRes, orgsRes, chatsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .or(`display_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
        .neq('id', session?.user?.id || '')
        .limit(5),
      supabase
        .from('apps')
        .select('id, name, icon, is_public, owner_id')
        .ilike('name', searchTerm)
        .limit(5),
      supabase
        .from('organizations')
        .select('id, name, icon, bio')
        .ilike('name', searchTerm)
        .limit(5),
      supabase
        .from('chat_groups')
        .select('id, name, icon, type')
        .ilike('name', searchTerm)
        .limit(5),
    ]);

    setUsers(usersRes.data || []);
    setApps(appsRes.data || []);
    setOrgs(orgsRes.data || []);
    setChats(chatsRes.data || []);
    setLoading(false);
  }

  function clear() {
    setQuery('');
    setUsers([]);
    setApps([]);
    setOrgs([]);
    setChats([]);
    setOpen(false);
  }

  const totalResults = users.length + apps.length + orgs.length + chats.length;

  const categories: { key: SearchCategory; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Alles', icon: <Search className="h-3 w-3" />, count: totalResults },
    { key: 'users', label: 'Gebruikers', icon: <User className="h-3 w-3" />, count: users.length },
    { key: 'apps', label: 'Apps', icon: <AppWindow className="h-3 w-3" />, count: apps.length },
    { key: 'orgs', label: 'Bedrijven', icon: <Building2 className="h-3 w-3" />, count: orgs.length },
    { key: 'chats', label: 'Chats', icon: <MessageCircle className="h-3 w-3" />, count: chats.length },
  ];

  const showUsers = category === 'all' || category === 'users';
  const showApps = category === 'all' || category === 'apps';
  const showOrgs = category === 'all' || category === 'orgs';
  const showChats = category === 'all' || category === 'chats';

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (totalResults > 0) setOpen(true); }}
          placeholder="Zoek gebruikers, apps, bedrijven, chats..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border/40 bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
        />
        {query && (
          <button onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground/50 hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl border border-border/40 bg-card shadow-2xl shadow-primary/5 overflow-hidden animate-scale-in">
          {/* Category tabs */}
          {!loading && totalResults > 0 && (
            <div className="flex gap-1 px-3 pt-3 pb-2 border-b border-border/20 overflow-x-auto">
              {categories.filter(c => c.key === 'all' || c.count > 0).map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                    category === cat.key
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                  {cat.count > 0 && <span className="text-[10px] opacity-60">{cat.count}</span>}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : totalResults === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Geen resultaten gevonden</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {/* Users */}
              {showUsers && users.length > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 pt-3 pb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">Gebruikers</span>
                    </div>
                  )}
                  {users.map(user => {
                    const initials = user.display_name?.slice(0, 2).toUpperCase() || '??';
                    return (
                      <div key={user.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors group">
                        <div className="cursor-pointer shrink-0" onClick={() => { navigate(`/profiel/${user.username || user.id}`); setOpen(false); clear(); }}>
                          <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                            {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.display_name || ''} className="object-cover" /> : null}
                            <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-primary/30 to-accent/20 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { navigate(`/profiel/${user.username || user.id}`); setOpen(false); clear(); }}>
                          <p className="text-sm font-medium text-foreground truncate">{user.display_name || 'Anoniem'}</p>
                          {user.username && <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>}
                        </div>
                        <div className="shrink-0" onClick={e => e.stopPropagation()}>
                          <FriendButton targetUserId={user.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Apps */}
              {showApps && apps.length > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 pt-3 pb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">Apps</span>
                    </div>
                  )}
                  {apps.map(app => (
                    <div
                      key={app.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors cursor-pointer"
                      onClick={() => {
                        if (app.owner_id === session?.user?.id) {
                          navigate(`/editor/${app.id}`);
                        } else if (app.is_public) {
                          navigate(`/preview/${app.id}`);
                        }
                        setOpen(false);
                        clear();
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shrink-0">
                        <AppIcon iconName={app.icon || 'file-code'} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{app.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {app.owner_id === session?.user?.id ? 'Mijn app' : app.is_public ? 'Publieke app' : 'Gedeeld'}
                        </p>
                      </div>
                      <AppWindow className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Organizations */}
              {showOrgs && orgs.length > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 pt-3 pb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">Bedrijven</span>
                    </div>
                  )}
                  {orgs.map(org => (
                    <div
                      key={org.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors cursor-pointer"
                      onClick={() => { navigate('/organization'); setOpen(false); clear(); }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center text-accent-foreground shrink-0">
                        <span className="text-base">{org.icon || '🏢'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                        {org.bio && <p className="text-[11px] text-muted-foreground truncate">{org.bio}</p>}
                      </div>
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Chat groups */}
              {showChats && chats.length > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 pt-3 pb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">Chats</span>
                    </div>
                  )}
                  {chats.map(chat => (
                    <div
                      key={chat.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors cursor-pointer"
                      onClick={() => { navigate('/groepen'); setOpen(false); clear(); }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center text-foreground shrink-0 text-sm">
                        {chat.icon || '💬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{chat.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {chat.type === 'friend_group' ? 'Vriendengroep' : chat.type === 'org_channel' ? 'Bedrijfskanaal' : 'Privégroep'}
                        </p>
                      </div>
                      <MessageCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
