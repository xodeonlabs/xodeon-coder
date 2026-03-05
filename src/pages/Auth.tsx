import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

// sometimes the SupabaseAuthClient definition is missing newer methods
// so we cast to `any` once and reuse the alias in this file
const auth = supabase.auth as any;

const getErrorText = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === 'object') {
    const errorPayload = err as {
      message?: unknown;
      msg?: unknown;
      error_description?: unknown;
      details?: unknown;
      error?: unknown;
    };

    const candidates = [
      errorPayload.message,
      errorPayload.msg,
      errorPayload.error_description,
      errorPayload.details,
      errorPayload.error,
    ];

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
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data, error } = await auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      
      if (data?.user?.id) {
        setMessage('Magic link verzonden! Check je e-mail (ook spam-folder).\n\nTip: Kan je de email niet vinden? Probeer Google login of gast mode.');
      } else {
        setMessage('Aanvraag verzonden! Je ontvangt een inlog-link via e-mail.');
      }
    } catch (err: unknown) {
      const errMsg = getErrorText(err, 'Magic link verzenden mislukt.');
      setError(`${errMsg}\n\nProbeer in plaats daarvan:\n• Google login\n• Wachtwoord login\n• Gast mode`);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
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

      // Register mode
      const { data, error } = await auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        // Handle specific registration errors
        if (error.message?.includes('User already registered')) {
          setError('Dit e-mailadres is al geregistreerd. Gebruik inloggen of wachtwoord herstellen.');
        } else {
          throw error;
        }
        return;
      }
      
      if (data.user?.id) {
        // Account created! Now sign in with password automatically
        setMessage('✅ Account aangemaakt! Je wordt ingelogd...');
        
        try {
          const { error: signInError } = await auth.signInWithPassword({ 
            email, 
            password 
          });
          
          if (signInError) {
            // If automatic sign-in fails, still navigate - user can login next time
            setMessage('Account aangemaakt! Je kunt nu inloggen.');
            setTimeout(() => navigate('/'), 1500);
          } else {
            // Signed in successfully
            setTimeout(() => navigate('/'), 500);
          }
        } catch {
          // Fallback: redirect to dashboard anyway
          setTimeout(() => navigate('/'), 1500);
        }
      } else {
        setMessage('Account aangemaakt! Je kunt nu inloggen.');
      }
    } catch (err: unknown) {
      const errorMsg = getErrorText(err, 'Er is een onbekende fout opgetreden.');
      if (errorMsg.includes('email') || errorMsg.includes('mail') || errorMsg.toLowerCase().includes('invalid')) {
        setError(`${errorMsg}\n\nProbeer:\n• Google login\n• Magic link\n• Gast mode`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });

      if (result?.error) throw result.error;
    } catch (err: unknown) {
      setError(getErrorText(err, 'Google inloggen is mislukt. Probeer het opnieuw.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
      <div className="w-full max-w-sm p-8 rounded-xl" style={{ background: '#151b2e', border: '1px solid #1e293b' }}>
        <h1 className="text-2xl font-bold text-white mb-1 text-center">NGC Editor</h1>
        <p className="text-sm text-center mb-6" style={{ color: '#64748b' }}>
          {mode === 'forgot' ? 'Wachtwoord herstellen' : mode === 'magic-link' ? 'Inloggen met link' : mode === 'login' ? 'Log in om verder te gaan' : 'Maak een account aan'}
        </p>

        <form onSubmit={mode === 'magic-link' ? handleMagicLink : handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: '#0f172a', border: '1px solid #334155' }}
              placeholder="jouw@email.nl"
            />
          </div>
          {(mode === 'login' || mode === 'register') && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-md text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: '#0f172a', border: '1px solid #334155' }}
                placeholder="••••••••"
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <button type="button" onClick={() => switchMode('forgot')} className="text-xs underline" style={{ color: '#3b82f6' }}>
                Wachtwoord vergeten?
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md text-xs text-orange-300" style={{ background: '#422006', border: '1px solid #78350f' }}>
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-md text-xs text-green-300" style={{ background: '#052e16', border: '1px solid #15803d' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60"
            style={{ background: '#3b82f6' }}
          >
            {loading ? '...' : mode === 'forgot' ? 'Reset link versturen' : mode === 'magic-link' ? 'Magic link versturen' : mode === 'login' ? 'Inloggen' : 'Registreren'}
          </button>

          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                <div className="h-px flex-1" style={{ background: '#334155' }} />
                <span>of</span>
                <div className="h-px flex-1" style={{ background: '#334155' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: '#1f2937', border: '1px solid #334155' }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.003 24.003 0 0 0 0 21.56l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Inloggen met Google
              </button>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('magic-link')}
                  className="w-full py-2 rounded-md text-sm font-medium transition-colors"
                  style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8' }}
                >
                  Magic link
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/guest')}
                className="w-full py-2 rounded-md text-sm font-medium transition-colors"
                style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8' }}
              >
                Probeer als gast
              </button>
            </>
          )}
        </form>

        <p className="text-xs text-center mt-4" style={{ color: '#64748b' }}>
          {mode === 'forgot' ? (
            <>
              <button onClick={() => switchMode('login')} className="underline" style={{ color: '#3b82f6' }}>
                Terug naar inloggen
              </button>
            </>
          ) : mode === 'magic-link' ? (
            <>
              <button onClick={() => switchMode('login')} className="underline" style={{ color: '#3b82f6' }}>
                Terug naar inloggen
              </button>
            </>
          ) : mode === 'login' ? (
            <>
              Nog geen account?{' '}
              <button onClick={() => switchMode('register')} className="underline" style={{ color: '#3b82f6' }}>
                Registreer
              </button>
            </>
          ) : (
            <>
              Al een account?{' '}
              <button onClick={() => switchMode('login')} className="underline" style={{ color: '#3b82f6' }}>
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
