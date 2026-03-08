import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { ArrowLeft, Mail, Lock, Sparkles } from 'lucide-react';

const auth = supabase.auth as any;

const getErrorText = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const errorPayload = err as { message?: unknown; msg?: unknown; error_description?: unknown; details?: unknown; error?: unknown };
    const candidates = [errorPayload.message, errorPayload.msg, errorPayload.error_description, errorPayload.details, errorPayload.error];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.length > 0) return candidate;
    }
  }
  return fallback;
};

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'magic-link'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const switchMode = (newMode: 'login' | 'register' | 'forgot' | 'magic-link') => {
    setMode(newMode);
    setError('');
    setMessage('');
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const { data, error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      if (data?.user?.id) {
        setMessage('Magic link verzonden! Check je e-mail (ook spam-folder).');
      } else {
        setMessage('Aanvraag verzonden! Je ontvangt een inlog-link via e-mail.');
      }
    } catch (err: unknown) {
      setError(getErrorText(err, 'Magic link verzenden mislukt.'));
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage('Check je e-mail voor een link om je wachtwoord te resetten.');
        return;
      }
      if (mode === 'login') {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
        return;
      }
      const { data, error } = await auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) {
        if (error.message?.includes('User already registered')) {
          setError('Dit e-mailadres is al geregistreerd. Gebruik inloggen of wachtwoord herstellen.');
        } else throw error;
        return;
      }
      if (data.user?.id) {
        setMessage('✅ Account aangemaakt! Je wordt ingelogd...');
        try {
          const { error: signInError } = await auth.signInWithPassword({ email, password });
          if (signInError) {
            setMessage('Account aangemaakt! Je kunt nu inloggen.');
            setTimeout(() => navigate('/'), 1500);
          } else {
            setTimeout(() => navigate('/'), 500);
          }
        } catch { setTimeout(() => navigate('/'), 1500); }
      } else {
        setMessage('Account aangemaakt! Je kunt nu inloggen.');
      }
    } catch (err: unknown) {
      setError(getErrorText(err, 'Er is een onbekende fout opgetreden.'));
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setError(''); setMessage(''); setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
      if (result?.error) throw result.error;
    } catch (err: unknown) {
      setError(getErrorText(err, 'Google inloggen is mislukt.'));
    } finally { setLoading(false); }
  };

  const handleAppleLogin = async () => {
    setError(''); setMessage(''); setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('apple', { redirect_uri: window.location.origin });
      if (result?.error) throw result.error;
    } catch (err: unknown) {
      setError(getErrorText(err, 'Apple inloggen is mislukt.'));
    } finally { setLoading(false); }
  };

  const modeTitle = {
    login: 'Welkom terug',
    register: 'Account aanmaken',
    forgot: 'Wachtwoord herstellen',
    'magic-link': 'Inloggen met link',
  };

  const modeSubtitle = {
    login: 'Log in om verder te gaan met bouwen',
    register: 'Begin je avontuur met NGC',
    forgot: 'We sturen je een resetlink',
    'magic-link': 'We sturen je een magische link',
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] animate-glow-pulse delay-300" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.02] blur-[80px]" />
      </div>

      <div className="w-full max-w-[420px] relative z-10 animate-scale-in">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 mb-5 shadow-lg shadow-primary/10">
            <img src="/ngc-logo.png" alt="NGC" className="h-9 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display tracking-tight">
            {modeTitle[mode]}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">{modeSubtitle[mode]}</p>
        </div>

        {/* Card */}
        <div className="glass-card-highlight rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20">
          <form onSubmit={mode === 'magic-link' ? handleMagicLink : handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-foreground bg-background/80 border border-border/60 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
                  placeholder="jouw@email.nl"
                />
              </div>
            </div>

            {/* Password */}
            {(mode === 'login' || mode === 'register') && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Wachtwoord</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-foreground bg-background/80 border border-border/60 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Wachtwoord vergeten?
                </button>
              </div>
            )}

            {/* Error / Message */}
            {error && (
              <div className="p-3 rounded-xl text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 animate-slide-up">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 rounded-xl text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 animate-slide-up">
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Bezig...
                </span>
              ) : mode === 'forgot' ? 'Reset link versturen' : mode === 'magic-link' ? 'Magic link versturen' : mode === 'login' ? 'Inloggen' : 'Registreren'}
            </button>

            {/* Social login */}
            {mode !== 'forgot' && (
              <>
                <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="uppercase tracking-wider text-[10px]">of</span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-foreground bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/60 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.003 24.003 0 0 0 0 21.56l7.98-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Google
                  </button>

                  <button
                    type="button"
                    onClick={handleAppleLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-foreground bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/60 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Apple
                  </button>
                </div>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('magic-link')}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-transparent border border-border/30 hover:border-border/50 hover:text-foreground transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Magic link
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/guest')}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  Probeer als gast →
                </button>
              </>
            )}
          </form>
        </div>

        {/* Bottom link */}
        <p className="text-xs text-center mt-6 text-muted-foreground">
          {mode === 'forgot' || mode === 'magic-link' ? (
            <button onClick={() => switchMode('login')} className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Terug naar inloggen
            </button>
          ) : mode === 'login' ? (
            <>
              Nog geen account?{' '}
              <button onClick={() => switchMode('register')} className="text-primary hover:text-primary/80 transition-colors font-medium">
                Registreer
              </button>
            </>
          ) : (
            <>
              Al een account?{' '}
              <button onClick={() => switchMode('login')} className="text-primary hover:text-primary/80 transition-colors font-medium">
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Auth;