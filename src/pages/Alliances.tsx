import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Handshake, Users, MessageCircle, Coins, Send, BarChart3, Building2, Eye, Plus, Trash2, UserPlus, icons } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Alliance {
  id: string;
  name: string;
  icon: string;
  created_at: string;
  created_by: string;
}

interface AllianceMember {
  id: string;
  alliance_id: string;
  organization_id: string;
  joined_at: string;
}

interface AllianceCoin {
  id: string;
  alliance_id: string;
  balance: number;
}

interface ChatMsg {
  id: string;
  alliance_id: string;
  user_id: string;
  organization_id: string;
  content: string;
  created_at: string;
}

interface OrgInfo {
  id: string;
  name: string;
  icon: string | null;
}

interface AppView {
  app_id: string;
  viewed_at: string;
}

export default function Alliances() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlliance, setSelectedAlliance] = useState<Alliance | null>(null);
  const [members, setMembers] = useState<AllianceMember[]>([]);
  const [orgs, setOrgs] = useState<Record<string, OrgInfo>>({});
  const [coins, setCoins] = useState<AllianceCoin | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'overzicht' | 'chat' | 'apps' | 'stats'>('overzicht');
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null }>>({});
  const [sharedApps, setSharedApps] = useState<{ id: string; name: string; org_name: string; views: number }[]>([]);
  const [orgStats, setOrgStats] = useState<{ name: string; views: number }[]>([]);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, string>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Org owner state (replaces admin-only)
  const [isOrgOwner, setIsOrgOwner] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🤝');
  const [creating, setCreating] = useState(false);
  const [allOrgs, setAllOrgs] = useState<OrgInfo[]>([]);
  const [myOwnedOrgs, setMyOwnedOrgs] = useState<OrgInfo[]>([]);
  const [selectedOrgForCreate, setSelectedOrgForCreate] = useState('');
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [addOrgId, setAddOrgId] = useState('');
  const [vaultAmount, setVaultAmount] = useState('');
  const [vaultLoading, setVaultLoading] = useState(false);

  useEffect(() => {
    loadAlliances();
    checkAdmin();
  }, [session?.user?.id]);

  async function checkAdmin() {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('organizations').select('id, name, icon').eq('owner_id', session.user.id);
    const owned = (data as unknown as OrgInfo[]) || [];
    setMyOwnedOrgs(owned);
    setIsOrgOwner(owned.length > 0);
    if (owned.length > 0) setSelectedOrgForCreate(owned[0].id);
  }

  async function createAlliance() {
    if (!newName.trim() || !session?.user?.id || creating || !selectedOrgForCreate) return;
    setCreating(true);
    const { data: inserted, error } = await supabase.from('alliances' as any).insert({
      name: newName.trim(),
      icon: newIcon,
      created_by: session.user.id,
    } as any).select('id').single();
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else if (inserted) {
      const allianceId = (inserted as any).id;
      await supabase.from('alliance_coins' as any).insert({ alliance_id: allianceId, balance: 0 } as any);
      // Add own org
      await supabase.from('alliance_members' as any).insert({ alliance_id: allianceId, organization_id: selectedOrgForCreate } as any);
      // Add partner org if selected
      if (inviteOrgId && inviteOrgId !== selectedOrgForCreate) {
        await supabase.from('alliance_members' as any).insert({ alliance_id: allianceId, organization_id: inviteOrgId } as any);
      }
      toast({ title: '✅ Alliantie aangemaakt!' });
      setNewName('');
      setNewIcon('🤝');
      setInviteOrgId('');
      setShowCreate(false);
      loadAlliances();
    }
    setCreating(false);
  }

  async function vaultTransaction(type: 'deposit' | 'withdraw') {
    const amount = parseInt(vaultAmount);
    if (!amount || amount <= 0 || !selectedAlliance || !userOrgId || vaultLoading) return;
    setVaultLoading(true);
    try {
      // Get org coin balance
      const { data: orgCoin } = await supabase.from('org_coins').select('id, balance').eq('organization_id', userOrgId).maybeSingle();
      if (!orgCoin) { toast({ title: 'Fout', description: 'Geen kluis gevonden voor je bedrijf', variant: 'destructive' }); setVaultLoading(false); return; }

      const allianceCoins = coins?.balance ?? 0;

      if (type === 'deposit') {
        if (orgCoin.balance < amount) { toast({ title: 'Onvoldoende saldo', description: `Je bedrijf heeft maar ${orgCoin.balance} coins.`, variant: 'destructive' }); setVaultLoading(false); return; }
        // Deduct from org
        await supabase.from('org_coins').update({ balance: orgCoin.balance - amount } as any).eq('id', orgCoin.id);
        // Add to alliance
        await supabase.from('alliance_coins' as any).update({ balance: allianceCoins + amount } as any).eq('alliance_id', selectedAlliance.id);
        setCoins(coins ? { ...coins, balance: allianceCoins + amount } : null);
      } else {
        if (allianceCoins < amount) { toast({ title: 'Onvoldoende saldo', description: `De alliantie kluis heeft maar ${allianceCoins} coins.`, variant: 'destructive' }); setVaultLoading(false); return; }
        // Deduct from alliance
        await supabase.from('alliance_coins' as any).update({ balance: allianceCoins - amount } as any).eq('alliance_id', selectedAlliance.id);
        // Add to org
        await supabase.from('org_coins').update({ balance: orgCoin.balance + amount } as any).eq('id', orgCoin.id);
        setCoins(coins ? { ...coins, balance: allianceCoins - amount } : null);
      }
      toast({ title: type === 'deposit' ? '💰 Gestort!' : '💸 Opgenomen!' });
      setVaultAmount('');
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
    setVaultLoading(false);
  }

  async function deleteAlliance(id: string) {
    if (!confirm('Weet je zeker dat je deze alliantie wilt verwijderen?')) return;
    const { error, status } = await supabase.from('alliances' as any).delete().eq('id', id);
    console.log('Delete alliance result:', { error, status, id });
    if (error) {
      toast({ title: 'Fout bij verwijderen', description: error.message, variant: 'destructive' });
    } else {
      if (selectedAlliance?.id === id) setSelectedAlliance(null);
      toast({ title: '🗑️ Alliantie verwijderd' });
      loadAlliances();
    }
  }

  async function loadAllOrgs() {
    const { data } = await supabase.from('organizations').select('id, name, icon');
    setAllOrgs((data as unknown as OrgInfo[]) || []);
  }

  async function addOrgToAlliance() {
    if (!selectedAlliance || !addOrgId) return;
    const { error } = await supabase.from('alliance_members' as any).insert({ alliance_id: selectedAlliance.id, organization_id: addOrgId } as any);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Bedrijf toegevoegd!' });
      setAddOrgId('');
      setShowAddOrg(false);
      selectAlliance(selectedAlliance);
    }
  }

  async function removeOrgFromAlliance(memberId: string) {
    if (!confirm('Bedrijf verwijderen uit alliantie?')) return;
    const { error } = await supabase.from('alliance_members' as any).delete().eq('id', memberId);
    if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    else if (selectedAlliance) selectAlliance(selectedAlliance);
  }

  async function loadAlliances() {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('alliances' as any).select('*').order('created_at');
    const allianceList = (data as unknown as Alliance[]) || [];
    setAlliances(allianceList);
    setLoading(false);

    // Load creator profiles
    const creatorIds = [...new Set(allianceList.map(a => a.created_by))];
    if (creatorIds.length > 0) {
      const { data: profileData } = await supabase.from('profiles').select('id, display_name').in('id', creatorIds);
      const map: Record<string, string> = {};
      (profileData || []).forEach(p => { map[p.id] = p.display_name || 'Onbekend'; });
      setCreatorProfiles(map);
    }
  }

  async function selectAlliance(alliance: Alliance) {
    setSelectedAlliance(alliance);
    setTab('overzicht');

    // Load members
    const { data: memberData } = await supabase.from('alliance_members' as any).select('*').eq('alliance_id', alliance.id);
    const mems = (memberData as unknown as AllianceMember[]) || [];
    setMembers(mems);

    // Load org info
    const orgIds = mems.map(m => m.organization_id);
    if (orgIds.length > 0) {
      const { data: orgData } = await supabase.from('organizations').select('id, name, icon' as any).in('id', orgIds);
      const orgMap: Record<string, OrgInfo> = {};
      (orgData as unknown as OrgInfo[] || []).forEach(o => { orgMap[o.id] = o; });
      setOrgs(orgMap);

      // Find user's org in the alliance
      const { data: myMemberships } = await supabase.from('organization_members').select('organization_id').eq('user_id', session!.user.id).in('organization_id', orgIds);
      if (myMemberships && myMemberships.length > 0) {
        setUserOrgId(myMemberships[0].organization_id);
      }
    }

    // Load coins
    const { data: coinData } = await supabase.from('alliance_coins' as any).select('*').eq('alliance_id', alliance.id).maybeSingle();
    setCoins(coinData as unknown as AllianceCoin | null);

    // Load chat
    loadChat(alliance.id);

    // Load shared apps & stats
    loadSharedApps(alliance.id, mems);
  }

  async function loadChat(allianceId: string) {
    const { data } = await supabase
      .from('alliance_chat_messages' as any)
      .select('*')
      .eq('alliance_id', allianceId)
      .order('created_at', { ascending: true })
      .limit(100);
    const msgs = (data as unknown as ChatMsg[]) || [];
    setChatMessages(msgs);

    // Load profiles for chat users
    const userIds = [...new Set(msgs.map(m => m.user_id))];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
      const profileMap: Record<string, { display_name: string | null }> = {};
      (profileData || []).forEach(p => { profileMap[p.id] = { display_name: p.display_name }; });
      setProfiles(profileMap);
    }
  }

  async function loadSharedApps(allianceId: string, mems: AllianceMember[]) {
    const orgIds = mems.map(m => m.organization_id);
    if (orgIds.length === 0) { setSharedApps([]); setOrgStats([]); return; }

    const { data: apps } = await supabase.from('apps').select('id, name, organization_id').in('organization_id', orgIds);
    if (!apps || apps.length === 0) { setSharedApps([]); setOrgStats([]); return; }

    const appIds = apps.map(a => a.id);
    const { data: views } = await supabase.from('app_views').select('app_id, viewed_at').in('app_id', appIds);

    const viewCounts: Record<string, number> = {};
    (views || []).forEach(v => { viewCounts[v.app_id] = (viewCounts[v.app_id] || 0) + 1; });

    // Load org names for apps
    const { data: orgData } = await supabase.from('organizations').select('id, name' as any).in('id', orgIds);
    const orgNameMap: Record<string, string> = {};
    (orgData as unknown as { id: string; name: string }[] || []).forEach(o => { orgNameMap[o.id] = o.name; });

    const shared = apps.map(a => ({
      id: a.id,
      name: a.name,
      org_name: orgNameMap[a.organization_id || ''] || 'Onbekend',
      views: viewCounts[a.id] || 0,
    }));
    shared.sort((a, b) => b.views - a.views);
    setSharedApps(shared);

    // Org stats
    const statMap: Record<string, number> = {};
    shared.forEach(a => { statMap[a.org_name] = (statMap[a.org_name] || 0) + a.views; });
    setOrgStats(Object.entries(statMap).map(([name, views]) => ({ name, views })));
  }

  // Realtime chat
  useEffect(() => {
    if (!selectedAlliance) return;
    const channel = supabase
      .channel(`alliance-chat-${selectedAlliance.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alliance_chat_messages', filter: `alliance_id=eq.${selectedAlliance.id}` },
        (payload) => {
          const msg = payload.new as unknown as ChatMsg;
          setChatMessages(prev => [...prev, msg]);
          // Load profile if needed
          if (!profiles[msg.user_id]) {
            supabase.from('profiles').select('id, display_name').eq('id', msg.user_id).single()
              .then(({ data }) => {
                if (data) setProfiles(prev => ({ ...prev, [data.id]: { display_name: data.display_name } }));
              });
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAlliance?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function sendChat() {
    if (!chatInput.trim() || !selectedAlliance || !session?.user?.id || !userOrgId || sending) return;
    setSending(true);
    const { error } = await supabase.from('alliance_chat_messages' as any).insert({
      alliance_id: selectedAlliance.id,
      user_id: session.user.id,
      organization_id: userOrgId,
      content: chatInput.trim(),
    } as any);
    if (error) toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    setChatInput('');
    setSending(false);
  }

  const totalViews = sharedApps.reduce((s, a) => s + a.views, 0);
  const isAllianceOwner = selectedAlliance?.created_by === session?.user?.id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 flex items-center gap-3" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <button onClick={() => selectedAlliance ? setSelectedAlliance(null) : navigate('/')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedAlliance && isAllianceOwner ? (
            <EmojiPickerBtn
              value={selectedAlliance.icon}
              onChange={async (newIcon) => {
                await supabase.from('alliances' as any).update({ icon: newIcon } as any).eq('id', selectedAlliance.id);
                setSelectedAlliance({ ...selectedAlliance, icon: newIcon });
                setAlliances(prev => prev.map(a => a.id === selectedAlliance.id ? { ...a, icon: newIcon } : a));
              }}
            />
          ) : (
            <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
              {selectedAlliance ? <span className="text-lg">{selectedAlliance.icon}</span> : <Handshake className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground">
              {selectedAlliance ? selectedAlliance.name : 'Allianties'}
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {selectedAlliance ? `${members.length} bedrijven` : 'Samenwerkingsverbanden tussen bedrijven'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!selectedAlliance ? (
          /* Alliance list */
          <>
            {isOrgOwner && !showCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> Alliantie aanmaken
              </button>
            )}

            {isOrgOwner && showCreate && (
              <div className="mb-6 rounded-xl border border-border/40 p-5 space-y-3" style={{ background: 'hsl(var(--card))' }}>
                <h3 className="text-sm font-semibold text-foreground">Nieuwe alliantie</h3>
                <div className="flex items-center gap-3">
                  <EmojiPickerBtn value={newIcon} onChange={setNewIcon} />
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Naam van de alliantie"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Jouw bedrijf</label>
                  <select
                    value={selectedOrgForCreate}
                    onChange={e => setSelectedOrgForCreate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {myOwnedOrgs.map(o => (
                      <option key={o.id} value={o.id}>{o.icon || '🏢'} {o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Partner bedrijf (optioneel)</label>
                  <select
                    value={inviteOrgId}
                    onChange={e => setInviteOrgId(e.target.value)}
                    onFocus={() => { if (allOrgs.length === 0) loadAllOrgs(); }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Geen partner bedrijf</option>
                    {allOrgs.filter(o => o.id !== selectedOrgForCreate).map(o => (
                      <option key={o.id} value={o.id}>{o.icon || '🏢'} {o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={createAlliance} disabled={creating || !newName.trim() || !selectedOrgForCreate} className="px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                    {creating ? 'Bezig...' : 'Aanmaken'}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    Annuleren
                  </button>
                </div>
              </div>
            )}

            {alliances.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🤝</p>
                <h2 className="text-lg font-bold text-foreground mb-2">Geen allianties</h2>
                <p className="text-sm text-muted-foreground">{isOrgOwner ? 'Maak een alliantie aan met de knop hierboven.' : 'Eigenaren van een bedrijf kunnen allianties aanmaken.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {alliances.map(alliance => (
                  <div
                    key={alliance.id}
                    className="relative text-left rounded-2xl border border-border/40 p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                    style={{ background: 'hsl(var(--card))' }}
                    onClick={() => selectAlliance(alliance)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{alliance.icon}</span>
                      <h3 className="text-sm font-semibold text-foreground flex-1">{alliance.name}</h3>
                      {alliance.created_by === session?.user?.id && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteAlliance(alliance.id); }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Aangemaakt door <span className="font-medium text-foreground/70">{creatorProfiles[alliance.created_by] || 'Onbekend'}</span> · {new Date(alliance.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Alliance detail */
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
              {([
                { key: 'overzicht', label: 'Overzicht', icon: Users },
                { key: 'chat', label: 'Chat', icon: MessageCircle },
                { key: 'apps', label: 'Gedeelde Apps', icon: Building2 },
                { key: 'stats', label: 'Statistieken', icon: BarChart3 },
              ] as const).map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      tab === t.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Overzicht */}
            {tab === 'overzicht' && (
              <div className="space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Bedrijven" value={members.length} icon="🏢" />
                  <StatCard label="Gedeelde Apps" value={sharedApps.length} icon="📱" />
                  <StatCard label="Totaal Views" value={totalViews} icon="👁" />
                  <StatCard label="Alliantie Kluis" value={coins?.balance ?? 0} icon="🪙" />
                </div>

                {/* Vault */}
                {isAllianceOwner && userOrgId && (
                  <div className="rounded-xl border border-border/40 p-5" style={{ background: 'hsl(var(--card))' }}>
                    <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" /> Alliantie Kluis
                    </h2>
                    <p className="text-2xl font-bold text-foreground mb-4">{coins?.balance ?? 0} <span className="text-sm font-normal text-muted-foreground">coins</span></p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Aantal"
                        value={vaultAmount}
                        onChange={e => setVaultAmount(e.target.value)}
                        className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <button
                        onClick={() => vaultTransaction('deposit')}
                        disabled={vaultLoading || !vaultAmount}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                      >
                        Storten
                      </button>
                      <button
                        onClick={() => vaultTransaction('withdraw')}
                        disabled={vaultLoading || !vaultAmount}
                        className="px-3 py-2 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-secondary/50 disabled:opacity-40 transition-colors"
                      >
                        Opnemen
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">Storten/opnemen vanuit je bedrijfskluis</p>
                  </div>
                )}

                {/* Member orgs */}
                <div className="rounded-xl border border-border/40 p-5" style={{ background: 'hsl(var(--card))' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground">Leden</h2>
                    {userOrgId && (
                      <button
                        onClick={() => { setShowAddOrg(true); loadAllOrgs(); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <UserPlus className="h-3 w-3" /> Bedrijf uitnodigen
                      </button>
                    )}
                  </div>

                  {userOrgId && showAddOrg && (
                    <div className="mb-4 p-3 rounded-lg border border-border/30 bg-secondary/20 space-y-2">
                      <select
                        value={addOrgId}
                        onChange={e => setAddOrgId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="">Selecteer een bedrijf...</option>
                        {allOrgs.filter(o => !members.some(m => m.organization_id === o.id)).map(o => (
                          <option key={o.id} value={o.id}>{o.icon || '🏢'} {o.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={addOrgToAlliance} disabled={!addOrgId} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                          Toevoegen
                        </button>
                        <button onClick={() => setShowAddOrg(false)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                          Annuleren
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {members.map(m => {
                      const org = orgs[m.organization_id];
                      return (
                        <div key={m.id} className="flex items-center gap-3 py-2">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-accent/5 border border-primary/10 flex items-center justify-center text-sm">
                            {(() => {
                              const iconName = org?.icon;
                              if (!iconName) return '🏢';
                              // Check if it's an emoji (not a lucide name)
                              if (/\p{Emoji}/u.test(iconName) && !iconName.match(/^[a-z-]+$/)) return iconName;
                              // Render lucide icon
                              const pascalName = iconName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') as keyof typeof icons;
                              const LucideIcon = icons[pascalName];
                              return LucideIcon ? <LucideIcon className="h-4 w-4 text-primary" /> : '🏢';
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{org?.name || 'Onbekend'}</p>
                            <p className="text-[10px] text-muted-foreground">Lid sinds {new Date(m.joined_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          {isAllianceOwner && (
                            <button
                              onClick={() => removeOrgFromAlliance(m.id)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Verwijderen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Chat */}
            {tab === 'chat' && (
              <div className="rounded-xl border border-border/40 overflow-hidden flex flex-col" style={{ background: 'hsl(var(--card))', height: '500px' }}>
                <div className="px-4 py-3 border-b border-border/30">
                  <h2 className="text-sm font-semibold text-foreground">Alliantie Chat</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-3xl mb-2">💬</p>
                      <p className="text-xs text-muted-foreground">Nog geen berichten. Start het gesprek!</p>
                    </div>
                  )}
                  {chatMessages.map(msg => {
                    const isMe = msg.user_id === session?.user?.id;
                    const orgName = orgs[msg.organization_id]?.name || '';
                    const userName = profiles[msg.user_id]?.display_name || 'Gebruiker';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-[9px] text-muted-foreground mb-0.5">
                          {userName} • {orgName}
                        </span>
                        <div className={`rounded-xl px-3 py-2 text-xs max-w-[80%] break-words ${
                          isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[8px] text-muted-foreground/60 mt-0.5">
                          {new Date(msg.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>
                <div className="border-t border-border/30 p-3 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                    placeholder="Bericht naar alliantie..."
                    className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    disabled={sending || !userOrgId}
                  />
                  <button
                    onClick={sendChat}
                    disabled={sending || !chatInput.trim() || !userOrgId}
                    className="rounded-lg p-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Shared Apps */}
            {tab === 'apps' && (
              <div className="rounded-xl border border-border/40 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
                <div className="px-5 py-4 border-b border-border/30">
                  <h2 className="text-sm font-semibold text-foreground">Gedeelde Apps ({sharedApps.length})</h2>
                </div>
                {sharedApps.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <p className="text-sm">Geen apps gekoppeld aan bedrijven in deze alliantie.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {sharedApps.map(app => (
                      <div key={app.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{app.name}</p>
                          <p className="text-[10px] text-muted-foreground">{app.org_name}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">{app.views}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            {tab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Totaal Views" value={totalViews} icon="👁" />
                  <StatCard label="Gedeelde Apps" value={sharedApps.length} icon="📱" />
                  <StatCard label="Bedrijven" value={members.length} icon="🏢" />
                </div>

                {orgStats.length > 0 && (
                  <div className="rounded-xl border border-border/40 p-6" style={{ background: 'hsl(var(--card))' }}>
                    <h2 className="text-sm font-semibold text-foreground mb-4">Views per bedrijf</h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={orgStats}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              background: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: 8,
                              fontSize: 12,
                              color: 'hsl(var(--foreground))',
                            }}
                          />
                          <Bar dataKey="views" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl border border-border/40 p-4" style={{ background: 'hsl(var(--card))' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

const EMOJI_OPTIONS = ['🤝','🏢','⚡','🔥','💎','🌟','🎯','🚀','💡','🏆','👑','🎉','✨','🌈','🛡️','⭐'];

function EmojiPickerBtn({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-12 h-10 text-center text-lg rounded-lg border border-border bg-background hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50">
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="grid grid-cols-4 gap-1">
          {EMOJI_OPTIONS.map(e => (
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
