import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ne from './ne.json';

const STORAGE_KEY = 'nc-language';

export const detectLanguage = (): 'en' => {
  return 'en';
};

const initialLang = detectLanguage();

export const applyFontClass = (lng: string) => {
  const apply = () => {
    const body = document.body;
    if (body) {
      if (lng === 'ne' || lng === 'np' || lng === 'hi') {
        body.classList.add('font-devanagari');
      } else {
        body.classList.remove('font-devanagari');
      }
    }
  };

  if (document.body) {
    apply();
  } else if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', apply);
  }
};

applyFontClass(initialLang);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ne: { translation: ne },
      np: { translation: ne }, // Backwards compatibility alias
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng: string) => {
  const targetLang = lng === 'np' ? 'ne' : lng;
  try {
    localStorage.setItem(STORAGE_KEY, targetLang);
  } catch (_e) {
    // Storage restricted
  }
  applyFontClass(targetLang);
});

export const changeLanguage = (lng: 'en' | 'ne') => {
  i18n.changeLanguage(lng);
};

export default i18n;
