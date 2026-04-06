import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

async function detectAndStoreCountry(userId: string) {
  try {
    // Check if country is already set
    const { data: profile } = await supabase
      .from('profiles')
      .select('country')
      .eq('id', userId)
      .single();

    if (profile?.country) return; // Already set

    // Detect country via free IP geolocation API
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return;
    const geo = await res.json();
    const country = geo?.country_code || null;
    if (!country) return;

    await supabase
      .from('profiles')
      .update({ country } as any)
      .eq('id', userId);
  } catch {
    // Silent fail - non-critical
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const countryDetected = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);

      if (session?.user?.id && !countryDetected.current) {
        countryDetected.current = true;
        detectAndStoreCountry(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      if (session?.user?.id && !countryDetected.current) {
        countryDetected.current = true;
        detectAndStoreCountry(session.user.id);
      }
    });

    // "Remember me" logic: sign out when browser/tab closes if not remembered
    const handleBeforeUnload = () => {
      const rememberMe = localStorage.getItem('rememberMe');
      if (rememberMe === 'false') {
        // Clear session storage so user must log in again
        localStorage.removeItem('sb-xgnewppkivznltxugzcu-auth-token');
        localStorage.removeItem('rememberMe');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, loading, signOut };
}
