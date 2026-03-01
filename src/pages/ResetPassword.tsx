import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens bevatten.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Wachtwoord is succesvol gewijzigd! Je wordt doorgestuurd...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden.');
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="w-full max-w-sm p-8 rounded-xl text-center" style={{ background: '#151b2e', border: '1px solid #1e293b' }}>
          <h1 className="text-xl font-bold text-white mb-2">Ongeldige link</h1>
          <p className="text-sm mb-4" style={{ color: '#64748b' }}>
            Deze link is ongeldig of verlopen. Vraag een nieuwe wachtwoord-reset aan.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ background: '#3b82f6' }}
          >
            Terug naar inloggen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
      <div className="w-full max-w-sm p-8 rounded-xl" style={{ background: '#151b2e', border: '1px solid #1e293b' }}>
        <h1 className="text-2xl font-bold text-white mb-1 text-center">Nieuw wachtwoord</h1>
        <p className="text-sm text-center mb-6" style={{ color: '#64748b' }}>
          Kies een nieuw wachtwoord voor je account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Nieuw wachtwoord</label>
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
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Bevestig wachtwoord</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
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
            {loading ? '...' : 'Wachtwoord opslaan'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
