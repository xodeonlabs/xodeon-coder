import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, AppWindow, ArrowLeft, Send, CheckCircle, Clock, XCircle } from 'lucide-react';
import { AppIcon } from '@/components/IconPicker';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Organization {
  id: string;
  name: string;
  owner_id: string;
  icon?: string;
  bio?: string;
  created_at: string;
}

interface MemberProfile {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  display_name?: string;
  avatar_url?: string;
}

export default function OrgProfile() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [appCount, setAppCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userOrgCount, setUserOrgCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, session?.user?.id]);

  async function load() {
    setLoading(true);

    // Load organization
    const { data: orgData } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    if (!orgData) {
      setLoading(false);
      return;
    }
    setOrg(orgData);

    // Load members with profiles
    const { data: memberData } = await supabase.from('organization_members').select('user_id, role').eq('organization_id', orgId);
    if (memberData && memberData.length > 0) {
      const userIds = memberData.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      setMembers(memberData.map(m => ({
        user_id: m.user_id,
        role: m.role,
        display_name: profileMap.get(m.user_id)?.display_name || undefined,
        avatar_url: profileMap.get(m.user_id)?.avatar_url || undefined,
      })));

      // Check if current user is member
      if (session?.user?.id) {
        setIsMember(memberData.some(m => m.user_id === session.user.id));
      }
    }

    // Load app count
    const { count } = await supabase.from('apps').select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
    setAppCount(count || 0);

    // Check user's org count
    if (session?.user?.id) {
      const { count: userCount } = await supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id);
      setUserOrgCount(userCount || 0);

      // Check existing request
      const { data: reqData } = await supabase.from('org_join_requests').select('status').eq('organization_id', orgId).eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (reqData) {
        setRequestStatus(reqData.status as any);
      }
    }

    setLoading(false);
  }

  async function applyToJoin() {
    if (!session?.user?.id || !orgId) return;
    setApplying(true);

    const { error } = await supabase.from('org_join_requests').insert({
      organization_id: orgId,
      user_id: session.user.id,
    });

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Aanvraag verstuurd!', description: 'Je sollicitatie is ingediend. Wacht op goedkeuring.' });
      setRequestStatus('pending');
    }
    setApplying(false);
  }

  const canApply = session?.user?.id && !isMember && userOrgCount < 3 && requestStatus === 'none';
  const atLimit = userOrgCount >= 3;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Bedrijf niet gevonden</p>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Terug
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-4" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10">
              {org.icon ? <span className="text-2xl">{org.icon}</span> : <Building2 className="h-6 w-6 text-primary" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{org.name}</h1>
              <p className="text-xs text-muted-foreground">Bedrijfsprofiel</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Main card */}
        <div className="rounded-2xl border border-border/40 p-6 mb-6" style={{ background: 'hsl(var(--card))' }}>
          {/* Bio */}
          {org.bio && (
            <p className="text-sm text-muted-foreground mb-6">{org.bio}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-secondary/30 p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{members.length}</p>
              <p className="text-[11px] text-muted-foreground">Leden</p>
            </div>
            <div className="rounded-xl bg-secondary/30 p-4 text-center">
              <AppWindow className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{appCount}</p>
              <p className="text-[11px] text-muted-foreground">Apps</p>
            </div>
          </div>

          {/* Apply section */}
          {session?.user?.id ? (
            <div className="border-t border-border/30 pt-5">
              {isMember ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  Je bent lid van dit bedrijf
                </div>
              ) : requestStatus === 'pending' ? (
                <div className="flex items-center gap-2 text-sm text-amber-500">
                  <Clock className="h-4 w-4" />
                  Je sollicitatie wordt beoordeeld
                </div>
              ) : requestStatus === 'rejected' ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  Je sollicitatie is afgewezen
                </div>
              ) : atLimit ? (
                <div className="text-sm text-muted-foreground">
                  Je zit al in 3/3 bedrijven. Verlaat eerst een bedrijf om te kunnen solliciteren.
                </div>
              ) : (
                <button
                  onClick={applyToJoin}
                  disabled={applying}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {applying ? 'Versturen...' : 'Solliciteren'}
                </button>
              )}
            </div>
          ) : (
            <div className="border-t border-border/30 pt-5">
              <p className="text-sm text-muted-foreground">
                <button onClick={() => navigate('/auth')} className="text-primary hover:underline">Log in</button> om te solliciteren bij dit bedrijf.
              </p>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="rounded-2xl border border-border/40 p-6" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Leden ({members.length})
          </h2>
          <div className="space-y-2">
            {members.map(m => (
              <div
                key={m.user_id}
                onClick={() => navigate(`/profiel/${m.user_id}`)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 cursor-pointer transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(m.display_name || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{m.display_name || 'Anoniem'}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
