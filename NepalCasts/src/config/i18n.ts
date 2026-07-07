import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../locales/en.json';
import np from '../../locales/np.json';
import hi from '../../locales/hi.json';

const savedLang = localStorage.getItem('nc-language') || 'en';

const applyFontClass = (lng: string) => {
  const apply = () => {
    const body = document.body;
    if (body) {
      if (lng === 'np' || lng === 'hi') {
        body.classList.add('font-devanagari');
      } else {
        body.classList.remove('font-devanagari');
      }
    }
  };
  if (document.body) {
    apply();
  } else {
    window.addEventListener('DOMContentLoaded', apply);
  }
};


applyFontClass(savedLang);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      np: { translation: np },
      hi: { translation: hi }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('nc-language', lng);
  applyFontClass(lng);
});

export default i18n;
