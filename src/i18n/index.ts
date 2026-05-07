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

i18n
  .use(LanguageDetector)
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
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
