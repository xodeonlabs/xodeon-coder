import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { ArrowLeft, Save, Mail, User, Lock, Trash2, Share2, Globe, Eye, EyeOff, Clock, Coins } from 'lucide-react';
import { getCached, setCache, clearCache, CACHE_TTL } from '@/lib/cache';

interface RetentionItem {
  label: string;
  icon: string;
  hours: number;
  type: 'app' | 'org' | 'alliance' | 'group' | 'friend';
  id?: string;
}

function formatRetention(hours: number): string {
  if (hours < 24) return `${hours} uur`;
  if (hours < 168) return `${Math.round(hours / 24)} dag(en)`;
  if (hours < 720) return `${Math.round(hours / 168)} week`;
  return `${Math.round(hours / 720)} maand(en)`;
}

function retentionCostPerMonth(hours: number): number {
  if (hours <= 12) return 0;
  const blocks = Math.ceil((hours - 12) / 12);
  return blocks * 5;
}

export default function Settings() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    instagram: '', twitter: '', github: '', linkedin: '', youtube: '', website: '',
  });
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [retentionItems, setRetentionItems] = useState<RetentionItem[]>([]);
  const [retentionLoading, setRetentionLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    setEmail(session.user.email || '');
    const cacheKey = `profile:${session.user.id}`;
    const cached = getCached<{ display_name: string | null; bio: string | null; username: string | null }>(cacheKey, CACHE_TTL.medium);
    if (cached) {
      if (cached.display_name) setDisplayName(cached.display_name);
      if (cached.bio) setBio(cached.bio);
      if (cached.username) setUsername(cached.username);
    } else {
      supabase
        .from('profiles')
        .select('display_name, bio, username, social_links, show_email, friend_chat_retention_hours')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.display_name) setDisplayName(data.display_name);
          if ((data as any)?.bio) setBio((data as any).bio);
          if ((data as any)?.username) setUsername((data as any).username);
          if ((data as any)?.show_email) setShowEmail((data as any).show_email);
          if ((data as any)?.social_links && typeof (data as any).social_links === 'object') {
            setSocialLinks(prev => ({ ...prev, ...(data as any).social_links }));
          }
          if (data) setCache(cacheKey, { display_name: data.display_name, bio: (data as any)?.bio, username: (data as any)?.username });
        });
    }
    loadRetentionOverview();
  }, [session?.user]);

  async function loadRetentionOverview() {
    if (!session?.user?.id) return;
    setRetentionLoading(true);
    const items: RetentionItem[] = [];

    // Friend chat retention
    const { data: profile } = await supabase.from('profiles').select('friend_chat_retention_hours').eq('id', session.user.id).maybeSingle();
    items.push({ label: 'Vriendenberichten', icon: '💬', hours: (profile as any)?.friend_chat_retention_hours ?? 24, type: 'friend' });

    // Apps
    const { data: apps } = await supabase.from('apps').select('id, name, chat_retention_hours, icon').eq('owner_id', session.user.id);
    for (const app of apps || []) {
      items.push({ label: app.name, icon: app.icon || '📱', hours: app.chat_retention_hours ?? 12, type: 'app', id: app.id });
    }

    // Organizations owned/admin
    const { data: memberships } = await supabase.from('organization_members').select('organization_id, role').eq('user_id', session.user.id);
    const orgIds = (memberships || []).filter(m => m.role === 'owner' || m.role === 'admin').map(m => m.organization_id);
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase.from('organizations').select('id, name, icon, chat_retention_hours').in('id', orgIds);
      for (const org of orgs || []) {
        items.push({ label: org.name, icon: org.icon || '🏢', hours: (org as any).chat_retention_hours ?? 48, type: 'org', id: org.id });
      }
    }

    // Alliances created by user
    const { data: alliances } = await supabase.from('alliances').select('id, name, icon, chat_retention_hours').eq('created_by', session.user.id);
    for (const a of alliances || []) {
      items.push({ label: a.name, icon: a.icon || '🤝', hours: (a as any).chat_retention_hours ?? 48, type: 'alliance', id: a.id });
    }

    // Groups created by user
    const { data: groups } = await supabase.from('chat_groups' as any).select('id, name, icon, chat_retention_hours').eq('created_by', session.user.id);
    for (const g of (groups as any[]) || []) {
      items.push({ label: g.name, icon: g.icon || '👥', hours: g.chat_retention_hours ?? 48, type: 'group', id: g.id });
    }

    setRetentionItems(items);
    setRetentionLoading(false);
  }

  async function saveProfile() {
    if (!session?.user?.id) return;
    setSaving(true);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    // Filter out empty social links
    const filteredSocials: Record<string, string> = {};
    Object.entries(socialLinks).forEach(([k, v]) => { if (v.trim()) filteredSocials[k] = v.trim(); });
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        display_name: displayName.trim() || null,
        bio: bio.trim(),
        username: cleanUsername || null,
        social_links: filteredSocials,
        show_email: showEmail,
        public_email: showEmail ? (session.user.email || null) : null,
        updated_at: new Date().toISOString(),
      } as any);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Profiel opgeslagen!' });
      clearCache(`profile:${session.user.id}`);
    }
    setSaving(false);
  }

  async function updateEmail() {
    if (!email.trim() || email === session?.user?.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '📧 Bevestigingsmail verstuurd', description: 'Controleer je inbox om het nieuwe e-mailadres te bevestigen.' });
    }
    setSavingEmail(false);
  }

  async function updatePassword() {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Fout', description: 'Wachtwoord moet minimaal 6 tekens zijn', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Fout', description: 'Wachtwoorden komen niet overeen', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🔒 Wachtwoord bijgewerkt!' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
  }

  async function deleteAccount() {
    if (!confirm('Weet je zeker dat je je account wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    toast({ title: 'Account verwijderen', description: 'Neem contact op met de beheerder om je account te verwijderen.' });
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 backdrop-blur-sm" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <button onClick={() => navigate('/')} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">Account Instellingen</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Profile section */}
        <div className="rounded-xl border border-border/50 p-5 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profiel
          </h2>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex flex-col items-center gap-2">
              <ProfileAvatar size="lg" editable />
              <span className="text-[10px] text-muted-foreground">Klik om te wijzigen</span>
            </div>
            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Gebruikersnaam</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="jouw.username"
                    maxLength={30}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Dit wordt je profiel-URL: /profiel/{username || '...'}</span>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Weergavenaam</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Jouw naam..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Vertel iets over jezelf..."
                  rows={3}
                  maxLength={300}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <span className="text-[10px] text-muted-foreground">{bio.length}/300</span>
              </div>
              {/* Email visibility toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {showEmail ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm text-foreground">E-mail tonen op profiel</span>
                </div>
                <button
                  onClick={() => setShowEmail(!showEmail)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${showEmail ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${showEmail ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Opslaan...' : 'Profiel opslaan'}
              </button>
            </div>
          </div>
        </div>

        {/* Social media section */}
        <div className="rounded-xl border border-border/50 p-5 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Sociale media
          </h2>
          <div className="space-y-3">
            {[
              { key: 'instagram', label: 'Instagram', placeholder: 'jouw_username', prefix: '@' },
              { key: 'twitter', label: 'X / Twitter', placeholder: 'jouw_username', prefix: '@' },
              { key: 'github', label: 'GitHub', placeholder: 'jouw_username', prefix: '@' },
              { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/...', prefix: '' },
              { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@...', prefix: '' },
              { key: 'website', label: 'Website', placeholder: 'https://jouw-site.nl', prefix: '' },
            ].map(({ key, label, placeholder, prefix }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                <div className="flex items-center gap-1">
                  {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
                  <input
                    value={socialLinks[key] || ''}
                    onChange={e => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    maxLength={100}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Deze links worden getoond op je publieke profiel. Laat een veld leeg om het te verbergen.</p>
          </div>
        </div>

        {/* Email section */}
        <div className="rounded-xl border border-border/50 p-5 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            E-mailadres
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={updateEmail}
              disabled={savingEmail || email === session?.user?.email}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {savingEmail ? 'Bezig...' : 'E-mail wijzigen'}
            </button>
            <p className="text-xs text-muted-foreground">Je ontvangt een bevestigingsmail op het nieuwe adres.</p>
          </div>
        </div>

        {/* Password section */}
        <div className="rounded-xl border border-border/50 p-5 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Wachtwoord wijzigen
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nieuw wachtwoord</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimaal 6 tekens..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bevestig wachtwoord</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Herhaal wachtwoord..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={updatePassword}
              disabled={savingPassword || !newPassword}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              {savingPassword ? 'Bezig...' : 'Wachtwoord wijzigen'}
            </button>
          </div>
        </div>

        {/* Bewaartermijnen overzicht */}
        <div className="rounded-xl border border-border/50 p-5 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Bewaartermijnen
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Overzicht van alle actieve chat-bewaartermijnen en kosten.</p>

          {retentionLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : retentionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Geen actieve bewaartermijnen gevonden.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {retentionItems.map((item, i) => {
                  const cost = retentionCostPerMonth(item.hours);
                  const isUpgraded = item.hours > 12;
                  return (
                    <div
                      key={`${item.type}-${item.id || i}`}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                        isUpgraded ? 'border-primary/20 bg-primary/5' : 'border-border/30 bg-secondary/20'
                      }`}
                    >
                      <span className="text-lg shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">{item.label}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground font-medium shrink-0">
                            {item.type === 'app' ? '📱 App' : item.type === 'org' ? '🏢 Bedrijf' : item.type === 'alliance' ? '🤝 Alliantie' : item.type === 'group' ? '👥 Groep' : '💬 Privé'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold ${isUpgraded ? 'text-primary' : 'text-muted-foreground'}`}>
                          {formatRetention(item.hours)}
                        </span>
                        {cost > 0 ? (
                          <span className="text-[10px] font-bold text-yellow-500 flex items-center gap-0.5">
                            🪙 {cost}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground/60">Gratis</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {(() => {
                const totalCost = retentionItems.reduce((sum, item) => sum + retentionCostPerMonth(item.hours), 0);
                const upgradedCount = retentionItems.filter(item => item.hours > 12).length;
                return (
                  <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{upgradedCount}</span> van {retentionItems.length} chats met verlengde bewaring
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-sm font-bold text-foreground">{totalCost}</span>
                      <span className="text-[10px] text-muted-foreground">coins totaal</span>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-destructive/30 p-5 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="text-lg font-bold text-destructive mb-2 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Gevarenzone
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Het verwijderen van je account is permanent en kan niet ongedaan worden gemaakt.</p>
          <button
            onClick={deleteAccount}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Account verwijderen
          </button>
        </div>
      </div>
    </div>
  );
}
