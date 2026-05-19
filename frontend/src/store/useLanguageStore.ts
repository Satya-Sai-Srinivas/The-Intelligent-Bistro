import { create } from 'zustand';
import i18n from '../config/i18n';

export const SUPPORTED_LANGUAGE_CODES = [
  'en',
  'fr',
  'de',
  'zh',
  'te',
  'es',
  'hi',
  'kn',
  'ta',
  'ml',
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const SUPPORTED_LANGUAGES: { code: SupportedLanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'es', label: 'Español' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'ml', label: 'മലയാളം' },
];

function isSupportedLanguageCode(code: string): code is SupportedLanguageCode {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code);
}

interface LanguageState {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  currentLanguage: 'en',

  setLanguage: (lang: string) => {
    if (!isSupportedLanguageCode(lang)) {
      return;
    }
    set({ currentLanguage: lang });
    void i18n.changeLanguage(lang);
  },
}));
