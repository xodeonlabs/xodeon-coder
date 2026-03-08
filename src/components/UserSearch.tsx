import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, X, UserPlus } from 'lucide-react';
import { FriendButton } from '@/components/FriendButton';

interface UserResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export function UserSearch() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
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
    // Sanitize: only allow letters, numbers, spaces, dots, underscores, hyphens
    const sanitized = value.replace(/[^\w\s.\-@àáâãäåèéêëìíîïòóôõöùúûüýÿñçšžœæ]/gi, '').slice(0, 50);
    setQuery(sanitized);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (sanitized.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => search(sanitized.trim()), 300);
  }

  async function search(term: string) {
    setLoading(true);
    setOpen(true);

    const searchTerm = `%${term}%`;
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username')
      .or(`display_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
      .neq('id', session?.user?.id || '')
      .limit(8);

    setResults(data || []);
    setLoading(false);
  }

  function clear() {
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Zoek gebruikers op naam of username..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border/40 bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
        />
        {query && (
          <button onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground/50 hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl border border-border/40 bg-card shadow-2xl shadow-primary/5 overflow-hidden animate-scale-in">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Geen gebruikers gevonden</p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {results.map(user => {
                const initials = user.display_name?.slice(0, 2).toUpperCase() || '??';
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors group"
                  >
                    <div
                      className="cursor-pointer shrink-0"
                      onClick={() => { navigate(`/profiel/${user.username || user.id}`); setOpen(false); clear(); }}
                    >
                      <Avatar className="h-9 w-9 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                        {user.avatar_url ? (
                          <AvatarImage src={user.avatar_url} alt={user.display_name || ''} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/30 to-accent/20 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => { navigate(`/profiel/${user.username || user.id}`); setOpen(false); clear(); }}
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.display_name || 'Anonieme gebruiker'}
                      </p>
                      {user.username && (
                        <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
                      )}
                    </div>

                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                      <FriendButton targetUserId={user.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
