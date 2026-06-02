'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaCalendarDays } from 'react-icons/fa6';
import { t } from '../../lib/i18n';
import { useLanguage } from '../components/LanguageProvider';
import { useSettings } from '../components/SettingsProvider';

export default function ArchivePage() {
  const { language } = useLanguage();
  const { formatDate } = useSettings();
  const lang = language || 'id';
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = window.localStorage.getItem('todo_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {}
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchArchived = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/tasks/archive', {
          headers: { 'x-user-id': user.id }
        });
        if (!res.ok) throw new Error('Failed to fetch archive');
        const data = await res.json();
        setTasks(data || []);
      } catch (error) {
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArchived();
  }, [user?.id]);

  const summary = useMemo(() => tasks.length, [tasks]);

  return (
    <main className="min-h-screen bg-white px-6 pb-28 pt-8 font-sans dark:bg-slate-950">
      <div className="mx-auto max-w-md space-y-6">
        <header className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-600">
            <FaChevronLeft /> {t(lang, 'profileTitle')}
          </Link>
        </header>

        <section className="rounded-3xl bg-indigo-500 p-5 shadow-sm border border-indigo-500 text-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white">{t(lang, 'archivedData')}</p>
          <h1 className="text-lg font-extrabold text-white">{summary}</h1>
        </section>

        {isLoading ? (
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 text-center text-xs font-semibold text-indigo-400 shadow-sm animate-pulse">
            {t(lang, 'reportsLoading')}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 text-center text-xs font-semibold text-indigo-400 shadow-sm">
            {t(lang, 'groupTasksEmpty')}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task._id} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold bg-indigo-500 text-white">
                    {t(lang, 'archivedData')}
                  </span>
                  {task.deletedAt && (
                    <span className="text-[10px] font-semibold text-indigo-400">
                      {formatDate(task.deletedAt)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-900">{task.title}</p>
                  {task.description && (
                    <p className="text-[11px] text-indigo-400 mt-1 line-clamp-2">{task.description}</p>
                  )}
                </div>
                {task.dueDate && (
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-indigo-400">
                    <FaCalendarDays className="text-[10px]" />
                    {formatDate(task.dueDate)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
