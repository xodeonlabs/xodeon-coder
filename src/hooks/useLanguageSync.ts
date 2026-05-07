import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n';

const isSupported = (lng: string | undefined | null): lng is Language =>
  !!lng && (SUPPORTED_LANGUAGES as readonly string[]).includes(lng);

/**
 * Synchroniseert de gekozen taal tussen i18next, localStorage en het profiel.
 * - Bij login: laadt taal uit profiel en past die toe (overschrijft localStorage).
 * - Bij wijziging: schrijft de nieuwe taal terug naar het profiel.
 */
export function useLanguageSync() {
  const { i18n } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const loadedFor = useRef<string | null>(null);

  // 1) Profiel → app (bij login of session wissel)
  useEffect(() => {
    if (!userId || loadedFor.current === userId) return;
    loadedFor.current = userId;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', userId)
        .maybeSingle();
      const lang = (data as any)?.language as string | null | undefined;
      if (isSupported(lang) && lang !== i18n.resolvedLanguage) {
        await i18n.changeLanguage(lang);
        try { localStorage.setItem('lang', lang); } catch {}
      }
    })();
  }, [userId, i18n]);

  // 2) App → profiel (bij elke taalwissel)
  useEffect(() => {
    const onChanged = (lng: string) => {
      try { localStorage.setItem('lang', lng); } catch {}
      if (!userId || !isSupported(lng)) return;
      supabase
        .from('profiles')
        .update({ language: lng } as any)
        .eq('id', userId)
        .then(() => {});
    };
    i18n.on('languageChanged', onChanged);
    return () => { i18n.off('languageChanged', onChanged); };
  }, [i18n, userId]);
}
