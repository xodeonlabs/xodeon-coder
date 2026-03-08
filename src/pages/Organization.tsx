import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Users, Copy, ArrowLeft, Crown, Shield, User, Trash2, LogIn, AppWindow, Coins, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  join_code: string;
  owner_id: string;
  created_at: string;
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
  const [orgApps, setOrgApps] = useState<OrgApp[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [orgCoins, setOrgCoins] = useState<OrgCoin[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txProcessing, setTxProcessing] = useState(false);

  useEffect(() => { fetchOrgs(); }, []);

  async function fetchOrgs() {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      setOrgs((data as unknown as Organization[]) || []);
    }
    setLoading(false);
  }

  async function createOrg() {
    if (!newOrgName.trim() || !session?.user?.id) return;
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
      fetchOrgs();
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message || 'Onbekende fout', variant: 'destructive' });
    }
    setCreating(false);
  }

  async function joinOrg() {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_organization_by_code', { _code: joinCode.trim() });
      if (error) throw error;
      toast({ title: 'Gejoind!', description: 'Je bent toegevoegd aan het bedrijf.' });
      setJoinCode('');
      setShowJoin(false);
      fetchOrgs();
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message || 'Ongeldige code', variant: 'destructive' });
    }
    setJoining(false);
  }

  async function viewMembers(org: Organization) {
    setSelectedOrg(org);
    setLoadingMembers(true);
    setShowDeposit(false);
    setShowWithdraw(false);
    const [membersRes, appsRes, coinsRes, txRes] = await Promise.all([
      supabase.from('organization_members').select('*').eq('organization_id', org.id).order('created_at', { ascending: true }),
      supabase.from('apps').select('id, name, updated_at').eq('organization_id', org.id as any).order('updated_at', { ascending: false }),
      supabase.from('org_coins').select('*').eq('organization_id', org.id),
      supabase.from('org_coin_transactions').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(20),
    ]);
    if (!membersRes.error) setMembers((membersRes.data as unknown as OrgMember[]) || []);
    if (!appsRes.error) setOrgApps((appsRes.data as unknown as OrgApp[]) || []);
    if (!coinsRes.error) setOrgCoins((coinsRes.data as unknown as OrgCoin[]) || []);
    if (!txRes.error) setTransactions((txRes.data as unknown as CoinTransaction[]) || []);
    setLoadingMembers(false);
  }

  async function handleCoinTransaction(type: 'deposit' | 'withdraw') {
    if (!selectedOrg || !session?.user?.id || !txAmount.trim()) return;
    const amount = parseInt(txAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Fout', description: 'Voer een geldig bedrag in', variant: 'destructive' });
      return;
    }

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

      // Update balance
      const { error: updateErr } = await supabase.from('org_coins')
        .update({ balance: newBalance, updated_at: new Date().toISOString() } as any)
        .eq('id', coin.id);
      if (updateErr) throw updateErr;

      // Log transaction
      await supabase.from('org_coin_transactions').insert({
        organization_id: selectedOrg.id,
        coin_name: 'coins',
        amount,
        type,
        user_id: session.user.id,
        note: txNote || (type === 'deposit' ? 'Storting' : 'Opname'),
      } as any);

      toast({ title: type === 'deposit' ? '💰 Gestort!' : '💸 Opgenomen!', description: `${amount} coins ${type === 'deposit' ? 'gestort in' : 'opgenomen uit'} de kluis` });
      setTxAmount('');
      setTxNote('');
      setShowDeposit(false);
      setShowWithdraw(false);
      // Refresh
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
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between backdrop-blur-sm" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Bedrijven</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Actions */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Bedrijf starten
          </button>
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all border border-border text-foreground hover:bg-secondary active:scale-95"
          >
            <LogIn className="h-4 w-4" /> Bedrijf joinen
          </button>
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

        {/* Organization list */}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{org.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {org.owner_id === session?.user?.id ? 'Eigenaar' : 'Lid'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
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
          <div className="mt-8 rounded-xl border border-border/50 p-6" style={{ background: 'hsl(var(--card))' }}>
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
                  <div key={member.id} className="flex items-center justify-between rounded-lg px-4 py-3 bg-background/50">
                    <div className="flex items-center gap-3">
                      {roleIcon(member.role)}
                      <span className="text-sm text-foreground font-mono">{member.user_id.slice(0, 8)}...</span>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">{roleLabel(member.role)}</span>
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

          <div className="mt-6 rounded-xl border border-border/50 p-6" style={{ background: 'hsl(var(--card))' }}>
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

          {/* Bedrijfskluis */}
          <div className="mt-6 rounded-xl border border-border/50 p-6" style={{ background: 'hsl(var(--card))' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
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
                {/* Alleen admins/owners kunnen opnemen */}
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
            <div className="rounded-xl p-6 mb-4 text-center" style={{ background: 'hsl(var(--background))' }}>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Totaal saldo</p>
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-8 w-8 text-yellow-400" />
                <span className="text-4xl font-bold text-foreground font-mono">
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
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  {showDeposit ? '💰 Coins storten' : '💸 Coins opnemen'}
                </h4>
                <div className="flex gap-3 mb-3">
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

            {/* Transaction history */}
            {transactions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Recente transacties
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: 'hsl(var(--background))' }}>
                      <div className="flex items-center gap-2">
                        {tx.type === 'deposit' ? (
                          <ArrowDownCircle className="h-3.5 w-3.5 text-[hsl(var(--ide-success))]" />
                        ) : (
                          <ArrowUpCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span className={`font-mono font-semibold ${tx.type === 'deposit' ? 'text-[hsl(var(--ide-success))]' : 'text-destructive'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{tx.amount}
                        </span>
                        <span className="text-muted-foreground truncate max-w-[150px]">{tx.note}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                        <span className="font-mono">{tx.user_id.slice(0, 6)}...</span>
                        <span>{new Date(tx.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
