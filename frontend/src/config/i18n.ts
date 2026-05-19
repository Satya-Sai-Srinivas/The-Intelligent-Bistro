import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import zh from '../locales/zh.json';
import te from '../locales/te.json';
import es from '../locales/es.json';
import hi from '../locales/hi.json';
import kn from '../locales/kn.json';
import ta from '../locales/ta.json';
import ml from '../locales/ml.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    de: { translation: de },
    zh: { translation: zh },
    te: { translation: te },
    es: { translation: es },
    hi: { translation: hi },
    kn: { translation: kn },
    ta: { translation: ta },
    ml: { translation: ml },
  },
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
