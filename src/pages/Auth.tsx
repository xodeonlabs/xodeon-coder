import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

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
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setError('');
    setMessage('');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('Check je e-mail voor een link om je wachtwoord te resetten.');
        return;
      }

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) throw error;
      setMessage('Check je e-mail om je account te bevestigen!');
    } catch (err: unknown) {
      setError(getErrorText(err, 'Er is een onbekende fout opgetreden.'));
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
          {mode === 'forgot' ? 'Wachtwoord herstellen' : mode === 'login' ? 'Log in om verder te gaan' : 'Maak een account aan'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          {mode !== 'forgot' && (
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

          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-green-400">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-sm font-medium text-white transition-colors"
            style={{ background: '#3b82f6' }}
          >
            {loading ? '...' : mode === 'forgot' ? 'Reset link versturen' : mode === 'login' ? 'Inloggen' : 'Registreren'}
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
                className="w-full py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: '#1f2937', border: '1px solid #334155' }}
              >
                Inloggen met Google
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
