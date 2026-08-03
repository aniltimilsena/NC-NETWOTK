import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import i18n, { changeLanguage as setLang } from './index';

interface LanguageContextType {
  language: 'en' | 'ne';
  setLanguage: (lang: 'en' | 'ne') => void;
  isNepali: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  isNepali: false,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLocalLanguage] = useState<'en' | 'ne'>(
    (i18n.language === 'ne' || i18n.language === 'np') ? 'ne' : 'en'
  );

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setLocalLanguage(lng === 'ne' || lng === 'np' ? 'ne' : 'en');
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const handleSetLanguage = (lang: 'en' | 'ne') => {
    setLang(lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        isNepali: language === 'ne',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
