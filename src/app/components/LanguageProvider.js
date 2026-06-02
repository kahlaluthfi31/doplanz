'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children, defaultLanguage = 'id' }) => {
  const [language, setLanguageState] = useState(defaultLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('todo_language');
    if (stored) {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((next) => {
    setLanguageState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('todo_language', next);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event) => {
      if (event.key === 'todo_language' && event.newValue) {
        setLanguageState(event.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
