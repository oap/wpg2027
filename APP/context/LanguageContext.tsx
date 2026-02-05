import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { translations, Language } from '../i18n/translations';

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations.en, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    // Try to get from localStorage or default to 'en'
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('app-language');
        return (saved === 'en' || saved === 'zh') ? saved : 'en';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app-language', lang);
        document.documentElement.lang = lang;
    };

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const t = (key: keyof typeof translations.en, params?: Record<string, string | number>) => {
        let text = translations[language][key] || translations['en'][key] || key;

        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                text = text.replace(`{${paramKey}}`, String(paramValue));
            });
        }

        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
