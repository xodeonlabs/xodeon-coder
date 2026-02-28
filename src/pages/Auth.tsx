import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const GOOGLE_OAUTH_CONFIG_ERROR = 'Google inloggen is nog niet geconfigureerd. Stel de Google OAuth secret eerst in bij Supabase Auth providers.';

const getErrorText = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === 'object') {
    const withMessage = err as { message?: unknown; msg?: unknown };

    if (typeof withMessage.message === 'string' && withMessage.message.length > 0) return withMessage.message;
    if (typeof withMessage.msg === 'string' && withMessage.msg.length > 0) return withMessage.msg;
  }

  return fallback;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isGoogleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

  const getGoogleOAuthErrorMessage = (err: unknown) => {
    const message = getErrorText(err, 'Google inloggen is mislukt. Probeer het opnieuw.');
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('unsupported provider') || normalizedMessage.includes('missing oauth secret')) {
      return GOOGLE_OAUTH_CONFIG_ERROR;
    }

    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
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

    if (!isGoogleAuthEnabled) {
      setError('Google inloggen staat uit. Zet VITE_ENABLE_GOOGLE_AUTH=true en configureer Google OAuth in Supabase.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      setError(getGoogleOAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
      <div className="w-full max-w-sm p-8 rounded-xl" style={{ background: '#151b2e', border: '1px solid #1e293b' }}>
        <h1 className="text-2xl font-bold text-white mb-1 text-center">NGC Editor</h1>
        <p className="text-sm text-center mb-6" style={{ color: '#64748b' }}>
          {isLogin ? 'Log in om verder te gaan' : 'Maak een account aan'}
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

          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-green-400">{message}</p>}

          <button
            type="submit"
            disabled={loading || !isGoogleAuthEnabled}
            className="w-full py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#3b82f6' }}
          >
            {loading ? '...' : isLogin ? 'Inloggen' : 'Registreren'}
          </button>

          <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
            <div className="h-px flex-1" style={{ background: '#334155' }} />
            <span>of</span>
            <div className="h-px flex-1" style={{ background: '#334155' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || !isGoogleAuthEnabled}
            className="w-full py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#1f2937', border: '1px solid #334155' }}
          >
            Inloggen met Google
          </button>

          {!isGoogleAuthEnabled && (
            <p className="text-xs" style={{ color: '#64748b' }}>
              Google login is tijdelijk niet beschikbaar.
            </p>
          )}
        </form>

        <p className="text-xs text-center mt-4" style={{ color: '#64748b' }}>
          {isLogin ? 'Nog geen account?' : 'Al een account?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }}
            className="underline"
            style={{ color: '#3b82f6' }}
          >
            {isLogin ? 'Registreer' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
