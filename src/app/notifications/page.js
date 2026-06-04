'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaBell, FaClock, FaGear } from 'react-icons/fa6';
import { t } from '@/lib/i18n';
import { useLanguage } from '../components/LanguageProvider';
import { useSettings } from '../components/SettingsProvider';
import { loadStoredUser, syncUserFromApi } from '@/lib/user';

export default function NotificationsPage() {
  const { language } = useLanguage();
  const { formatDate, formatTime } = useSettings();
  const lang = language || 'id';
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredUser();
    if (!stored?.id) return;
    setUser(stored);
    syncUserFromApi(stored.id).then((fresh) => {
      if (fresh) setUser(fresh);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const fetchReminders = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/reminders', {
          headers: { 'x-user-id': user.id }
        });
        if (res.ok) {
          setReminders(await res.json());
        }
      } catch (error) {
        console.error('Failed to load reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, [user?.id]);

  const formatReminderTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const dateStr = formatDate(date.toISOString().slice(0, 10));
    const timeStr = formatTime(
      `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    );
    return `${dateStr} · ${timeStr}`;
  };

  return (
    <main className="min-h-screen bg-white px-6 pb-28 pt-8 font-sans dark:bg-slate-950">
      <div className="mx-auto max-w-md space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-white hover:bg-indigo-100 active:scale-95 transition-all dark:bg-slate-900 dark:text-indigo-200"
            >
              <FaArrowLeft />
            </Link>
            <div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                {t(lang, 'notifications')}
              </p>
              <h1 className="text-base font-extrabold text-indigo-700 dark:text-indigo-100">
                {t(lang, 'notificationsTitle')}
              </h1>
            </div>
          </div>
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-indigo-400 hover:text-indigo-600 active:scale-95 transition-all dark:bg-slate-900 dark:text-indigo-200"
            aria-label={t(lang, 'notificationSettings')}
          >
            <FaGear />
          </Link>
        </header>

        <section className="rounded-3xl border border-indigo-50 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-white dark:bg-slate-800 dark:text-indigo-200">
                <FaBell className="text-xl" />
              </div>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-100">
                {t(lang, 'notificationsEmptyTitle')}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {t(lang, 'notificationsEmptyDesc')}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {reminders.map((item) => (
                <li
                  key={item._id}
                  className="flex items-start gap-3 rounded-2xl border border-indigo-50 bg-indigo-50/40 p-4 dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
                    <FaClock className="text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100 truncate">
                      {item.taskTitle}
                    </p>
                    <p className="mt-1 text-xs text-indigo-500 dark:text-indigo-300">
                      {formatReminderTime(item.remindAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
