import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Users, Copy, ArrowLeft, Crown, Shield, User, Trash2, LogIn, AppWindow, Coins, ArrowUpCircle, ArrowDownCircle, MessageCircle, Megaphone, Pencil, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { CoinConfirmDialog } from '@/components/CoinConfirmDialog';
import { AppIcon, IconPicker } from '@/components/IconPicker';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { OrgChat } from '@/components/OrgChat';
import { AdBanner } from '@/components/AdBanner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCached, setCache, clearCache, CACHE_TTL } from '@/lib/cache';

interface Organization {
  id: string;
  name: string;
  join_code: string;
  owner_id: string;
  created_at: string;
  icon?: string;
}

interface OrgMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

interface OrgApp {
  id: string;
  name: string;
  updated_at: string;
}

interface OrgCoin {
  id: string;
  organization_id: string;
  name: string;
  balance: number;
  updated_at: string;
}


export default function OrganizationPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null; bio: string | null }>>({});
  const [orgApps, setOrgApps] = useState<OrgApp[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [orgCoins, setOrgCoins] = useState<OrgCoin[]>([]);
  
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txProcessing, setTxProcessing] = useState(false);
  const [iconPickerOrgId, setIconPickerOrgId] = useState<string | null>(null);

  // Ad management
  const [orgAd, setOrgAd] = useState<{ id: string; emoji: string; title: string; description: string; url: string } | null>(null);
  const [showAdForm, setShowAdForm] = useState(false);
  const [adEmoji, setAdEmoji] = useState('🚀');
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adSaving, setAdSaving] = useState(false);

  // Solliciteren state
  const [showApply, setShowApply] = useState(false);
  const [allPublicOrgs, setAllPublicOrgs] = useState<Organization[]>([]);
  const [applySearch, setApplySearch] = useState('');
  const [applying, setApplying] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<{ id: string; organization_id: string; status: string }[]>([]);
  
  // Join requests for org owners/admins
  const [joinRequests, setJoinRequests] = useState<{ id: string; user_id: string; status: string; created_at: string }[]>([]);
  const [requestProfiles, setRequestProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});

  useEffect(() => { fetchOrgs(); fetchMyRequests(); }, []);

  async function fetchOrgs() {
    const cacheKey = `orgs-list:${session?.user?.id}`;
    const cached = getCached<Organization[]>(cacheKey, CACHE_TTL.medium);
    if (cached) { setOrgs(cached); setLoading(false); return; }
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      setOrgs((data as unknown as Organization[]) || []);
      setCache(cacheKey, (data as unknown as Organization[]) || []);
    }
    setLoading(false);
  }

  async function createOrg() {
    if (!newOrgName.trim() || !session?.user?.id) return;
    if (orgs.length >= 3) {
      toast({ title: 'Limiet bereikt', description: 'Je kunt maximaal 3 bedrijven joinen of aanmaken.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({ name: newOrgName.trim(), owner_id: session.user.id })
        .select()
        .single();
      if (error) throw error;

      // Add owner as member with 'owner' role
      const org = data as unknown as Organization;
      await supabase
        .from('organization_members')
        .insert({ organization_id: org.id, user_id: session.user.id, role: 'owner' as any });

      // Start bedrijf met 1000 coins
      await supabase.from('org_coins').insert({
        organization_id: org.id,
        name: 'coins',
        balance: 1000,
      } as any);

      // Log de initiële storting
      await supabase.from('org_coin_transactions').insert({
        organization_id: org.id,
        coin_name: 'coins',
        amount: 1000,
        type: 'deposit',
        user_id: session.user.id,
        note: 'Startsaldo bedrijf',
      } as any);

      toast({ title: 'Bedrijf aangemaakt!', description: `"${org.name}" is klaar met 1000 startcoins.` });
      setNewOrgName('');
      setShowCreate(false);
      clearCache(`orgs-list:${session.user.id}`);
      fetchOrgs();
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message || 'Onbekende fout', variant: 'destructive' });
    }
    setCreating(false);
  }

  async function joinOrg() {
    if (!joinCode.trim()) return;
    if (orgs.length >= 3) {
      toast({ title: 'Limiet bereikt', description: 'Je kunt maximaal 3 bedrijven joinen of aanmaken.', variant: 'destructive' });
      return;
    }
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_organization_by_code', { _code: joinCode.trim() });
      if (error) throw error;
      toast({ title: 'Gejoind!', description: 'Je bent toegevoegd aan het bedrijf.' });
      setJoinCode('');
      setShowJoin(false);
      clearCache(`orgs-list:${session?.user?.id}`);
      fetchOrgs();
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message || 'Ongeldige code', variant: 'destructive' });
    }
    setJoining(false);
  }

  async function fetchMyRequests() {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('org_join_requests' as any).select('id, organization_id, status').eq('user_id', session.user.id);
    setMyRequests((data as any[]) || []);
  }

  async function loadPublicOrgs() {
    // Load all orgs (we'll use admin edge function or just show orgs user is not in)
    // For simplicity, load all org names via a search
    const { data } = await supabase.from('organizations').select('id, name, join_code, owner_id, created_at, icon');
    // Filter out orgs user is already in
    const myOrgIds = new Set(orgs.map(o => o.id));
    setAllPublicOrgs(((data as unknown as Organization[]) || []).filter(o => !myOrgIds.has(o.id)));
  }

  async function sendJoinRequest(orgId: string) {
    if (!session?.user?.id || applying) return;
    setApplying(orgId);
    const { error } = await supabase.from('org_join_requests' as any).insert({
      organization_id: orgId,
      user_id: session.user.id,
    } as any);
    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast({ title: 'Al gesolliciteerd', description: 'Je hebt al een verzoek gestuurd.', variant: 'destructive' });
      } else {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: '📩 Verzoek verstuurd!', description: 'De eigenaar kan je verzoek accepteren.' });
      fetchMyRequests();
    }
    setApplying(null);
  }

  async function loadJoinRequests(orgId: string) {
    const { data } = await supabase.from('org_join_requests' as any).select('id, user_id, status, created_at').eq('organization_id', orgId).eq('status', 'pending');
    const reqs = (data as any[]) || [];
    setJoinRequests(reqs);
    // Load profiles
    const userIds = reqs.map((r: any) => r.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
      const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      (profiles || []).forEach(p => { map[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
      setRequestProfiles(map);
    }
  }

  async function handleJoinRequest(requestId: string, action: 'accepted' | 'rejected') {
    const req = joinRequests.find(r => r.id === requestId);
    if (!req || !selectedOrg) return;
    
    if (action === 'accepted') {
      // Add user as member
      const { error: memberErr } = await supabase.from('organization_members').insert({
        organization_id: selectedOrg.id,
        user_id: req.user_id,
        role: 'member' as any,
      });
      if (memberErr) {
        toast({ title: 'Fout', description: memberErr.message, variant: 'destructive' });
        return;
      }
    }
    
    // Update request status
    await supabase.from('org_join_requests' as any).update({ status: action, updated_at: new Date().toISOString() } as any).eq('id', requestId);
    toast({ title: action === 'accepted' ? '✅ Geaccepteerd!' : '❌ Geweigerd' });
    loadJoinRequests(selectedOrg.id);
    if (action === 'accepted') viewMembers(selectedOrg);
  }

  async function viewMembers(org: Organization) {
    setSelectedOrg(org);
    setLoadingMembers(true);
    setShowDeposit(false);
    setShowWithdraw(false);
    const [membersRes, appsRes, coinsRes, adsRes] = await Promise.all([
      supabase.from('organization_members').select('*').eq('organization_id', org.id).order('created_at', { ascending: true }),
      supabase.from('apps').select('id, name, updated_at').eq('organization_id', org.id as any).order('updated_at', { ascending: false }),
      supabase.from('org_coins').select('*').eq('organization_id', org.id),
      supabase.from('ads' as any).select('*').eq('organization_id', org.id),
    ]);
    if (!membersRes.error) {
      const mems = (membersRes.data as unknown as OrgMember[]) || [];
      setMembers(mems);
      const userIds = mems.map(m => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url, bio').in('id', userIds);
        if (profiles) {
          const map: Record<string, { display_name: string | null; avatar_url: string | null; bio: string | null }> = {};
          for (const p of profiles) {
            map[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url, bio: (p as any).bio ?? null };
          }
          setMemberProfiles(map);
        }
      }
    }
    if (!appsRes.error) setOrgApps((appsRes.data as unknown as OrgApp[]) || []);
    if (!coinsRes.error) setOrgCoins((coinsRes.data as unknown as OrgCoin[]) || []);
    if (!adsRes.error && adsRes.data && adsRes.data.length > 0) {
      const ad = adsRes.data[0] as any;
      setOrgAd({ id: ad.id, emoji: ad.emoji, title: ad.title, description: ad.description, url: ad.url });
    } else {
      setOrgAd(null);
    }
    setShowAdForm(false);
    setLoadingMembers(false);
    // Load join requests for owner/admin
    loadJoinRequests(org.id);
  }

  const [personalCoins, setPersonalCoins] = useState(0);
  const [coinConfirm, setCoinConfirm] = useState<{ open: boolean; amount: number; description: string; onConfirm: () => void }>({ open: false, amount: 0, description: '', onConfirm: () => {} });

  async function fetchPersonalCoins() {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('user_coins').select('balance').eq('user_id', session.user.id).maybeSingle();
    setPersonalCoins(data?.balance ?? 0);
  }

  useEffect(() => {
    fetchPersonalCoins();
  }, [session?.user?.id, showDeposit, showWithdraw, txProcessing]);

  async function handleCoinTransaction(type: 'deposit' | 'withdraw') {
    if (!selectedOrg || !session?.user?.id || !txAmount.trim()) return;
    const amount = parseInt(txAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Fout', description: 'Voer een geldig bedrag in', variant: 'destructive' });
      return;
    }

    // Check personal balance for deposits
    if (type === 'deposit' && personalCoins < amount) {
      toast({ title: 'Onvoldoende persoonlijk saldo', description: `Je hebt maar ${personalCoins} coins`, variant: 'destructive' });
      return;
    }

    // Server-side role check for withdrawals
    if (type === 'withdraw') {
      const myMember = members.find(m => m.user_id === session.user.id);
      if (!myMember || (myMember.role !== 'owner' && myMember.role !== 'admin')) {
        toast({ title: 'Geen toegang', description: 'Alleen admins en owners mogen coins opnemen', variant: 'destructive' });
        return;
      }
    }

    // Show confirmation dialog before proceeding
    const description = type === 'deposit'
      ? `${amount} coins storten naar ${selectedOrg.name}`
      : `${amount} coins opnemen uit ${selectedOrg.name}`;

    setCoinConfirm({
      open: true,
      amount,
      description,
      onConfirm: () => executeCoinTransaction(type, amount),
    });
  }

  async function executeCoinTransaction(type: 'deposit' | 'withdraw', amount: number) {
    if (!selectedOrg || !session?.user?.id) return;
    setTxProcessing(true);
    try {
      // Get or create coin record
      let coin = orgCoins.find(c => c.name === 'coins');
      if (!coin) {
        const { data, error } = await supabase.from('org_coins')
          .insert({ organization_id: selectedOrg.id, name: 'coins', balance: 0 } as any)
          .select()
          .single();
        if (error) throw error;
        coin = data as unknown as OrgCoin;
      }

      const currentBalance = coin.balance;
      if (type === 'withdraw' && currentBalance < amount) {
        toast({ title: 'Onvoldoende saldo', description: `Kluis heeft maar ${currentBalance} coins`, variant: 'destructive' });
        setTxProcessing(false);
        return;
      }

      const newBalance = type === 'deposit' ? currentBalance + amount : currentBalance - amount;

      // Update org balance
      const { error: updateErr } = await supabase.from('org_coins')
        .update({ balance: newBalance, updated_at: new Date().toISOString() } as any)
        .eq('id', coin.id);
      if (updateErr) throw updateErr;

      // Transfer personal coins via user_coins table
      const { data: userCoinRow } = await supabase.from('user_coins').select('id, balance').eq('user_id', session.user.id).maybeSingle();
      const currentUserBalance = userCoinRow?.balance ?? 0;
      const newUserBalance = type === 'deposit' ? currentUserBalance - amount : currentUserBalance + amount;
      if (userCoinRow) {
        await supabase.from('user_coins').update({ balance: Math.max(0, newUserBalance), updated_at: new Date().toISOString() }).eq('id', userCoinRow.id);
      }
      await fetchPersonalCoins();

      // Log transaction
      await supabase.from('org_coin_transactions').insert({
        organization_id: selectedOrg.id,
        coin_name: 'coins',
        amount,
        type,
        user_id: session.user.id,
        note: txNote || (type === 'deposit' ? 'Storting vanuit persoonlijk saldo' : 'Opname naar persoonlijk saldo'),
      } as any);

      toast({ title: type === 'deposit' ? '💰 Gestort!' : '💸 Opgenomen!', description: `${amount} coins ${type === 'deposit' ? 'overgedragen naar bedrijf' : 'overgedragen naar jou'}` });
      setTxAmount('');
      setTxNote('');
      setShowDeposit(false);
      setShowWithdraw(false);
      viewMembers(selectedOrg);
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
    setTxProcessing(false);
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      setMembers(members.filter(m => m.id !== memberId));
      toast({ title: 'Verwijderd' });
    }
  }

  async function updateRole(memberId: string, newRole: 'admin' | 'member') {
    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole as any })
      .eq('id', memberId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    }
  }

  async function changeOrgIcon(orgId: string, icon: string) {
    const { error } = await supabase.from('organizations').update({ icon } as any).eq('id', orgId);
    if (!error) {
      setOrgs(orgs.map(o => o.id === orgId ? { ...o, icon } : o));
      if (selectedOrg?.id === orgId) setSelectedOrg({ ...selectedOrg, icon });
    }
    setIconPickerOrgId(null);
  }

  async function saveOrgAd() {
    if (!selectedOrg || !adTitle.trim()) return;
    setAdSaving(true);
    const adData = {
      organization_id: selectedOrg.id,
      emoji: adEmoji || '🚀',
      title: adTitle.trim(),
      description: adDescription.trim(),
      url: adUrl.trim(),
      is_active: true,
      pages: ['dashboard', 'organizations'],
    };
    if (orgAd) {
      const { error } = await supabase.from('ads' as any).update(adData).eq('id', orgAd.id);
      if (error) {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      } else {
        setOrgAd({ id: orgAd.id, ...adData });
        setShowAdForm(false);
        toast({ title: 'Advertentie bijgewerkt!' });
      }
    } else {
      const { data, error } = await supabase.from('ads' as any).insert(adData).select().single();
      if (error) {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      } else if (data) {
        setOrgAd({ id: (data as any).id, ...adData });
        setShowAdForm(false);
        toast({ title: 'Advertentie aangemaakt!' });
      }
    }
    setAdSaving(false);
  }

  async function deleteOrgAd() {
    if (!orgAd) return;
    if (!confirm('Weet je zeker dat je de advertentie wilt verwijderen?')) return;
    const { error } = await supabase.from('ads' as any).delete().eq('id', orgAd.id);
    if (!error) {
      setOrgAd(null);
      setShowAdForm(false);
      toast({ title: 'Advertentie verwijderd' });
    }
  }

  async function deleteOrg(org: Organization) {
    if (!confirm(`Weet je zeker dat je "${org.name}" wilt verwijderen?`)) return;
    const { error } = await supabase.from('organizations').delete().eq('id', org.id);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      setOrgs(orgs.filter(o => o.id !== org.id));
      if (selectedOrg?.id === org.id) setSelectedOrg(null);
      toast({ title: 'Verwijderd' });
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast({ title: 'Gekopieerd!', description: 'Bedrijfscode gekopieerd naar klembord.' });
  }

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="h-4 w-4 text-yellow-400" />;
    if (role === 'admin') return <Shield className="h-4 w-4 text-primary" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  const roleLabel = (role: string) => {
    if (role === 'owner') return 'Eigenaar';
    if (role === 'admin') return 'Admin';
    return 'Lid';
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between backdrop-blur-sm" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">Bedrijven</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <AdBanner className="mb-6" page="organizations" />
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-6 sm:mb-10">
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); }}
            disabled={orgs.length >= 3}
            className="flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold transition-all bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> Bedrijf starten
          </button>
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); }}
            disabled={orgs.length >= 3}
            className="flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold transition-all border border-border text-foreground hover:bg-secondary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="h-4 w-4" /> Bedrijf joinen
          </button>
          <button
            onClick={() => { setShowApply(true); setShowCreate(false); setShowJoin(false); loadPublicOrgs(); }}
            disabled={orgs.length >= 3}
            className="flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold transition-all border border-border text-foreground hover:bg-secondary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="h-4 w-4" /> Solliciteren
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${i < orgs.length ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-medium">{orgs.length}/3</span>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-xl border border-border/50 p-6 mb-8" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-lg font-bold text-foreground mb-4">Nieuw bedrijf starten</h3>
            <input
              autoFocus
              placeholder="Bedrijfsnaam..."
              value={newOrgName}
              onChange={e => setNewOrgName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createOrg()}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={createOrg} disabled={creating || !newOrgName.trim()} className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                {creating ? 'Aanmaken...' : 'Aanmaken'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
            </div>
          </div>
        )}

        {/* Join form */}
        {showJoin && (
          <div className="rounded-xl border border-border/50 p-6 mb-8" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-lg font-bold text-foreground mb-4">Bedrijf joinen met code</h3>
            <input
              autoFocus
              placeholder="Voer bedrijfscode in..."
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinOrg()}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4 font-mono tracking-wider"
            />
            <div className="flex gap-3">
              <button onClick={joinOrg} disabled={joining || !joinCode.trim()} className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                {joining ? 'Joinen...' : 'Joinen'}
              </button>
              <button onClick={() => setShowJoin(false)} className="px-5 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
            </div>
          </div>
        )}

        {/* Solliciteren form */}
        {showApply && (
          <div className="rounded-xl border border-border/50 p-6 mb-8" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-lg font-bold text-foreground mb-4">Solliciteren bij een bedrijf</h3>
            <input
              autoFocus
              placeholder="Zoek bedrijf op naam..."
              value={applySearch}
              onChange={e => setApplySearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allPublicOrgs
                .filter(o => !applySearch || o.name.toLowerCase().includes(applySearch.toLowerCase()))
                .map(o => {
                  const existing = myRequests.find(r => r.organization_id === o.id);
                  return (
                    <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background/50">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">
                        {o.icon || '🏢'}
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1 truncate">{o.name}</span>
                      {existing ? (
                        <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${
                          existing.status === 'pending' ? 'bg-yellow-500/15 text-yellow-600' :
                          existing.status === 'accepted' ? 'bg-green-500/15 text-green-600' :
                          'bg-destructive/15 text-destructive'
                        }`}>
                          {existing.status === 'pending' ? '⏳ Wachtend' : existing.status === 'accepted' ? '✅ Geaccepteerd' : '❌ Geweigerd'}
                        </span>
                      ) : (
                        <button
                          onClick={() => sendJoinRequest(o.id)}
                          disabled={applying === o.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                        >
                          {applying === o.id ? 'Bezig...' : 'Solliciteren'}
                        </button>
                      )}
                    </div>
                  );
                })}
              {allPublicOrgs.filter(o => !applySearch || o.name.toLowerCase().includes(applySearch.toLowerCase())).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Geen bedrijven gevonden.</p>
              )}
            </div>
            <button onClick={() => setShowApply(false)} className="mt-4 px-5 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
              Sluiten
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="rounded-xl border border-border/40 p-16 text-center" style={{ background: 'hsl(var(--card))' }}>
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Je bent nog niet bij een bedrijf.</p>
            <p className="text-sm text-muted-foreground">Start een nieuw bedrijf of join er een met een code.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orgs.map(org => (
              <div
                key={org.id}
                className={`rounded-xl border p-5 transition-all cursor-pointer ${selectedOrg?.id === org.id ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-border/40 hover:border-primary/30'}`}
                style={{ background: 'hsl(var(--card))' }}
                onClick={() => viewMembers(org)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); setIconPickerOrgId(org.id); }}
                      className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0 text-accent hover:from-accent/30 hover:to-accent/10 transition-colors"
                      title="Icoon wijzigen"
                    >
                      <AppIcon iconName={org.icon || 'building-2'} size={20} />
                    </button>
                    <div>
                      <h3 className="font-semibold text-foreground">{org.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {org.owner_id === session?.user?.id ? 'Eigenaar' : 'Lid'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-13 sm:ml-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => copyCode(org.join_code)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Kopieer bedrijfscode"
                    >
                      <Copy className="h-3 w-3" />
                      {org.join_code}
                    </button>
                    {org.owner_id === session?.user?.id && (
                      <button onClick={() => deleteOrg(org)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Verwijderen">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Members panel */}
        {selectedOrg && (
          <>
          <div className="mt-6 sm:mt-8 rounded-xl border border-border/50 p-4 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Leden van {selectedOrg.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Deel de code <span className="font-mono bg-secondary px-2 py-0.5 rounded text-foreground">{selectedOrg.join_code}</span> om anderen uit te nodigen.
            </p>

            {loadingMembers ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Laden...</div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen leden gevonden.</p>
            ) : (
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 bg-background/50">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Avatar className="h-7 w-7 border border-border/50 shrink-0">
                        {memberProfiles[member.user_id]?.avatar_url ? (
                          <AvatarImage src={memberProfiles[member.user_id].avatar_url!} alt="" />
                        ) : null}
                        <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">
                          {(memberProfiles[member.user_id]?.display_name || member.user_id).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {roleIcon(member.role)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground truncate">
                            {memberProfiles[member.user_id]?.display_name || `${member.user_id.slice(0, 8)}...`}
                          </span>
                          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary shrink-0">{roleLabel(member.role)}</span>
                        </div>
                        {memberProfiles[member.user_id]?.bio && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{memberProfiles[member.user_id].bio}</p>
                        )}
                      </div>
                    </div>
                    {selectedOrg.owner_id === session?.user?.id && member.role !== 'owner' && (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={e => updateRole(member.id, e.target.value as 'admin' | 'member')}
                          className="text-xs rounded-lg border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="member">Lid</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => removeMember(member.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Join Requests */}
          {joinRequests.length > 0 && (selectedOrg.owner_id === session?.user?.id || members.find(m => m.user_id === session?.user?.id && (m.role === 'owner' || m.role === 'admin'))) && (
            <div className="mt-4 sm:mt-6 rounded-xl border border-border/50 p-4 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Sollicitaties ({joinRequests.length})
              </h3>
              <div className="space-y-2">
                {joinRequests.map(req => {
                  const profile = requestProfiles[req.user_id];
                  return (
                    <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background/50">
                      <Avatar className="h-7 w-7 border border-border/50 shrink-0">
                        {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                        <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">
                          {(profile?.display_name || req.user_id).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{profile?.display_name || `${req.user_id.slice(0, 8)}...`}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleJoinRequest(req.id, 'accepted')}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-500/10 transition-colors"
                          title="Accepteren"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleJoinRequest(req.id, 'rejected')}
                          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                          title="Weigeren"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 sm:mt-6 rounded-xl border border-border/50 p-4 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <AppWindow className="h-5 w-5 text-accent" />
              Apps van {selectedOrg.name}
            </h3>
            {orgApps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen apps gekoppeld. Koppel apps via het dashboard.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {orgApps.map(app => (
                  <div
                    key={app.id}
                    onClick={() => navigate(`/editor/${app.id}`)}
                    className="rounded-lg border border-border/40 p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
                    style={{ background: 'hsl(var(--background))' }}
                  >
                    <h4 className="font-semibold text-sm text-foreground truncate">{app.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(app.updated_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advertentie */}
          {(selectedOrg.owner_id === session?.user?.id || members.find(m => m.user_id === session?.user?.id && m.role === 'admin')) && (
            <div className="mt-4 sm:mt-6 rounded-xl border border-border/50 p-4 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-accent" />
                    Advertentie
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Coins className="h-3 w-3" /> 10 coins per maand per actieve advertentie
                  </p>
                </div>
                {orgAd && !showAdForm && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setAdEmoji(orgAd.emoji); setAdTitle(orgAd.title); setAdDescription(orgAd.description); setAdUrl(orgAd.url); setShowAdForm(true); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      title="Bewerken"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={deleteOrgAd} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Verwijderen">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {orgAd && !showAdForm ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/40 p-3" style={{ background: 'hsl(var(--background))' }}>
                  <span className="text-2xl">{orgAd.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground">{orgAd.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{orgAd.description}</p>
                    {orgAd.url && <p className="text-xs text-primary truncate mt-0.5">{orgAd.url}</p>}
                  </div>
                </div>
              ) : showAdForm ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Emoji</label>
                      <EmojiPickerButton value={adEmoji} onChange={setAdEmoji} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Titel *</label>
                      <input
                        value={adTitle}
                        onChange={e => setAdTitle(e.target.value)}
                        placeholder="Jouw advertentietitel"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Beschrijving</label>
                    <input
                      value={adDescription}
                      onChange={e => setAdDescription(e.target.value)}
                      placeholder="Korte beschrijving"
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">URL (optioneel)</label>
                    <input
                      value={adUrl}
                      onChange={e => setAdUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveOrgAd}
                      disabled={adSaving || !adTitle.trim()}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {adSaving ? 'Opslaan...' : orgAd ? 'Bijwerken' : 'Aanmaken'}
                    </button>
                    <button
                      onClick={() => setShowAdForm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAdEmoji('🚀'); setAdTitle(''); setAdDescription(''); setAdUrl(''); setShowAdForm(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center"
                >
                  <Plus className="h-4 w-4" />
                  Advertentie maken (max. 1)
                </button>
              )}
            </div>
          )}

          <div className="mt-4 sm:mt-6 rounded-xl border border-border/50 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
            <div className="px-4 sm:px-6 py-3 border-b border-border/50">
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Groepschat
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Chat met alle leden van {selectedOrg.name}</p>
            </div>
            <div style={{ height: 350 }}>
              <OrgChat organizationId={selectedOrg.id} />
            </div>
          </div>

          {/* Bedrijfskluis */}
          <div className="mt-4 sm:mt-6 rounded-xl border border-border/50 p-4 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-400" />
                Bedrijfskluis
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowDeposit(!showDeposit); setShowWithdraw(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[hsl(var(--ide-success))]/10 text-[hsl(var(--ide-success))] hover:bg-[hsl(var(--ide-success))]/20 transition-colors"
                >
                  <ArrowDownCircle className="h-3.5 w-3.5" /> Storten
                </button>
                {(() => {
                  const myMember = members.find(m => m.user_id === session?.user?.id);
                  const isAdminOrOwner = myMember && (myMember.role === 'owner' || myMember.role === 'admin');
                  return isAdminOrOwner ? (
                    <button
                      onClick={() => { setShowWithdraw(!showWithdraw); setShowDeposit(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <ArrowUpCircle className="h-3.5 w-3.5" /> Opnemen
                    </button>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Balance display */}
            <div className="rounded-xl p-4 sm:p-6 mb-4 text-center" style={{ background: 'hsl(var(--background))' }}>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Totaal saldo</p>
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
                <span className="text-3xl sm:text-4xl font-bold text-foreground font-mono">
                  {orgCoins.reduce((sum, c) => sum + c.balance, 0).toLocaleString('nl-NL')}
                </span>
              </div>
              {orgCoins.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-3">
                  {orgCoins.map(c => (
                    <span key={c.id} className="text-xs text-muted-foreground">
                      {c.name}: <span className="font-mono font-semibold text-foreground">{c.balance.toLocaleString('nl-NL')}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Deposit/Withdraw form */}
            {(showDeposit || showWithdraw) && (
              <div className="rounded-lg border border-border p-4 mb-4" style={{ background: 'hsl(var(--background))' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    {showDeposit ? '💰 Coins storten (persoonlijk → bedrijf)' : '💸 Coins opnemen (bedrijf → persoonlijk)'}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Jouw saldo: <span className="font-mono font-semibold text-foreground">{personalCoins}</span>
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                  <input
                    type="number"
                    placeholder="Bedrag"
                    value={txAmount}
                    onChange={e => setTxAmount(e.target.value)}
                    min="1"
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="text"
                    placeholder="Notitie (optioneel)"
                    value={txNote}
                    onChange={e => setTxNote(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCoinTransaction(showDeposit ? 'deposit' : 'withdraw')}
                    disabled={txProcessing || !txAmount.trim()}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 ${
                      showDeposit
                        ? 'bg-[hsl(var(--ide-success))] text-white hover:bg-[hsl(var(--ide-success))]/90'
                        : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    }`}
                  >
                    {txProcessing ? 'Bezig...' : showDeposit ? 'Storten' : 'Opnemen'}
                  </button>
                  <button
                    onClick={() => { setShowDeposit(false); setShowWithdraw(false); }}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}

          </div>
          </>
        )}
      </div>
      {iconPickerOrgId && (
        <IconPicker
          value={orgs.find(o => o.id === iconPickerOrgId)?.icon || 'building-2'}
          onChange={(icon) => changeOrgIcon(iconPickerOrgId, icon)}
          onClose={() => setIconPickerOrgId(null)}
        />
      )}

      <CoinConfirmDialog
        open={coinConfirm.open}
        onOpenChange={(open) => { if (!open) setCoinConfirm(prev => ({ ...prev, open: false })); }}
        amount={coinConfirm.amount}
        description={coinConfirm.description}
        onConfirm={() => { coinConfirm.onConfirm(); setCoinConfirm(prev => ({ ...prev, open: false })); }}
      />
    </div>
  );
}

const EMOJI_LIST = ['🚀','💡','🎯','🔥','⭐','💎','🎉','🏆','💰','🪙','📱','💻','🎮','🌟','❤️','👑','🎨','📢','🛒','🎁','✨','⚡','🌈','🍀','🏠','🔔','📊','🎵','🤖','🦄'];

function EmojiPickerButton({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-14 h-10 text-center text-lg rounded-lg border border-border bg-background hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50">
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid grid-cols-6 gap-1">
          {EMOJI_LIST.map(e => (
            <button
              key={e}
              onClick={() => { onChange(e); setOpen(false); }}
              className={`w-9 h-9 text-lg rounded-lg hover:bg-secondary/70 transition-colors flex items-center justify-center ${e === value ? 'bg-primary/15 ring-1 ring-primary/40' : ''}`}
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
