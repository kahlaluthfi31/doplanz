'use client';
import Link from 'next/link';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import UserAvatar from '../components/UserAvatar';
import { loadStoredUser, syncUserFromApi } from '../../lib/user';
import { 
  FaPlus, 
  FaRegBell, 
  FaCalendarDays, 
  FaClock, 
  FaCheck, 
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisVertical,
  FaPen,
  FaTrash
} from "react-icons/fa6";
import { FaAngleRight,FaAngleLeft } from "react-icons/fa";
import { t } from '../../lib/i18n';
import { useLanguage } from '../components/LanguageProvider';
import AddTaskSheet from '../components/AddTaskSheet';
import TodoModal from '../components/TodoModal';
import { useModal } from '../components/ModalProvider';
import { useSettings } from '../components/SettingsProvider';

const VIEW_OPTIONS = ['day', 'week', 'month'];
const FILTERS = ['all', 'todo', 'in_progress', 'completed'];
const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const startOfWeek = (date, weekStartsOn = 'monday') => {
  const copy = new Date(date);
  const day = copy.getDay();
  // Adjust based on setting weekStartsOn
  let diff = 0;
  if (weekStartsOn === 'sunday') {
    diff = day;
  } else {
    diff = day === 0 ? 6 : day - 1;
  }
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date, amount) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export default function CalendarPage() {
  const { language, setLanguage } = useLanguage();
  const { formatDate, formatTime } = useSettings();
  const modal = useModal();
  const lang = language || 'id';
  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  const [view, setView] = useState('week');
  const [activeDate, setActiveDate] = useState(new Date());
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [todos, setTodos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [weekStartsOn, setWeekStartsOn] = useState('monday');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const touchStart = useRef(null);

  useEffect(() => {
    if (!menuOpenId) return;
    const handleClickOutside = (event) => {
      if (event.target.closest('[data-task-menu="calendar"]')) return;
      setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  const fetchTodos = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await fetch('/api/tasks', {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setTodos(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?.id]);

  const fetchGroups = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await fetch('/api/task-groups', {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?.id]);

  const statusLabel = (status) => {
    switch (status) {
      case 'completed':
        return { text: t(lang, 'statusDone'), className: 'bg-emerald-100/60 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30' };
      case 'in_progress':
        return { text: t(lang, 'statusInProgress'), className: 'bg-orange-100/60 text-orange-600 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/30' };
      default:
        return { text: t(lang, 'statusTodo'), className: 'bg-indigo-100/60 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30' };
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parsed = loadStoredUser();
    if (!parsed?.id) return;
    setUser(parsed);

    syncUserFromApi(parsed.id).then((fresh) => {
      if (fresh) setUser(fresh);
    });

    fetch('/api/users/settings', {
      headers: { 'x-user-id': parsed.id }
    }).then((res) => {
      if (res.ok) {
        res.json().then((settings) => {
          if (settings.weekStartsOn) {
            setWeekStartsOn(settings.weekStartsOn);
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchGroups();
  }, [fetchTodos, fetchGroups]);

  useEffect(() => {
    if (!user?.id) return;
    fetch('/api/users/settings', {
      headers: { 'x-user-id': user.id }
    }).then(res => {
      if (res.ok) {
        res.json().then(settings => {
          if (settings?.language) {
            setLanguage(settings.language);
          }
        });
      }
    });
  }, [user?.id, setLanguage]);

  const handleUpdateStatus = async (task, nextStatus) => {
    if (!task?.id) return;
    if (!user?.id) return;

    setTodos(prev => prev.map(item => (item._id === task.id ? { ...item, status: nextStatus } : item)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        await fetchTodos();
      }
    } catch (err) {
      await fetchTodos();
    }
  };

  const openEditModal = (taskId) => {
    const rawTask = todos.find(item => item._id === taskId);
    if (!rawTask) return;
    setEditingTask(rawTask);
    setIsEditOpen(true);
    setMenuOpenId(null);
  };

  const handleSaveEdit = async (formData) => {
    if (!editingTask || !user?.id) return;
    const nextStatus = formData.isCompleted
      ? 'completed'
      : (editingTask.status === 'in_progress' ? 'in_progress' : 'pending');
    const payload = {
      title: formData.title,
      description: formData.description?.trim() || null,
      groupId: formData.groupId || null,
      dueDate: formData.dueDate || null,
      dueTime: formData.isAllDay ? null : formData.dueTime || null,
      isAllDay: formData.isAllDay ?? false,
      priority: formData.priority?.toLowerCase?.() || 'medium',
      status: nextStatus
    };
    try {
      const res = await fetch(`/api/tasks/${editingTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update task');
      }
      setIsEditOpen(false);
      setEditingTask(null);
      fetchTodos();
    } catch (error) {
      await modal.alert({
        title: t(lang, 'alertTitleError'),
        message: error.message || t(lang, 'alertGeneralError'),
        confirmLabel: t(lang, 'okAction'),
        tone: 'error'
      });
    }
  };

  const handleDelete = async (taskId) => {
    if (!user?.id) return;
    const confirmed = await modal.confirm({
      title: t(lang, 'confirmDeleteTitle'),
      message: t(lang, 'confirmDeleteMessage'),
      confirmLabel: t(lang, 'confirmAction'),
      cancelLabel: t(lang, 'cancelAction'),
      tone: 'warning'
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete task');
      }
      setMenuOpenId(null);
      fetchTodos();
    } catch (error) {
      await modal.alert({
        title: t(lang, 'alertTitleError'),
        message: error.message || t(lang, 'alertGeneralError'),
        confirmLabel: t(lang, 'okAction'),
        tone: 'error'
      });
    }
  };

  const handleSwipeStart = (event) => {
    touchStart.current = event.touches[0].clientX;
  };

  const handleSwipeEnd = (event) => {
    if (touchStart.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(delta) < 40) return;

    if (view === 'month') {
      const next = new Date(activeDate);
      next.setMonth(activeDate.getMonth() + (delta < 0 ? 1 : -1));
      setActiveDate(next);
    }

    if (view === 'week') {
      setActiveDate(addDays(activeDate, delta < 0 ? 7 : -7));
    }

    if (view === 'day') {
      setActiveDate(addDays(activeDate, delta < 0 ? 1 : -1));
    }
  };

  const combinedTasks = useMemo(() => {
    return todos.map((t) => ({
      id: t._id,
      title: t.title,
      groupId: t.groupId || null,
      status: t.status || 'pending',
      dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
      dueTime: t.dueTime || (t.dueDate ? new Date(t.dueDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '10:00')
    }));
  }, [todos, locale]);

  const filteredTasks = useMemo(() => {
    const tasksForDate = combinedTasks.filter(task => isSameDay(task.dueDate, activeDate));
    if (filter === 'all') return tasksForDate;
    if (filter === 'todo') return tasksForDate.filter(task => task.status === 'pending');
    if (filter === 'in_progress') return tasksForDate.filter(task => task.status === 'in_progress');
    return tasksForDate.filter(task => task.status === 'completed');
  }, [activeDate, filter, combinedTasks]);

  const weekDates = useMemo(() => {
    const start = startOfWeek(activeDate, weekStartsOn);
    return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
  }, [activeDate, weekStartsOn]);

  const viewLabels = {
    day: t(lang, 'viewDay'),
    week: t(lang, 'viewWeek'),
    month: t(lang, 'viewMonth')
  };

  const filterLabels = {
    all: t(lang, 'filterAll'),
    todo: t(lang, 'filterTodo'),
    in_progress: t(lang, 'filterInProgress'),
    completed: t(lang, 'filterCompleted')
  };

  const displayGroups = useMemo(() => {
    return groups.map((group) => ({
      id: group._id,
      name: group.name,
      color: group.color || '#4C6FFF'
    }));
  }, [groups]);

  const groupMap = useMemo(
    () => new Map(displayGroups.map(group => [group.id, group])),
    [displayGroups]
  );

  const dayShortLabels = useMemo(() => {
    const base = Array.from({ length: 7 }, (_, idx) => new Date(2024, 0, 7 + idx));
    const labels = base.map(date => date.toLocaleDateString(locale, { weekday: 'short' }));
    return weekStartsOn === 'sunday' ? labels : [...labels.slice(1), labels[0]];
  }, [locale, weekStartsOn]);

  const monthDates = useMemo(() => {
    const start = startOfMonth(activeDate);
    const end = endOfMonth(activeDate);
    const startDay = weekStartsOn === 'sunday' ? start.getDay() : (start.getDay() || 7) - 1;
    const days = [];

    for (let i = 0; i < startDay; i += 1) {
      days.push(null);
    }

    for (let date = 1; date <= end.getDate(); date += 1) {
      days.push(new Date(activeDate.getFullYear(), activeDate.getMonth(), date));
    }

    return days;
  }, [activeDate, weekStartsOn]);

  const taskStatsByDate = useMemo(() => {
    const map = new Map();
    combinedTasks.forEach(task => {
      const key = task.dueDate.toDateString();
      const entry = map.get(key) || { count: 0, colors: new Set(), overdue: false };
      entry.count += 1;
      const group = groupMap.get(task.groupId);
      if (group?.color) entry.colors.add(group.color);
      if (task.dueDate < new Date() && task.status !== 'completed') {
        entry.overdue = true;
      }
      map.set(key, entry);
    });
    return map;
  }, [combinedTasks, groupMap]);


  return (
  <main className="min-h-screen bg-white px-6 pb-28 pt-8 font-sans dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-md space-y-6">
        
        {/* Dynamic Premium Header */}
        <header className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-3 active:scale-95 transition-transform">
            <UserAvatar user={user} size={40} />
            <div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider dark:text-indigo-200">{t(lang, 'calendarTitle')}</p>
              <h1 className="text-base font-extrabold text-indigo-600 dark:text-indigo-100">
                {activeDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </h1>
            </div>
          </Link>
          <Link
            href="/notifications"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:scale-105 active:scale-95 transition-all text-indigo-400 hover:text-indigo-600 dark:bg-slate-900 dark:text-indigo-200 dark:hover:text-indigo-100"
            aria-label={t(lang, 'notifications')}
          >
            <FaRegBell className="text-base" />
          </Link>
        </header>

        {/* Dynamic Premium Calendar Card */}
        <section className="rounded-3xl bg-white p-5 shadow-sm border border-indigo-50 space-y-4 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5 bg-indigo-500 p-1 rounded-2xl">
              <button
                onClick={() => {
                  if (view === 'month') {
                    const next = new Date(activeDate);
                    next.setMonth(activeDate.getMonth() - 1);
                    setActiveDate(next);
                  } else if (view === 'week') {
                    setActiveDate(addDays(activeDate, -7));
                  } else {
                    setActiveDate(addDays(activeDate, -1));
                  }
                }}
                className="h-6 w-6 pr-1.5 rounded-full flex items-center justify-center text-indigo-500 bg-white active:scale-90 transition-all font-bold text-sm dark:bg-slate-900 dark:text-indigo-200"
              >
                <FaAngleLeft />
              </button>
              <button
                onClick={() => setActiveDate(new Date())}
                className="rounded-xl px-3 py-1 text-[10px] font-extrabold text-white transition-colors bg-indigo-500 dark:bg-indigo-400"
              >
                {t(lang, 'today')}
              </button>
              <button
                onClick={() => {
                  if (view === 'month') {
                    const next = new Date(activeDate);
                    next.setMonth(activeDate.getMonth() + 1);
                    setActiveDate(next);
                  } else if (view === 'week') {
                    setActiveDate(addDays(activeDate, 7));
                  } else {
                    setActiveDate(addDays(activeDate, 1));
                  }
                }}
                className="h-6 w-6 pl-1.5 rounded-full flex items-center justify-center text-indigo-500 bg-white active:scale-90 transition-all font-bold text-sm dark:bg-slate-900 dark:text-indigo-200"
              >
                <FaAngleRight />
              </button>
            </div>
            
            {/* Segments View Toggle */}
            <div className="flex p-1 text-[10px] font-extrabold">
              {VIEW_OPTIONS.map(option => (
                <button
                  key={option}
                  onClick={() => setView(option)}
                  className={`rounded-full px-3.5 py-1.5 transition-all duration-200 ${
                    view === option
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'text-indigo-500 hover:text-indigo-700 dark:text-indigo-200 dark:hover:text-indigo-100'
                  }`}
                >
                  {viewLabels[option]}
                </button>
              ))}
            </div>
          </div>

          {/* DAY VIEW DETAIL */}
          {view === 'day' && (
            <div
              className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
            >
              {(() => {
                const stats = taskStatsByDate.get(activeDate.toDateString());
                const isOverdue = stats?.overdue;
                return (
                  <div
                    className={`w-full rounded-2xl p-4 text-left ${
                      isOverdue
                        ? 'bg-indigo-50/70 border border-indigo-100 text-indigo-700 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-100'
                        : 'bg-indigo-50/50 border border-indigo-50 text-indigo-900 dark:bg-slate-900 dark:border-slate-800 dark:text-indigo-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider opacity-60 dark:text-indigo-200">
                          {activeDate.toLocaleDateString(locale, { weekday: 'long' })}
                        </p>
                        <p className="text-2xl font-black mt-1">
                          {activeDate.getDate()} {activeDate.toLocaleDateString(locale, { month: 'long' })}
                        </p>
                      </div>
                      {stats?.count ? (
                        <span className="rounded-xl bg-white border border-indigo-100 px-3 py-1.5 text-[10px] font-bold text-indigo-600 shadow-sm dark:bg-slate-950 dark:border-slate-700 dark:text-indigo-100">
                          {t(lang, 'calendarTasksCount', { count: stats.count })}
                        </span>
                      ) : (
                        <span className="rounded-xl bg-white/60 px-3 py-1.5 text-[10px] font-bold text-indigo-500 dark:bg-slate-900 dark:text-indigo-200">
                          {t(lang, 'calendarNoTasks')}
                        </span>
                      )}
                    </div>
                    {stats?.colors && (
                      <div className="mt-3 flex items-center gap-1.5">
                        {Array.from(stats.colors).slice(0, 4).map(color => (
                          <span key={color} className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* WEEK VIEW CAROUSEL */}
          {view === 'week' && (
            <div
              className="mt-2 -mx-4 overflow-x-auto scrollbar-none"
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex gap-2.5 px-4 pb-1">
                {weekDates.map(date => {
                  const stats = taskStatsByDate.get(date.toDateString());
                  const isActive = isSameDay(date, activeDate);
                  return (
                    <button
                      key={date.toDateString()}
                      onClick={() => setActiveDate(date)}
                      className={`flex min-w-[58px] max-w-[58px] flex-col items-center rounded-2xl py-3 text-xs transition-all active:scale-95 ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-100 dark:bg-indigo-500 dark:shadow-indigo-900/80' 
                          : 'bg-indigo-300/80 text-indigo-700 dark:bg-slate-900 dark:border-slate-800 dark:text-indigo-200'
                      }`}
                    >
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-100' : 'text-indigo-800 dark:text-indigo-300'}`}>
                        {date.toLocaleDateString(locale, { weekday: 'short' })}
                      </span>
                      <span className="text-base font-black mt-1 leading-none">{date.getDate()}</span>
                      <div className="mt-2.5 flex items-center gap-0.5">
                        {stats?.colors && Array.from(stats.colors).slice(0, 3).map(color => (
                          <span key={color} className="h-1 w-1 rounded-full" style={{ backgroundColor: isActive ? '#fff' : color }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MONTH VIEW GRID */}
          {view === 'month' && (
            <div
              className="mt-2 space-y-2 animate-in fade-in duration-300"
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
            >
              {/* Day Titles */}
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-indigo-400 uppercase tracking-widest dark:text-indigo-200">
                {dayShortLabels.map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {monthDates.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-9" />;
                  }
                  const stats = taskStatsByDate.get(date.toDateString());
                  const isActive = isSameDay(date, activeDate);
                  const isOverdue = stats?.overdue;
                  return (
                    <button
                      key={date.toDateString()}
                      onClick={() => setActiveDate(date)}
                      className={`flex h-10 flex-col items-center justify-between rounded-xl py-1 text-xs transition-all active:scale-90 relative ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:bg-indigo-500 dark:shadow-indigo-900/80'
                          : 'bg-indigo-200/80 text-indigo-700 dark:bg-slate-900 dark:border-slate-800 dark:text-indigo-200'
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${isOverdue && !isActive ? 'text-indigo-600 font-extrabold dark:text-indigo-200' : ''}`}>
                        {date.getDate()}
                      </span>
                      {stats?.count ? (
                        <div className="flex items-center gap-0.5 mb-0.5">
                          {Array.from(stats.colors).slice(0, 3).map(color => (
                            <span key={color} className="h-1 w-1 rounded-full" style={{ backgroundColor: isActive ? '#fff' : color }} />
                          ))}
                        </div>
                      ) : (
                        <div className="h-1 w-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Dynamic Filters Bar */}
        <section className="-mx-6 overflow-x-auto scrollbar-none">
          <div className="flex gap-2.5 px-6">
            <span className="flex h-8 items-center gap-1.5 rounded-full bg-indigo-500 text-white dark:bg-slate-900 dark:text-white px-3 text-[10px] font-bold">
              <FaFilter /> {t(lang, 'filterLabel')}
            </span>
            {FILTERS.map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full px-4 py-1.5 text-[10px] font-extrabold transition-all duration-200 shrink-0 ${
                  filter === tab 
                    ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500' 
                    : 'bg-white border border-indigo-100 text-indigo-500 hover:text-indigo-700 dark:bg-slate-900 dark:border-slate-800 dark:text-indigo-200'
                }`}
              >
                {filterLabels[tab]}
              </button>
            ))}
          </div>
        </section>

        {/* Highly Dynamic Tasks List */}
        <section className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-3xl bg-white border border-indigo-100 p-8 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <div className="flex justify-center mb-2 text-indigo-300 dark:text-indigo-200"><FaCalendarDays className="text-3xl" /></div>
              <p className="text-xs font-semibold text-indigo-300 dark:text-indigo-200">{t(lang, 'calendarNoAgenda')}</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const group = groupMap.get(task.groupId);
              const badge = statusLabel(task.status);
              const isPending = task.status === 'pending';
              const isInProgress = task.status === 'in_progress';
              const isCompleted = task.status === 'completed';
              const borderColor = group?.color || '#4C6FFF';

              return (
                <div 
                  key={task.id} 
                  className="rounded-2xl bg-white p-4 shadow-sm border-l-4 hover:scale-[1.01] hover:shadow transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer dark:bg-slate-900 dark:border-slate-800"
                  style={{ borderLeftColor: borderColor }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center bg-indigo-500 text-white rounded-xl px-2.5 py-1.5 font-bold shrink-0 min-w-[56px]">
                      <FaClock className="text-[9px] mb-0.5" />
                      <span className="text-[9px] tracking-tight">{formatTime(task.dueTime)}</span>
                    </div>
                    
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider dark:text-indigo-200">
                        {group?.name || t(lang, 'calendarGeneralWorkspace')}
                      </p>
                      <p className="text-xs font-bold text-indigo-600 leading-snug line-clamp-1 dark:text-indigo-100">{task.title}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="relative" data-task-menu="calendar">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white"
                      >
                        <FaEllipsisVertical className="text-xs" />
                      </button>
                      {menuOpenId === task.id && (
                        <div className="absolute right-0 top-9 z-10 w-32 rounded-xl border border-indigo-100 bg-white shadow-lg dark:bg-slate-900 dark:border-slate-700">
                          <button
                            onClick={() => openEditModal(task.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-100 dark:hover:bg-slate-800"
                          >
                            <FaPen className="text-[10px]" /> {t(lang, 'editAction')}
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-100 dark:hover:bg-slate-800"
                          >
                            <FaTrash className="text-[10px]" /> {t(lang, 'deleteAction')}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex rounded-full bg-indigo-400 p-0.5 text-[8px] font-bold">
                      
                      <button
                        onClick={() => handleUpdateStatus(task, 'in_progress')}
                        className={`rounded-full px-2 py-1 transition-all ${
                          isInProgress ? 'bg-indigo-700 text-white shadow dark:bg-indigo-500' : 'text-white dark:text-indigo-500'
                        }`}
                      >
                        {t(lang, 'statusInProgress')}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(task, 'completed')}
                        className={`rounded-full px-2 py-1 transition-all ${
                          isCompleted ? 'bg-indigo-700 text-white shadow dark:bg-indigo-500' : 'text-white dark:text-indigo-500'
                        }`}
                      >
                        {t(lang, 'statusDone')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* Majestic Bottom Nav Buttons matchingHomePage */}
      <button
        onClick={() => setIsAddSheetOpen(true)}
        className="fixed bottom-14 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-indigo-500 text-white shadow-[0_12px_30px_rgba(99,102,241,0.4)] dark:bg-indigo-400"
      >
        <FaPlus className="text-xl" />
      </button>

      <nav className="fixed bottom-6 left-1/2 z-20 w-[92%] -translate-x-1/2 rounded-[28px] bg-white/70 backdrop-blur-md border border-white/40 px-8 py-4 shadow-xl dark:bg-slate-900/80 dark:border-slate-800">
        <div className="flex items-center justify-between text-indigo-400 dark:text-indigo-200">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3l9 7v11a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V10l9-7z" />
            </svg>
          </Link>
          
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-100 dark:bg-indigo-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h2a2 2 0 012 2v2H2V6a2 2 0 012-2h2V3a1 1 0 011-1zm14 9v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9h18z" />
            </svg>
          </button>
          
          <div className="h-10 w-10" />
          
          <Link 
            href="/reports" 
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all dark:hover:text-indigo-100"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 9h3v10H5V9zm6-4h3v14h-3V5zm6 7h3v7h-3v-7z" />
            </svg>
          </Link>
          
          <Link 
            href="/profile" 
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all dark:hover:text-indigo-100"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-6 1.67-6 4v2h12v-2c0-2.33-2.67-4-6-4z" />
            </svg>
          </Link>
        </div>
      </nav>
      <TodoModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveEdit}
        isEditing
        todoData={editingTask ? {
          title: editingTask.title,
          description: editingTask.description,
          groupId: editingTask.groupId || '',
          dueTime: editingTask.dueTime || '',
          isAllDay: editingTask.isAllDay ?? !editingTask.dueTime,
          priority: editingTask.priority
            ? editingTask.priority.charAt(0).toUpperCase() + editingTask.priority.slice(1)
            : 'Medium',
          dueDate: editingTask.dueDate,
          isCompleted: editingTask.status === 'completed'
        } : null}
        groups={groups.length > 0 ? groups : displayGroups.map(group => ({
          _id: group.id,
          name: group.name
        }))}
      />
      <AddTaskSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        userId={user?.id}
        onCreated={fetchTodos}
      />
    </main>
  );
}
