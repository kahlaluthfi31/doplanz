'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import UserAvatar from '../components/UserAvatar';
import { loadStoredUser, syncUserFromApi } from '../../lib/user';
import { FaPlus } from 'react-icons/fa6';
import { t } from '../../lib/i18n';
import { useLanguage } from '../components/LanguageProvider';
import { useSettings } from '../components/SettingsProvider';
import AddTaskSheet from '../components/AddTaskSheet';
import {
  TbReportAnalytics,
  TbCheck,
  TbPencil,
  TbTrash,
  TbFlame,
  TbTrophy,
  TbSparkles,
  TbCalendarCheck,
  TbHourglass,
  TbAlertTriangle,
  TbArrowUpRight,
  TbTimeline,
  TbCpu
} from "react-icons/tb";

const PERIODS = ['today', 'week', 'month'];
const CHART_TOGGLE = ['created', 'completed'];
const LOG_FILTERS = ['all', 'created', 'completed', 'edited', 'deleted'];

const PRIORITY_META = {
  low: { labelKey: 'priorityLow', color: '#3B82F6' },
  medium: { labelKey: 'priorityMedium', color: '#8B5CF6' },
  high: { labelKey: 'priorityHigh', color: '#F59E0B' },
  urgent: { labelKey: 'priorityUrgent', color: '#EF4444' }
};
const INSIGHT_BG_CLASSES = [
  'bg-indigo-50/70 text-indigo-700 border-indigo-100 dark:bg-slate-800 dark:text-indigo-200 dark:border-slate-700',
  'bg-emerald-50/70 text-emerald-700 border-emerald-100 dark:bg-slate-800 dark:text-emerald-200 dark:border-slate-700',
  'bg-amber-50/70 text-amber-700 border-amber-100 dark:bg-slate-800 dark:text-amber-200 dark:border-slate-700'
];

const formatDateKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const getTaskDueDate = (task) => {
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

const getDerivedStatus = (task, now = new Date()) => {
  const storedStatus = (task.status || 'pending').toLowerCase();
  if (storedStatus === 'completed') return 'completed';
  const dueDate = getTaskDueDate(task);
  if (dueDate) {
    const startOfDay = new Date(dueDate);
    startOfDay.setHours(0, 0, 0, 0);
    return now >= startOfDay ? 'in_progress' : 'pending';
  }
  return storedStatus === 'in_progress' ? 'in_progress' : 'pending';
};

export default function ReportsPage() {
  const { language, setLanguage } = useLanguage();
  const { formatDate } = useSettings();
  const lang = language || 'id';
  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  const dayNames = useMemo(
    () => Array.from({ length: 7 }, (_, idx) => new Date(2024, 0, 7 + idx).toLocaleDateString(locale, { weekday: 'long' })),
    [locale]
  );
  const periodLabels = useMemo(
    () => ({
      today: t(lang, 'periodToday'),
      week: t(lang, 'periodWeek'),
      month: t(lang, 'periodMonth')
    }),
    [lang]
  );
  const chartLabels = useMemo(
    () => ({
      created: t(lang, 'chartCreated'),
      completed: t(lang, 'chartCompleted')
    }),
    [lang]
  );
  const logLabels = useMemo(
    () => ({
      all: t(lang, 'logAll'),
      created: t(lang, 'logCreated'),
      completed: t(lang, 'logCompleted'),
      edited: t(lang, 'logEdited'),
      deleted: t(lang, 'logDeleted')
    }),
    [lang]
  );
  const [period, setPeriod] = useState('week');
  const [chartMode, setChartMode] = useState('completed');
  const [logFilter, setLogFilter] = useState('all');
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });
  const [productivitySeries, setProductivitySeries] = useState([]);
  const [priorityDistribution, setPriorityDistribution] = useState([]);
  const [groupDistribution, setGroupDistribution] = useState([]);
  const [streakStats, setStreakStats] = useState({ current: 0, longest: 0, completionRate: 0 });
  const [heatmap, setHeatmap] = useState([]);
  const [efficiency, setEfficiency] = useState({ averageMinutes: null, fastest: null, longest: null, trend: '' });
  const [logs, setLogs] = useState([]);
  const [insights, setInsights] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [taskStats, setTaskStats] = useState({ inProgress: 0, overdue: 0 });

  const donutStyle = useMemo(() => {
    const segments = priorityDistribution.reduce((acc, item) => {
      const start = acc.offset;
      const end = start + item.value;
      acc.stops.push(`${item.color} ${start}% ${end}%`);
      acc.offset = end;
      return acc;
    }, { offset: 0, stops: [] });

    if (segments.stops.length === 0) {
      return { background: 'conic-gradient(#e2e8f0 0% 100%)' };
    }
    return {
      background: `conic-gradient(${segments.stops.join(',')})`
    };
  }, [priorityDistribution]);

  const { start, end } = useMemo(() => getDateRange(period), [period]);

  const displaySeries = useMemo(() => {
    if (period === 'today') {
      const hourMap = new Map();
      productivitySeries.forEach(item => {
        const date = new Date(item.date);
        const hour = date.getHours();
        const existing = hourMap.get(hour) || { created: 0, completed: 0 };
        hourMap.set(hour, {
          created: existing.created + (item.created || 0),
          completed: existing.completed + (item.completed || 0)
        });
      });
      return Array.from({ length: 24 }, (_, hour) => {
        const entry = hourMap.get(hour) || { created: 0, completed: 0 };
        const date = new Date(start);
        date.setHours(hour, 0, 0, 0);
        return { date, created: entry.created, completed: entry.completed };
      });
    }

    const map = new Map(productivitySeries.map(item => [formatDateKey(item.date), item]));
    const startDate = new Date(start);
    const endDate = new Date(end);
    const totalDays = Math.floor((endDate - startDate) / 86400000) + 1;
    const windowDays = totalDays < 7 ? 7 : totalDays;
    const rangeStart = totalDays < 7 ? new Date(endDate) : new Date(startDate);
    if (totalDays < 7) {
      rangeStart.setDate(endDate.getDate() - 6);
    }

    return Array.from({ length: windowDays }, (_, index) => {
      const date = new Date(rangeStart);
      date.setDate(rangeStart.getDate() + index);
      const key = formatDateKey(date);
      const entry = map.get(key) || { created: 0, completed: 0 };
      return {
        date,
        created: entry.created || 0,
        completed: entry.completed || 0
      };
    });
  }, [productivitySeries, start, end, period]);

  const chartTickLabel = (date) => {
    if (period === 'today') {
      return `${String(date.getHours()).padStart(2, '0')}:00`;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const displayValues = displaySeries.map(item =>
    chartMode === 'created' ? item.created : item.completed
  );
  const displayMax = Math.max(...displayValues, 1);

  const filteredLogs = logs.filter(log => logFilter === 'all' || log.type === logFilter);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parsed = loadStoredUser();
    if (!parsed?.id) return;
    setUser(parsed);
    syncUserFromApi(parsed.id).then((fresh) => {
      if (fresh) setUser(fresh);
    });
  }, []);

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

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const fetchTaskStats = async () => {
      try {
        const res = await fetch('/api/tasks', {
          headers: { 'x-user-id': userId }
        });
        if (!res.ok) return;
        const data = await res.json();
        const now = new Date();
        let inProgress = 0;
        let overdue = 0;
        data.forEach(task => {
          const dueDate = getTaskDueDate(task);
          if (!dueDate) return;
          if (dueDate < start || dueDate > end) return;
          const status = getDerivedStatus(task, now);
          const isOverdue = dueDate < now && status !== 'completed';
          if (isOverdue) overdue += 1;
          if (status === 'in_progress') inProgress += 1;
        });
        setTaskStats({ inProgress, overdue });
      } catch (error) {
        setTaskStats({ inProgress: 0, overdue: 0 });
      }
    };
    fetchTaskStats();
  }, [userId, start, end]);

  useEffect(() => {
    const fetchReports = async () => {
      if (!userId) {
        setIsLoading(false);
        setErrorMessage(t(lang, 'reportsLoginRequired'));
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');
        const params = new URLSearchParams({
          userId,
          start: start.toISOString(),
          end: end.toISOString(),
          period
        });
        const response = await fetch(`/api/reports?${params.toString()}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || t(lang, 'reportsLoadError'));
        }
        const data = await response.json();

        setSummary({
          total: data.summary?.total ?? 0,
          completed: data.summary?.completed ?? 0,
          pending: data.summary?.pending ?? 0,
          overdue: data.summary?.overdue ?? 0
        });

        setProductivitySeries(
          (data.productivity || []).map(item => ({
            date: item.date,
            created: item.created ?? item.total ?? 0,
            completed: item.completed ?? 0
          }))
        );

        const totalPriority = (data.priorities || []).reduce((acc, item) => acc + item.count, 0) || 1;
        const priorityMap = data.priorities?.reduce((acc, item) => {
          acc[item.priority] = item.count;
          return acc;
        }, {}) || {};
        setPriorityDistribution(
          Object.entries(PRIORITY_META).map(([key, meta]) => ({
            label: t(lang, meta.labelKey),
            value: Math.round(((priorityMap[key] || 0) / totalPriority) * 100),
            color: meta.color
          }))
        );

        setGroupDistribution(
          (data.groups || []).map(group => ({
            name: group.name,
            count: group.count,
            color: group.color || '#4C6FFF'
          }))
        );

        setStreakStats({
          current: data.streakStats?.current ?? 0,
          longest: data.streakStats?.longest ?? 0,
          completionRate: data.streakStats?.completionRate ?? 0
        });

        setHeatmap(
          (data.streaks || []).map((entry, index) => ({
            id: entry._id || index,
            value: Math.min(8, Math.round((entry.tasksCompleted || 0) / 2))
          }))
        );

        setEfficiency({
          averageMinutes: data.efficiency?.averageMinutes ?? null,
          fastest: data.efficiency?.fastest ?? null,
          longest: data.efficiency?.longest ?? null,
          trend: data.efficiency?.trend ?? ''
        });

        setLogs(
          (data.activityLogs || []).map((log, index) => {
            const typeKey = log.type ? log.type.toLowerCase() : 'edited';
            const icon = typeKey === 'completed'
              ? TbCheck
              : typeKey === 'deleted'
                ? TbTrash
                : typeKey === 'created'
                  ? TbSparkles
                  : TbPencil;
            const typeLabel = logLabels[typeKey] || log.type;
            return {
              id: log._id || index,
              icon,
              text: log.description || `${typeLabel} ${log.taskTitle ? `"${log.taskTitle}"` : t(lang, 'reportsTaskLabel')}`,
              time: log.createdAt ? formatDate(log.createdAt) : t(lang, 'reportsJustNow'),
              type: typeKey
            };
          })
        );

        const topDay = data.insight?.dayOfWeek;
        const insightDay = topDay ? dayNames[topDay - 1] : null;
        const insightText = insightDay
          ? t(lang, 'reportsBestDay', { day: insightDay })
          : t(lang, 'reportsKeepLogging');

        setInsights([
          insightText,
          t(lang, 'reportsTasksCompleted', { count: data.insight?.tasksCompleted ?? 0 }),
          t(lang, 'reportsCompletionRate', { rate: data.streakStats?.completionRate ?? 0 })
        ]);
      } catch (error) {
        console.error('Failed to load reports:', error);
        setErrorMessage(error.message || t(lang, 'reportsLoadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [userId, start, end, dayNames, lang, locale, logLabels, period, formatDate]);


  return (
    <main className="min-h-screen bg-gray-50 px-6 pb-28 pt-8 font-sans">
      <div className="mx-auto max-w-md space-y-6">

        {/* Dynamic Premium Header */}
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/profile" className="flex items-center gap-3 active:scale-95 transition-transform">
              <UserAvatar user={user} size={40} />
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t(lang, 'reportsHeaderSubtitle')}</p>
                <h1 className="text-base font-extrabold text-indigo-500">{t(lang, 'reportsHeaderTitle')}</h1>
              </div>
            </Link>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:scale-105 active:scale-95 transition-all text-gray-400 hover:text-indigo-600">
              <TbReportAnalytics className="text-lg" />
            </button>
          </div>

          {/* Segments Period Selector */}
          <div className="grid grid-cols-3 gap-2 bg-gray-200/80 dark:bg-slate-700 p-1 rounded-full text-[11px] font-extrabold text-center">
            {PERIODS.map(item => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`py-2 rounded-full transition-all duration-200 ${period === item
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-800'
                  }`}
              >
                {periodLabels[item]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center bg-white py-1 rounded-full border border-gray-50">
            {formatDate(start)} - {formatDate(end)}
          </p>
        </header>

        {errorMessage && (
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-semibold text-red-500">
            {errorMessage}
          </div>
        )}

        {isLoading && !errorMessage && (
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-6 text-center text-xs font-semibold text-gray-400 shadow-sm animate-pulse">
            {t(lang, 'reportsLoading')}
          </div>
        )}

        {/* Breathtaking Stat Grid */}
        <section className="grid grid-cols-2 gap-3.5">
          <Link
            href={`/tasks?filter=all&period=${period}`}
            className="rounded-2xl bg-indigo-500 p-4 border border-indigo-500 flex items-center justify-between h-24 dark:bg-slate-900 dark:border-slate-700 hover:scale-[1.01] transition-transform"
          >
            <div>
              <p className="text-[10px] text-white font-bold uppercase tracking-wider">{t(lang, 'reportsTotalTasks')}</p>
              <p className="text-xl font-black text-white dark:text-white">{summary.total}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white text-3xl dark:bg-slate-800 dark:text-indigo-200"><TbCalendarCheck /></span>
          </Link>

          <Link
            href={`/tasks?filter=completed&period=${period}`}
            className="rounded-2xl bg-indigo-500 p-4 border border-indigo-500 flex items-center justify-between h-24 dark:bg-slate-900 dark:border-slate-700 hover:scale-[1.01] transition-transform"
          >
            <div>
              <p className="text-[10px] text-white font-bold uppercase tracking-wider">{t(lang, 'reportsCompleted')}</p>
              <p className="text-xl font-black text-white dark:text-white">
                {summary.completed}
                <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-md ml-1.5 align-middle dark:bg-slate-800 dark:text-indigo-200">
                  {summary.total ? Math.round((summary.completed / summary.total) * 100) : 0}%
                </span>
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white text-xl dark:bg-slate-800 dark:text-indigo-200"><TbCheck /></span>
          </Link>

          <Link
            href={`/tasks?filter=in_progress&period=${period}`}
            className="rounded-2xl bg-indigo-500 p-4 border border-indigo-500 flex items-center justify-between h-24 dark:bg-slate-900 dark:border-slate-700 hover:scale-[1.01] transition-transform"
          >
            <div>
              <p className="text-[10px] text-white font-bold uppercase tracking-wider">{t(lang, 'reportsPending')}</p>
              <p className="text-xl font-black text-white dark:text-white">{taskStats.inProgress}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white text-xl dark:bg-slate-800 dark:text-indigo-200"><TbHourglass /></span>
          </Link>

          <Link
            href={`/tasks?filter=overdue&period=${period}`}
            className="rounded-2xl bg-indigo-500 p-4 border border-indigo-500 flex items-center justify-between h-24 dark:bg-slate-900 dark:border-slate-700 hover:scale-[1.01] transition-transform"
          >
            <div>
              <p className="text-[10px] text-white font-bold uppercase tracking-wider">{t(lang, 'reportsOverdue')}</p>
              <p className="text-xl font-black text-white dark:text-white">{taskStats.overdue}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white text-xl dark:bg-slate-800 dark:text-indigo-200"><TbAlertTriangle /></span>
          </Link>
        </section>

        {/* Premium Productivity & Priority Chart Container */}
        <section className="rounded-3xl bg-white p-5 shadow-sm border border-gray-50 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">{t(lang, 'reportsDistribution')}</h2>
            <div className="flex rounded-full bg-gray-50 p-1 text-[9px] font-extrabold">
              {CHART_TOGGLE.map(item => (
                <button
                  key={item}
                  onClick={() => setChartMode(item)}
                  className={`rounded-full px-2 py-1 transition-all ${chartMode === item ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500'
                    }`}
                >
                  {chartLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
            {/* Donut Area */}
            <div className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100">
              <div className="relative h-20 w-20 rounded-full flex items-center justify-center shadow-inner" style={donutStyle}>
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-[8px] font-black text-gray-400"></div>
              </div>
              <div className="flex-1 space-y-1.5 text-[10px] font-bold">
                {priorityDistribution.map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rounded Columns Chart */}
            <div className="flex items-end gap-2.5 overflow-x-auto scrollbar-none pb-2 h-28 pt-4 justify-between border-b border-gray-100 px-1">
              {displaySeries.map((item, index) => {
                const height = (displayValues[index] / displayMax) * 60 + 10;
                return (
                  <div key={item.date.toISOString()} className="flex flex-col items-center gap-2 grow shrink-0">
                    <div className="w-3 rounded-full bg-gray-150 h-[70px] flex items-end">
                      <div
                        className="w-full rounded-full bg-gradient-to-t from-indigo-500 to-purple-600 shadow-sm"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-gray-400 font-extrabold uppercase">{chartTickLabel(item.date)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Polished Workspaces Distribution */}
        <section className="rounded-3xl bg-white p-5 shadow-sm border border-gray-50 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">{t(lang, 'reportsWorkspaceDistribution')}</h2>
          <div className="space-y-3.5">
            {groupDistribution.length === 0 ? (
              <p className="text-xs text-gray-400 text-center font-medium">{t(lang, 'reportsNoDistribution')}</p>
            ) : (
              groupDistribution.map(group => (
                <div key={group.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-600">{group.name}</span>
                    <span className="text-gray-900">{t(lang, 'reportsTasksCount', { count: group.count })}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-50 overflow-hidden border border-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500 shadow-sm"
                      style={{
                        width: `${summary.total ? (group.count / summary.total) * 100 : 0}%`,
                        backgroundColor: group.color
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Streaks Reward Cards */}
        <section className="rounded-3xl bg-white p-5 shadow-sm border border-gray-50 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">{t(lang, 'reportsStreakTitle')}</h2>
          <div className="grid grid-cols-3 gap-3 text-center">

            {/* Flame active card */}
            <div className="rounded-2xl bg-red-400 p-3 text-white shadow-md flex flex-col justify-between h-20 hover:scale-105 active:scale-95 transition-transform duration-200">
              <span className="text-lg flex justify-center"><TbFlame /></span>
              <div className="space-y-0.5">
                <p className="text-base font-black leading-none">{t(lang, 'reportsDays', { count: streakStats.current })}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider opacity-85">{t(lang, 'reportsStreakLabel')}</p>
              </div>
            </div>

            {/* Longest record trophy */}
            <div className="rounded-2xl bg-orange-400 p-3 text-white shadow-md flex flex-col justify-between h-20 hover:scale-105 active:scale-95 transition-transform duration-200">
              <span className="text-lg flex justify-center"><TbTrophy /></span>
              <div className="space-y-0.5">
                <p className="text-base font-black leading-none">{t(lang, 'reportsDays', { count: streakStats.longest })}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider opacity-85">{t(lang, 'reportsRecordLabel')}</p>
              </div>
            </div>

            {/* Completion rate card */}
            <div className="rounded-2xl bg-purple-400 p-3 text-white shadow-md flex flex-col justify-between h-20 hover:scale-105 active:scale-95 transition-transform duration-200">
              <span className="text-xs font-bold leading-none">{streakStats.completionRate}%</span>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black leading-none">{t(lang, 'reportsRatioLabel')}</p>
                <p className="text-[8px] font-bold uppercase tracking-wider opacity-85">{t(lang, 'reportsCompletedLabel')}</p>
              </div>
            </div>

          </div>
        </section>

        {/* Clean Efficiency Performance */}
        <section className="rounded-3xl bg-white p-5 shadow-sm border border-gray-50 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">{t(lang, 'reportsEfficiencyTitle')}</h2>
            <span className="flex items-center gap-1 text-[9px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
              <TbArrowUpRight /> {t(lang, 'reportsEfficiencyDetail')}
            </span>
          </div>

          <div className="space-y-3.5 text-xs font-bold text-gray-500">
            <div className="flex items-center justify-between py-1 border-b border-gray-50">
              <span>{t(lang, 'reportsAverageTaskTime')}</span>
              <span className="text-gray-500">
                {t(lang, 'reportsMinutes', { count: efficiency.averageMinutes ? Math.round(efficiency.averageMinutes) : 0 })}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-50">
              <span>{t(lang, 'reportsFastest')}</span>
              <span className="text-emerald-600 max-w-[140px] truncate text-right">
                {efficiency.fastest?.title || t(lang, 'reportsNoData')}
                {efficiency.fastest ? ` (${efficiency.fastest.minutes}m)` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-50">
              <span>{t(lang, 'reportsLongest')}</span>
              <span className="text-amber-600 max-w-[140px] truncate text-right">
                {efficiency.longest?.title || t(lang, 'reportsNoData')}
                {efficiency.longest ? ` (${efficiency.longest.minutes}m)` : ''}
              </span>
            </div>

            <p className="text-[10px] font-bold text-indigo-600 tracking-tight leading-relaxed pt-1 flex items-center gap-1">
              <TbCpu /> {efficiency.trend || t(lang, 'reportsKeepGoing')}
            </p>
          </div>
        </section>

        {/* Exquisite History Log Timeline */}
        <section className="rounded-3xl bg-white p-5 shadow-sm border border-gray-50 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">{t(lang, 'reportsTimeline')}</h2>
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-400 text-xs"><TbTimeline /></span>
          </div>

          <div className="flex gap-2 text-[9px] font-extrabold text-gray-400 overflow-x-auto scrollbar-none pb-2 border-b border-gray-50">
            {LOG_FILTERS.map(item => (
              <button
                key={item}
                onClick={() => setLogFilter(item)}
                className={`px-3 py-1 rounded-full transition-colors shrink-0 ${logFilter === item ? 'bg-indigo-600/10 text-indigo-700' : 'hover:text-gray-700'
                  }`}
              >
                {logLabels[item]}
              </button>
            ))}
          </div>

          <div className="relative border-l border-gray-100 pl-4 space-y-5 py-2">
            {filteredLogs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center font-medium py-3">{t(lang, 'reportsNoActivity')}</p>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="relative flex items-start gap-3.5 text-xs">
                  {/* Timeline point */}
                  <span className="absolute -left-[24.5px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-indigo-500 text-[8px] text-indigo-500">
                    ●
                  </span>
                  <div>
                    <p className="font-extrabold text-gray-800 leading-snug">{log.text}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">{log.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* AI Recommendations Card */}
        <section className="rounded-3xl bg-white p-5 text-gray-800 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

          <h2 className="text-xs font-black uppercase tracking-widest dark:text-indigo-200 text-indigo-500 flex items-center gap-1.5">
            {t(lang, 'reportsInsights')}
          </h2>

          <ul className="space-y-3.5 text-xs font-medium leading-relaxed">
            {insights.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className={`rounded-2xl p-3 border leading-snug relative ${INSIGHT_BG_CLASSES[index % INSIGHT_BG_CLASSES.length]
                  }`}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Floating Plus Button matching HomePage */}
      <button
        onClick={() => setIsAddSheetOpen(true)}
        className="fixed bottom-14 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_12px_30px_rgba(79,70,229,0.4)]"
      >
        <FaPlus className="text-xl" />
      </button>

      {/* Floating Nav matching HomePage */}
      <nav className="fixed bottom-6 left-1/2 z-20 w-[92%] -translate-x-1/2 rounded-[28px] bg-white/70 backdrop-blur-md border border-white/40 px-8 py-4 shadow-xl">
        <div className="flex items-center justify-between text-gray-400">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3l9 7v11a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V10l9-7z" />
            </svg>
          </Link>

          <Link href="/calendar" className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h2a2 2 0 012 2v2H2V6a2 2 0 012-2h2V3a1 1 0 011-1zm14 9v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9h18z" />
            </svg>
          </Link>

          <div className="h-10 w-10" />

          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-100">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 9h3v10H5V9zm6-4h3v14h-3V5zm6 7h3v7h-3v-7z" />
            </svg>
          </button>

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
      <AddTaskSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        userId={user?.id}
      />
    </main>
  );
}
