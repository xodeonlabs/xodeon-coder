import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import nl from './locales/nl';
import en from './locales/en';
import fr from './locales/fr';

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
      // Lazy import to avoid circular init
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@/hooks/useSiteCustomization');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const modeMod = require('@/hooks/useAppMode');
      return mod.applyWordOverrides(value, modeMod.getAppMode());
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


export default i18n;
