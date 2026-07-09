import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import nl from './locales/nl';
import en from './locales/en';
import fr from './locales/fr';
import { applyWordOverrides } from '@/hooks/useSiteCustomization';
import { getAppMode } from '@/hooks/useAppMode';

export const SUPPORTED_LANGUAGES = ['nl', 'en', 'fr'] as const;
export type Language = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_LABELS: Record<Language, { name: string; flag: string }> = {
  nl: { name: 'Nederlands', flag: '🇳🇱' },
  en: { name: 'English', flag: '🇬🇧' },
  fr: { name: 'Français', flag: '🇫🇷' },
};

// Post-processor that swaps words based on admin site customizations + current app mode.
const wordOverridePostProcessor = {
  type: 'postProcessor' as const,
  name: 'wordOverride',
  process(value: string) {
    if (typeof value !== 'string' || !value) return value;
    try {
      return applyWordOverrides(value, getAppMode());
    } catch {
      return value;
    }
  },
};

i18n
  .use(LanguageDetector)
  .use(wordOverridePostProcessor as any)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: 'nl',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    postProcess: ['wordOverride'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
  });

// Re-render translations when admin customizations change or app mode toggles.
if (typeof window !== 'undefined') {
  const trigger = () => i18n.emit('languageChanged', i18n.language);
  window.addEventListener('site-customization-changed', trigger);
  window.addEventListener('app-mode-changed', trigger);
}

export default i18n;
