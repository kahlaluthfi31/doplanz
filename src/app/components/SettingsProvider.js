'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { formatDateValue, formatTimeValue, getLocaleFromLanguage } from '@/lib/formatters';

const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'id',
  timeFormat: '24h',
  dateFormat: 'DD/MM/YYYY',
  notifyPush: true,
  notifyEmail: false,
  notifySound: true,
  reminderDefault: 15,
  twoFactorEnabled: false
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [userId, setUserId] = useState(null);

  const loadSettings = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch('/api/users/settings', { headers: { 'x-user-id': id } });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('todo_settings', JSON.stringify(data));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncUser = () => {
      try {
        const stored = window.localStorage.getItem('todo_user');
        if (!stored) {
          setUserId(null);
          return;
        }
        const user = JSON.parse(stored);
        const id = user?.id || user?._id;
        setUserId(id || null);
        if (id) loadSettings(id);
      } catch {
        setUserId(null);
      }
    };

    const cached = window.localStorage.getItem('todo_settings');
    if (cached) {
      try {
        setSettings((prev) => ({ ...prev, ...JSON.parse(cached) }));
      } catch {
        /* ignore */
      }
    }

    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('todo-settings-changed', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('todo-settings-changed', syncUser);
    };
  }, [loadSettings]);

  const locale = useMemo(() => getLocaleFromLanguage(settings.language), [settings.language]);

  const formatDate = useCallback(
    (dateInput) => formatDateValue(dateInput, settings.dateFormat, locale),
    [settings.dateFormat, locale]
  );

  const formatTime = useCallback(
    (timeStr) => formatTimeValue(timeStr, settings.timeFormat),
    [settings.timeFormat]
  );

  const refreshSettings = useCallback(() => {
    if (userId) loadSettings(userId);
  }, [userId, loadSettings]);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      formatDate,
      formatTime,
      locale,
      refreshSettings,
      userId
    }),
    [settings, formatDate, formatTime, locale, refreshSettings, userId]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
