import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { ArrowLeft, Save, Mail, User, Lock, Trash2, Share2, Globe, Eye, EyeOff } from 'lucide-react';
import { getCached, setCache, clearCache, CACHE_TTL } from '@/lib/cache';

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

  useEffect(() => {
    if (!session?.user) return;
    setEmail(session.user.email || '');
    const cacheKey = `profile:${session.user.id}`;
    const cached = getCached<{ display_name: string | null; bio: string | null; username: string | null }>(cacheKey, CACHE_TTL.medium);
    if (cached) {
      if (cached.display_name) setDisplayName(cached.display_name);
      if (cached.bio) setBio(cached.bio);
      if (cached.username) setUsername(cached.username);
      return;
    }
    supabase
      .from('profiles')
      .select('display_name, bio, username, social_links, show_email')
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
  }, [session?.user]);

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
