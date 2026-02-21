import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage('Check je e-mail om je account te bevestigen!');
      }
    } catch (err: any) {
      setError(err.message);
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
            disabled={loading}
            className="w-full py-2 rounded-md text-sm font-medium text-white transition-colors"
            style={{ background: '#3b82f6' }}
          >
            {loading ? '...' : isLogin ? 'Inloggen' : 'Registreren'}
          </button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: '#64748b' }}>
          {isLogin ? 'Nog geen account?' : 'Al een account?'}{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
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
