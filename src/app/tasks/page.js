'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaChevronLeft, FaCheck, FaHourglassHalf, FaClock } from 'react-icons/fa6';
import { t } from '../../lib/i18n';
import { useLanguage } from '../components/LanguageProvider';
import { useSettings } from '../components/SettingsProvider';

const FILTERS = ['all', 'completed', 'in_progress', 'overdue'];
const PERIODS = ['today', 'week', 'month'];

const toDateTime = (task) => {
    if (!task?.dueDate) return null;
    const date = new Date(task.dueDate);
    if (Number.isNaN(date.getTime())) return null;
    if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        if (!Number.isNaN(hours)) {
            date.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
        }
    } else {
        date.setHours(9, 0, 0, 0);
    }
    return date;
};

const getDateRange = (period) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (period === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(now.getDate() + diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const getDerivedStatus = (task, now = new Date()) => {
    const storedStatus = (task.status || 'pending').toLowerCase();
    if (storedStatus === 'completed') return 'completed';
    const due = toDateTime(task);
    if (due) {
        const startOfDay = new Date(due);
        startOfDay.setHours(0, 0, 0, 0);
        return now >= startOfDay ? 'in_progress' : 'pending';
    }
    return storedStatus === 'in_progress' ? 'in_progress' : 'pending';
};

function TasksContent() {
    const searchParams = useSearchParams();
    const filter = searchParams.get('filter') || 'all';
    const activeFilter = FILTERS.includes(filter) ? filter : 'all';
    const periodParam = searchParams.get('period') || 'week';
    const activePeriod = PERIODS.includes(periodParam) ? periodParam : 'week';
    const { language } = useLanguage();
    const { formatDate } = useSettings();
    const lang = language || 'id';
    const locale = lang === 'en' ? 'en-US' : 'id-ID';
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const handleUpdateStatus = useCallback(async (taskId, nextStatus) => {
        if (!user?.id) return;
        setTasks(prev => prev.map(task => (task._id === taskId ? { ...task, status: nextStatus } : task)));
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify({ status: nextStatus })
            });
            if (!res.ok) {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            const res = await fetch('/api/tasks', {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data || []);
            }
        }
    }, [user?.id]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedUser = window.localStorage.getItem('todo_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) { }
        }
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        const fetchTasks = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/tasks', {
                    headers: { 'x-user-id': user.id }
                });
                if (!res.ok) throw new Error('Failed to fetch tasks');
                const data = await res.json();
                setTasks(data || []);
            } catch (error) {
                setTasks([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTasks();
    }, [user?.id]);

    const filteredTasks = useMemo(() => {
        const now = new Date();
        const { start, end } = getDateRange(activePeriod);
        return tasks.filter(task => {
            const due = toDateTime(task);
            if (!due) return false;
            if (due < start || due > end) return false;
            const status = getDerivedStatus(task, now);
            const isOverdue = due < now && status !== 'completed';
            if (activeFilter === 'completed') return status === 'completed';
            if (activeFilter === 'in_progress') return status === 'in_progress';
            if (activeFilter === 'overdue') return isOverdue;
            return true;
        });
    }, [tasks, activeFilter, activePeriod]);

    const headerLabel = useMemo(() => {
        switch (activeFilter) {
            case 'completed':
                return t(lang, 'reportsCompleted');
            case 'in_progress':
                return t(lang, 'reportsPending');
            case 'overdue':
                return t(lang, 'reportsOverdue');
            default:
                return t(lang, 'reportsTotalTasks');
        }
    }, [activeFilter, lang]);

    const statusMeta = useMemo(
        () => ({
            completed: {
                label: t(lang, 'statusDone'),
                className: 'bg-indigo-500 text-white'
            },
            in_progress: {
                label: t(lang, 'statusInProgress'),
                className: 'bg-indigo-500 text-white'
            },
            pending: {
                label: t(lang, 'statusTodo'),
                className: 'bg-indigo-500 text-white'
            }
        }),
        [lang]
    );

    return (
        <main className="min-h-screen bg-white px-6 pb-28 pt-8 font-sans dark:bg-slate-950">
            <div className="mx-auto max-w-md space-y-6">
                <header className="flex items-center justify-between">
                    <Link href="/reports" className="flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-600">
                        <FaChevronLeft /> {t(lang, 'reportsHeaderTitle')}
                    </Link>
                </header>

                <section className="rounded-3xl bg-indigo-500 p-5 shadow-sm border border-indigo-500 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white">{headerLabel}</p>
                    <h1 className="text-lg font-extrabold text-white">{filteredTasks.length}</h1>
                </section>

                {isLoading ? (
                    <div className="rounded-2xl border border-indigo-100 bg-white p-6 text-center text-xs font-semibold text-indigo-400 shadow-sm animate-pulse">
                        {t(lang, 'reportsLoading')}
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="rounded-2xl border border-indigo-100 bg-white p-6 text-center text-xs font-semibold text-indigo-400 shadow-sm">
                        {t(lang, 'groupTasksEmpty')}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map(task => {
                            const status = getDerivedStatus(task);
                            const meta = statusMeta[status] || statusMeta.pending;
                            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                            const isInProgress = status === 'in_progress';
                            const isCompleted = status === 'completed';
                            return (
                                <div key={task._id} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${meta.className}`}>
                                            {status === 'completed' ? <FaCheck className="text-[9px]" /> : status === 'in_progress' ? <FaClock className="text-[9px]" /> : <FaHourglassHalf className="text-[9px]" />}
                                            {meta.label}
                                        </span>
                                        {dueDate && (
                                            <span className="text-[10px] font-semibold text-indigo-400">
                                                {formatDate(dueDate)}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900">{task.title}</p>
                                        {task.description && (
                                            <p className="text-[11px] text-indigo-400 mt-1 line-clamp-2">{task.description}</p>
                                        )}
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="flex rounded-full bg-indigo-100 p-0.5 text-[9px] font-bold">
                                            <button
                                                onClick={() => handleUpdateStatus(task._id, 'in_progress')}
                                                className={`rounded-full px-3 py-1 transition-all ${isInProgress ? 'bg-white text-indigo-500 shadow' : 'text-white'}`}
                                            >
                                                {t(lang, 'statusInProgress')}
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(task._id, 'completed')}
                                                className={`rounded-full px-3 py-1 transition-all ${isCompleted ? 'bg-indigo-600 text-white shadow' : 'text-white'}`}
                                            >
                                                {t(lang, 'statusDone')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

// --- PEMBUNGKUS UTAMA DENGAN SUSPENSE UNTUK VERCEL ---
export default function TasksPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-slate-950">
                <div className="rounded-2xl border border-indigo-100 bg-white p-6 text-center text-xs font-semibold text-indigo-400 shadow-sm animate-pulse">
                    Memuat halaman...
                </div>
            </div>
        }>
            <TasksContent />
        </Suspense>
    );
}