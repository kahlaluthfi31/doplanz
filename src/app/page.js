'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState, useCallback } from 'react';
import TodoModal from './components/TodoModal';
import AuthScreen from './components/AuthScreen';
import AddTaskSheet from './components/AddTaskSheet';
import { t } from '../lib/i18n';
import { useLanguage } from './components/LanguageProvider';
import { useModal } from './components/ModalProvider';
import { useSettings } from './components/SettingsProvider';
import { 
  FaPlus, 
  FaCalendarDays, 
  FaChartPie, 
  FaUser, 
  FaCheck, 
  FaHourglassHalf, 
  FaFire, 
  FaStar, 
  FaRegBell,
  FaChevronRight,
  FaListCheck,
  FaArrowTrendUp,
  FaArrowTrendDown
} from 'react-icons/fa6';

export default function HomePage() {
  const AUTH_KEY = 'todo_auth';
  const { language, setLanguage } = useLanguage();
  const { formatDate } = useSettings();
  const modal = useModal();
  const [todos, setTodos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTodo, setCurrentTodo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const showAlert = (tone, titleKey, message) =>
    modal.alert({
      title: t(lang, titleKey),
      message,
      confirmLabel: t(lang, 'okAction'),
      tone
    });

  const showConfirm = (titleKey, messageKey) =>
    modal.confirm({
      title: t(lang, titleKey),
      message: t(lang, messageKey),
      confirmLabel: t(lang, 'confirmAction'),
      cancelLabel: t(lang, 'cancelAction'),
      tone: 'warning'
    });

  const lang = language || 'id';

  const formatShortDate = (dateString) => {
    if (!dateString) return t(lang, 'noDueDate');
    return formatDate(dateString);
  };

  const fetchTodos = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await fetch('/api/tasks', {
        headers: { 'x-user-id': user.id }
      });
      if (!res.ok) throw new Error('Failed to fetch todos');
      const data = await res.json();
      const groupMap = new Map(groups.map(group => [group._id, group.name]));
      setTodos(
        data.map(task => ({
          _id: task._id,
          title: task.title,
          description: task.description || '',
          groupId: task.groupId || null,
          groupName: task.groupId ? groupMap.get(task.groupId) : null,
          priority: (task.priority || 'medium').toLowerCase(),
          isCompleted: task.status === 'completed',
          completedAt: task.completedAt || null,
          updatedAt: task.updatedAt || null,
          dueDate: task.dueDate,
          dueTime: task.dueTime || '',
          isAllDay: task.isAllDay ?? !task.dueTime
        }))
      );
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  }, [user?.id, groups]);

  const fetchGroups = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await fetch('/api/task-groups', {
        headers: { 'x-user-id': user.id }
      });
      if (!res.ok) throw new Error('Failed to fetch groups');
      const data = await res.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_KEY) : null;
    if (stored === '1') {
      setIsAuthenticated(true);
      const storedUser = window.localStorage.getItem('todo_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGroups();
      fetchTodos();
      // Also sync user data if updated in database
      if (user?.id) {
        fetch(`/api/users/me`, {
          headers: { 'x-user-id': user.id }
        }).then(res => {
          if (res.ok) {
            res.json().then(data => {
              setUser(data);
              window.localStorage.setItem('todo_user', JSON.stringify(data));
            });
          }
        });
      }
    }
  }, [isAuthenticated, user?.id, fetchTodos, fetchGroups]);

  const handleCreateGroup = async () => {
    if (!user?.id) return;
    if (!newGroupName.trim()) {
      await showAlert('error', 'alertTitleError', t(lang, 'groupNameRequired'));
      return;
    }
    setIsCreatingGroup(true);
    try {
      const res = await fetch('/api/task-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ name: newGroupName.trim() })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t(lang, 'groupCreateFailed'));
      }
      await showAlert('success', 'alertTitleSuccess', t(lang, 'groupCreateSuccess'));
      setNewGroupName('');
      setIsGroupFormOpen(false);
      fetchGroups();
    } catch (error) {
      await showAlert('error', 'alertTitleError', error.message || t(lang, 'groupCreateFailed'));
    } finally {
      setIsCreatingGroup(false);
    }
  };

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

  const handleAuthSuccess = (userData) => {
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_KEY, '1');
      if (userData?.id) {
        window.localStorage.setItem('todo_user', JSON.stringify(userData));
        setUser(userData);
      }
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm('confirmLogoutTitle', 'confirmLogoutMessage');
    if (!confirmed) return;
    setIsAuthenticated(false);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_KEY);
      window.localStorage.removeItem('todo_user');
    }
  };

  const openAddModal = () => {
    setIsAddSheetOpen(true);
  };

  const openEditModal = (todo) => {
    setIsEditing(true);
    setCurrentTodo(todo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentTodo(null);
  };

  const closeAddSheet = () => {
    setIsAddSheetOpen(false);
  };

  const handleSave = async (formData) => {
    try {
      if (!user?.id) return;
      const payload = {
        title: formData.title,
        description: formData.description || null,
        groupId: formData.groupId || null,
        dueDate: formData.dueDate || null,
        dueTime: formData.isAllDay ? null : formData.dueTime || null,
        isAllDay: formData.isAllDay ?? false,
        priority: (formData.priority || 'medium').toLowerCase(),
        status: formData.isCompleted ? 'completed' : 'pending'
      };
      let res;
      if (isEditing) {
        res = await fetch(`/api/tasks/${currentTodo._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const result = await res.json();
        await fetchTodos();
        closeModal();
      } else {
        const error = await res.json();
        await showAlert('error', 'alertTitleError', t(lang, 'alertPasswordUpdateFailed', { message: error.message }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Toggle todo status directly with animation!
  const handleToggleTodo = async (todo) => {
    if (!user?.id) return;
    const updatedStatus = !todo.isCompleted;
    const statusValue = updatedStatus ? 'completed' : 'pending';
    
    // Optimistic UI update
  setTodos(todos.map(t => t._id === todo._id ? { ...t, isCompleted: updatedStatus } : t));

    try {
      const res = await fetch(`/api/tasks/${todo._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ status: statusValue }),
      });
      if (!res.ok) {
        // Rollback on error
        setTodos(todos.map(t => t._id === todo._id ? { ...t, isCompleted: !updatedStatus } : t));
      }
    } catch (error) {
      setTodos(todos.map(t => t._id === todo._id ? { ...t, isCompleted: !updatedStatus } : t));
    }
  };

  const today = useMemo(() => new Date(), []);
  const isSameDay = (first, second) => first.toDateString() === second.toDateString();

  const isWithinRange = (date, start, end) => date >= start && date <= end;

  const getWeekRange = (weekOffset = 0) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  };

  const getCompletionDate = (todo) => {
    if (!todo.isCompleted) return null;
    if (todo.completedAt) return new Date(todo.completedAt);
    if (todo.updatedAt) return new Date(todo.updatedAt);
    return null;
  };

  const todayTodos = todos.filter(todo =>
    todo.dueDate && isSameDay(new Date(todo.dueDate), today)
  );
  
  const totalToday = todayTodos.length;
  const completedToday = todayTodos.filter(todo => todo.isCompleted).length;
  const pendingToday = totalToday - completedToday;
  const progressPercent = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;

  const todayHeadlineKey = useMemo(() => {
    if (totalToday === 0) return 'homeNoTasksToday';
    if (pendingToday === 0) return 'homeAllTasksDoneToday';
    if (totalToday >= 3 && pendingToday <= 2) return 'homeTasksAlmostDone';
    return 'homeFinishBeforeDeadline';
  }, [totalToday, pendingToday]);

  const weekComparison = useMemo(() => {
    const thisWeek = getWeekRange(0);
    const lastWeek = getWeekRange(-1);

    const countCompletedInRange = (range) =>
      todos.filter(todo => {
        const completedAt = getCompletionDate(todo);
        return completedAt && isWithinRange(completedAt, range.start, range.end);
      }).length;

    const thisWeekCount = countCompletedInRange(thisWeek);
    const lastWeekCount = countCompletedInRange(lastWeek);

    if (lastWeekCount === 0 && thisWeekCount === 0) {
      return { trend: 'neutral', labelKey: 'homeVsLastWeekSame', params: { percent: 0 } };
    }
    if (lastWeekCount === 0) {
      return { trend: 'up', labelKey: 'homeVsLastWeekNew' };
    }

    const change = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
    if (change === 0) {
      return { trend: 'neutral', labelKey: 'homeVsLastWeekSame', params: { percent: 0 } };
    }
    if (change > 0) {
      return { trend: 'up', labelKey: 'homeVsLastWeek', params: { sign: '+', percent: change } };
    }
    return { trend: 'down', labelKey: 'homeVsLastWeek', params: { sign: '', percent: change } };
  }, [todos]);

  const inProgressTodos = todos
    .filter(todo => !todo.isCompleted)
    .slice(0, 6);

  // Exquisite design systems
  const inProgressPalette = [
    { card: 'bg-indigo-500 border-indigo-500', bar: 'bg-white', text: 'text-white', badge: 'bg-white/20 text-white' },
    { card: 'bg-indigo-500 border-indigo-500', bar: 'bg-white', text: 'text-white', badge: 'bg-white/20 text-white' },
    { card: 'bg-indigo-500 border-indigo-500', bar: 'bg-white', text: 'text-white', badge: 'bg-white/20 text-white' },
    { card: 'bg-indigo-500 border-indigo-500', bar: 'bg-white', text: 'text-white', badge: 'bg-white/20 text-white' }
  ];

  const groupPalette = [
    { bg: 'bg-indigo-500/10 text-indigo-600', accent: 'bg-indigo-500', ring: 'border-indigo-400' },
    { bg: 'bg-indigo-500/10 text-indigo-600', accent: 'bg-indigo-500', ring: 'border-indigo-400' },
    { bg: 'bg-indigo-500/10 text-indigo-600', accent: 'bg-indigo-500', ring: 'border-indigo-400' },
    { bg: 'bg-indigo-500/10 text-indigo-600', accent: 'bg-indigo-500', ring: 'border-indigo-400' }
  ];

  const taskGroups = useMemo(() => {
    if (groups.length === 0) return [];

    const stats = todos.reduce((acc, todo) => {
      if (!todo.groupId) return acc;
      if (!acc[todo.groupId]) {
        acc[todo.groupId] = { total: 0, completed: 0 };
      }
      acc[todo.groupId].total += 1;
      if (todo.isCompleted) acc[todo.groupId].completed += 1;
      return acc;
    }, {});

    return groups.map(group => {
      const groupStats = stats[group._id] || { total: 0, completed: 0 };
      return {
        id: group._id,
        name: group.name,
        total: groupStats.total,
        progress: groupStats.total ? Math.round((groupStats.completed / groupStats.total) * 100) : 0,
        color: group.color || null
      };
    });
  }, [groups, todos]);

  // Helper to render user initials or avatar
  const renderAvatar = () => {
    const defaultStyle = "h-11 w-11 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-100 shadow-md relative";
    if (user?.avatarUrl) {
      return (
        <Image
          src={user.avatarUrl}
          alt="User Profile"
          width={44}
          height={44}
          className="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-100 shadow-md"
        />
      );
    }
    return (
      <div className={`${defaultStyle} bg-indigo-500`}>
        {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'LV'}
      </div>
    );
  };

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
  <main className="min-h-screen bg-white px-6 pb-28 pt-8 font-sans dark:bg-slate-950">
      <div className="mx-auto max-w-md space-y-6">
        
        {/* Dynamic Header */}
        <header className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-3 active:scale-95 transition-transform group">
            {renderAvatar()}
            <div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{t(lang, 'homeWelcomeBack')}</p>
              <p className="text-sm font-extrabold text-indigo-700 group-hover:text-indigo-600 transition-all">
                {user?.fullName || 'Kahla Luthfiyah'}
              </p>
            </div>
          </Link>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:scale-105 active:scale-95 transition-all text-indigo-400 hover:text-indigo-600">
            <FaRegBell className="text-base" />
          </button>
        </header>

        {/* Breathtaking Progress Card */}
        <section className="rounded-[28px] bg-indigo-500 text-white p-6 shadow-xl relative overflow-hidden flex items-center justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="space-y-2 z-10">
            <span className="bg-white/20 text-white text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">{t(lang, 'homeTodayProgress')}</span>
            <h2 className="text-base font-extrabold tracking-tight">{t(lang, todayHeadlineKey)}</h2>
            <p className="text-xs text-indigo-100 font-medium">{t(lang, 'homeTrackTasks')}</p>
            <button
              onClick={openAddModal}
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-indigo-500 dark:text-indigo-200 shadow-md hover:bg-indigo-50 active:scale-95 transition-all"
            >
              <FaPlus className="text-[10px]" /> {t(lang, 'addTodo')}
            </button>
          </div>

          <div className="relative h-20 w-20 flex items-center justify-center z-10">
            <div className="absolute inset-0 rounded-full border-4 border-white/30" />
            <div className="absolute inset-1.5 rounded-full bg-indigo-700 flex flex-col items-center justify-center">
              <span className="text-sm font-extrabold leading-none">{progressPercent}%</span>
              <span className="text-[8px] text-indigo-200 mt-0.5">
                {t(lang, 'homeDoneCount', { completed: completedToday, total: totalToday })}
              </span>
            </div>
          </div>
        </section>

        {/* Elevated In Progress Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">{t(lang, 'homeInProgress')}</h2>
            </div>
            <span className="text-[10px] font-bold bg-indigo-500 text-white px-2.5 py-0.5 rounded-full">
              {t(lang, 'homeTasksCount', { count: inProgressTodos.length })}
            </span>
          </div>

          {inProgressTodos.length === 0 ? (
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 text-center shadow-sm">
              <p className="text-xs font-semibold text-indigo-300">{t(lang, 'homeNoTasksInProgress')}</p>
              <button onClick={openAddModal} className="mt-2 text-[10px] font-extrabold text-indigo-600 hover:underline">{t(lang, 'homeCreateNewTask')}</button>
            </div>
          ) : (
            <div
              className="-mx-6 overflow-x-scroll scrollbar-none touch-pan-x overscroll-x-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex gap-4 px-6 pb-2">
                {inProgressTodos.map((todo, index) => {
                  const palette = inProgressPalette[index % inProgressPalette.length];
                  return (
                    <div
                      key={todo._id}
                      className={`min-w-[210px] max-w-[210px] rounded-2xl border ${palette.card} p-4 shadow-sm flex flex-col justify-between relative group hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer`}
                      onClick={() => openEditModal(todo)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${palette.badge}`}>
                            {todo.groupName || t(lang, 'categoryGeneral')}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTodo(todo);
                            }}
                            className="h-6 w-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all"
                          >
                            <FaCheck className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-white/90 transition-colors">
                          {todo.title}
                        </p>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center text-[9px] text-white/70 font-semibold">
                          <span>{t(lang, 'homeProgress')}</span>
                          <span className={palette.text}>50%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                          <div className={`h-full rounded-full ${palette.bar} w-1/2`} />
                        </div>
                        <p className="text-[9px] text-white/70 font-medium">{t(lang, 'homeDueDate', { date: formatShortDate(todo.dueDate) })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Polished Task Groups Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">{t(lang, 'homeTaskGroups')}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-indigo-500 text-white px-2.5 py-0.5 rounded-full">
                {t(lang, 'homeWorkspacesCount', { count: taskGroups.length })}
              </span>
              <button
                onClick={() => setIsGroupFormOpen(true)}
                className="flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                <FaPlus className="text-[9px]" /> {t(lang, 'groupAddAction')}
              </button>
            </div>
          </div>

          {isGroupFormOpen && (
            <div className="rounded-2xl border border-indigo-500 bg-white p-3 shadow-sm space-y-2">
              <input
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder={t(lang, 'groupNamePlaceholder')}
                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-900 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setIsGroupFormOpen(false);
                    setNewGroupName('');
                  }}
                  className="rounded-full px-3 py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-600"
                  disabled={isCreatingGroup}
                >
                  {t(lang, 'cancelAction')}
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                  disabled={isCreatingGroup}
                >
                  {isCreatingGroup ? t(lang, 'savingLabel') : t(lang, 'groupCreateAction')}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {taskGroups.length === 0 ? (
              <div className="rounded-2xl border border-indigo-100 bg-white p-4 text-center text-xs font-semibold text-indigo-300">
                {t(lang, 'emptyGroups')}
              </div>
            ) : (
              taskGroups.map((group, index) => {
                const palette = groupPalette[index % groupPalette.length];
                const avatarStyle = group.color
                  ? { backgroundColor: `${group.color}1a`, color: group.color }
                  : undefined;
                const accentStyle = group.color ? { backgroundColor: group.color } : undefined;
                return (
                  <Link
                    key={group.id}
                    href={`/task-groups/${group.id}`}
                    className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-indigo-50 hover:scale-[1.01] hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl ${palette.bg} flex items-center justify-center font-extrabold text-sm`}
                        style={avatarStyle}
                      >
                        {group.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-indigo-500 leading-tight">{group.name}</p>
                        <p className="text-[10px] text-indigo-400 dark:text-indigo-50/70 mt-0.5 font-medium">{t(lang, 'homeTasksCount', { count: group.total })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-white block">{group.progress}%</span>
                        <div className="w-16 h-1 bg-gray-300 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${palette.accent} rounded-full`}
                            style={{ width: `${group.progress}%`, ...(accentStyle || {}) }}
                          />
                        </div>
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full ${palette.accent} animate-pulse`}
                        style={accentStyle || undefined}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Premium Quick Stats */}
        <section className="rounded-3xl bg-white p-5 shadow-sm border border-indigo-50 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">{t(lang, 'homeStatsSummary')}</h3>
            <span
              className={`flex items-center gap-1 text-[9px] font-bold text-white px-2 py-0.5 rounded-full ${
                weekComparison.trend === 'up'
                  ? 'bg-emerald-500'
                  : weekComparison.trend === 'down'
                    ? 'bg-rose-500'
                    : 'bg-indigo-400'
              }`}
            >
              {weekComparison.trend === 'down' ? <FaArrowTrendDown /> : <FaArrowTrendUp />}
              {t(lang, weekComparison.labelKey, weekComparison.params)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-indigo-200 p-3 transition-colors">
              <p className="text-xl font-black text-white dark:text-indigo-500">{todos.length}</p>
              <p className="text-[9px] text-white dark:text-indigo-500 font-bold uppercase mt-1">{t(lang, 'homeTotal')}</p>
            </div>
            <div className="rounded-2xl bg-indigo-200 p-3 transition-colors">
              <p className="text-xl font-black text-white dark:text-indigo-500">{completedToday}</p>
              <p className="text-[9px] text-white dark:text-indigo-500 font-bold uppercase mt-1">{t(lang, 'homeCompleted')}</p>
            </div>
            <div className="rounded-2xl bg-indigo-200 p-3 transition-colors">
              <p className="text-xl font-black text-white dark:text-indigo-500">{pendingToday}</p>
              <p className="text-[9px] text-white dark:text-indigo-500 font-bold uppercase mt-1">{t(lang, 'homePending')}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Majestic Bottom Add Button */}
      <button
        onClick={openAddModal}
        className="fixed bottom-14 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-indigo-500 text-white shadow-[0_12px_30px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95 transition-all"
      >
        <FaPlus className="text-xl" />
      </button>

      {/* Floating Glassmorphic Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 z-20 w-[92%] -translate-x-1/2 rounded-[28px] bg-white/70 backdrop-blur-md border border-white/40 px-8 py-4 shadow-xl">
  <div className="flex items-center justify-between text-indigo-400">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-100">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3l9 7v11a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V10l9-7z" />
            </svg>
          </button>
          
          <Link
            href="/calendar"
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h2a2 2 0 012 2v2H2V6a2 2 0 012-2h2V3a1 1 0 011-1zm14 9v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9h18z" />
            </svg>
          </Link>
          
          <div className="h-10 w-10" />
          
          <Link 
            href="/reports" 
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 9h3v10H5V9zm6-4h3v14h-3V5zm6 7h3v7h-3v-7z" />
            </svg>
          </Link>
          
          <Link 
            href="/profile" 
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-6 1.67-6 4v2h12v-2c0-2.33-2.67-4-6-4z" />
            </svg>
          </Link>
        </div>
      </nav>

      <TodoModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        isEditing={isEditing}
        todoData={currentTodo}
        groups={groups}
      />
      <AddTaskSheet
        isOpen={isAddSheetOpen}
        onClose={closeAddSheet}
        userId={user?.id}
        onCreated={fetchTodos}
      />
    </main>
  );
}