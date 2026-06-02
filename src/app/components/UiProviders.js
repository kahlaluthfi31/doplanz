'use client';

import { useCallback, useEffect, useRef } from 'react';
import { LanguageProvider } from './LanguageProvider';
import { ModalProvider } from './ModalProvider';
import GoogleAuthProvider from './GoogleAuthProvider';
import { SettingsProvider } from './SettingsProvider';
import TaskReminderListener from './TaskReminderListener';

export default function UiProviders({ children }) {
  const mediaQueryRef = useRef(null);
  const currentThemeRef = useRef('light');

  const applyTheme = useCallback((theme) => {
    const html = document.documentElement;
    html.classList.remove('dark');
    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) html.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSystemChange = () => {
      if (currentThemeRef.current === 'system') {
        applyTheme('system');
      }
    };

    const setTheme = (theme) => {
      currentThemeRef.current = theme;
      applyTheme(theme);
      if (mediaQueryRef.current) {
        mediaQueryRef.current.removeEventListener('change', handleSystemChange);
      }
      if (theme === 'system') {
        mediaQueryRef.current = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQueryRef.current.addEventListener('change', handleSystemChange);
      }
    };

    const storedUser = window.localStorage.getItem('todo_user');
    if (!storedUser) {
      setTheme('light');
      return () => {
        if (mediaQueryRef.current) {
          mediaQueryRef.current.removeEventListener('change', handleSystemChange);
        }
      };
    }

    let user;
    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      setTheme('light');
      return;
    }

    fetch('/api/users/settings', { headers: { 'x-user-id': user.id } })
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        setTheme(settings?.theme || 'light');
      })
      .catch(() => {
        setTheme('light');
      });

    return () => {
      if (mediaQueryRef.current) {
        mediaQueryRef.current.removeEventListener('change', handleSystemChange);
      }
    };
  }, [applyTheme]);

  return (
    <GoogleAuthProvider>
      <SettingsProvider>
        <LanguageProvider>
          <ModalProvider>
            <TaskReminderListener />
            {children}
          </ModalProvider>
        </LanguageProvider>
      </SettingsProvider>
    </GoogleAuthProvider>
  );
}
