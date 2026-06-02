'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FaCalendarDays,
  FaClock,
  FaLayerGroup,
  FaXmark,
  FaRegBell
} from 'react-icons/fa6';
import { GoTriangleDown } from "react-icons/go";
import { t } from '../../lib/i18n';
import { useLanguage } from './LanguageProvider';
import { useModal } from './ModalProvider';

const PRIORITY_OPTIONS = [
  { id: 'low', labelKey: 'priorityLow', activeClass: 'border-blue-600 bg-blue-600 text-white' },
  { id: 'medium', labelKey: 'priorityMedium', activeClass: 'border-indigo-600 bg-indigo-600 text-white' },
  { id: 'high', labelKey: 'priorityHigh', activeClass: 'border-amber-500 bg-amber-500 text-white' },
  { id: 'urgent', labelKey: 'priorityUrgent', activeClass: 'border-red-600 bg-red-600 text-white' }
];

const REMINDER_OPTIONS = [
  { value: 5, labelKey: 'reminder5m' },
  { value: 15, labelKey: 'reminder15m' },
  { value: 30, labelKey: 'reminder30m' },
  { value: 60, labelKey: 'reminder1h' },
  { value: 'none', labelKey: 'reminderNone' }
];

const toLocalDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentDateTime = () => {
  const now = new Date();
  const date = toLocalDateString(now);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return { date, time: `${hours}:${minutes}` };
};

export default function AddTaskSheet({ isOpen, onClose, userId, onCreated }) {
  const { language } = useLanguage();
  const modal = useModal();
  const lang = language || 'id';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [showGroups, setShowGroups] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [priority, setPriority] = useState('medium');
  const [showReminder, setShowReminder] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const toLocalDateString = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const { date, time } = getCurrentDateTime();
    setDueDate(date);
    setDueTime(time);
    setIsAllDay(false);
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const controller = new AbortController();

    const loadData = async () => {
      try {
        const groupsRes = await fetch('/api/task-groups', {
          headers: { 'x-user-id': userId },
          signal: controller.signal
        });
        if (groupsRes.ok) {
          setGroups(await groupsRes.json());
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      }
    };

    loadData();
    return () => controller.abort();
  }, [isOpen, userId]);

  const resetForm = () => {
    const { date, time } = getCurrentDateTime();
    setTitle('');
    setDescription('');
    setGroupId('');
    setDueDate(date);
    setDueTime(time);
    setIsAllDay(false);
    setPriority('medium');
    setReminderMinutes(null);
    setShowReminder(false);
  };

  const selectedGroup = useMemo(
    () => groups.find(item => item._id === groupId),
    [groups, groupId]
  );

  const todayMinDate = useMemo(() => toLocalDateString(new Date()), []);

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      await modal.alert({
        title: t(lang, 'alertTitleError'),
        message: t(lang, 'taskTitleRequired'),
        confirmLabel: t(lang, 'okAction'),
        tone: 'error'
      });
      return;
    }

    if (!userId) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          groupId: groupId || null,
          dueDate: dueDate || null,
          dueTime: isAllDay ? null : dueTime || null,
          isAllDay,
          priority,
          ...(reminderMinutes === 'none'
            ? { skipReminder: true }
            : reminderMinutes != null
              ? { hasCustomReminder: true, reminderMinutes }
              : {})
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create task');
      }

      await modal.alert({
        title: t(lang, 'alertTitleSuccess'),
        message: t(lang, 'taskCreatedSuccess'),
        confirmLabel: t(lang, 'okAction'),
        tone: 'success'
      });

      onCreated?.();
      handleClose();
    } catch (error) {
      await modal.alert({
        title: t(lang, 'alertTitleError'),
        message: error.message || t(lang, 'alertGeneralError'),
        confirmLabel: t(lang, 'okAction'),
        tone: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center overflow-hidden bg-black/40 backdrop-blur-sm p-0 sm:items-center sm:p-4 sm:py-6">
      <button
        aria-label="Close"
        className="absolute inset-0"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-xl min-w-0 max-h-[92dvh] rounded-t-3xl bg-white shadow-2xl overflow-hidden flex flex-col sm:max-h-[90dvh] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6 shrink-0">
          <h3 className="text-sm font-bold text-gray-800">{t(lang, 'addTaskTitle')}</h3>
          <button
            onClick={handleClose}
            className="rounded-full bg-gray-100 p-2 text-gray-500 hover:text-gray-700"
          >
            <FaXmark />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(lang, 'taskTitlePlaceholder')}
              className="min-w-0 w-full flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-900 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="relative w-full sm:w-44 sm:shrink-0">
              <button
                onClick={() => {
                  setShowGroups(!showGroups);
                }}
                className="flex w-full items-center justify-between rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700 focus:outline-none"
              >
                <span className="flex items-center truncate">
                  <span className="truncate">{selectedGroup?.name || t(lang, 'selectGroup')}</span>
                </span>
                <span className="text-xs text-gray-400 ml-2 shrink-0"><GoTriangleDown /></span>
              </button>
              {showGroups && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-lg">
                  {groups.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-gray-400">{t(lang, 'emptyGroups')}</p>
                  ) : (
                    groups.map(group => (
                      <button
                        key={group._id}
                        onClick={() => {
                          setGroupId(group._id);
                          setShowGroups(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: group.color || '#7C3AED' }}
                          >
                            {(group.icon || group.name?.[0] || 'G').toUpperCase()}
                          </span>
                          <span className="truncate">{group.name}</span>
                        </span>
                        {groupId === group._id && <span className="text-indigo-500">✓</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(lang, 'taskDescriptionPlaceholder')}
              className="min-w-0 w-full flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700 focus:outline-none focus:border-indigo-500"
            />
            <div className="relative w-full sm:w-48 sm:shrink-0">
              <button
                onClick={() => setShowReminder(!showReminder)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="truncate">
                    {reminderMinutes === 'none'
                      ? t(lang, 'reminderNone')
                      : reminderMinutes
                        ? t(lang, 'reminderSelected', { minutes: reminderMinutes })
                        : t(lang, 'reminderDefaultHint')}
                  </span>
                </span>
                <span className="text-[10px] text-gray-400 ml-2 shrink-0"><GoTriangleDown /></span>
              </button>
              {showReminder && (
                <div className="absolute left-0 right-0 z-10 mt-1 rounded-2xl border border-gray-100 bg-white shadow-lg">
                  {REMINDER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setReminderMinutes(option.value);
                        setShowReminder(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      {t(lang, option.labelKey)}
                      {reminderMinutes === option.value && <span className="text-indigo-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-gray-500">
              {t(lang, 'dueDate')}
              <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
                <FaCalendarDays className="shrink-0 text-indigo-500" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={todayMinDate}
                  className="min-w-0 flex-1 max-w-full bg-transparent text-xs font-semibold text-gray-700 focus:outline-none"
                />
              </div>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-gray-500">
              {t(lang, 'dueTime')}
              <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FaClock className="shrink-0 text-purple-500" />
                  {!isAllDay && (
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="min-w-0 flex-1 max-w-full bg-transparent text-xs font-semibold text-gray-700 focus:outline-none"
                    />
                  )}
                </div>
                <label className="flex shrink-0 items-center gap-2 text-[10px] font-semibold text-gray-500 sm:ml-auto">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="h-3 w-3 rounded border-gray-300"
                  />
                  {t(lang, 'allDay')}
                </label>
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">{t(lang, 'priority')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITY_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => setPriority(option.id)}
                  className={`min-w-0 rounded-2xl border px-2 py-2 text-[10px] font-bold ${priority === option.id
                    ? option.activeClass
                    : 'border-indigo-200 bg-white text-indigo-600'
                    }`}
                >
                  {t(lang, option.labelKey)}
                </button>
              ))}
            </div>
          </div>


        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-4 sm:px-6 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full rounded-2xl bg-[#5B21B6] py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 disabled:opacity-60"
          >
            {isSaving ? t(lang, 'savingTask') : t(lang, 'addTaskAction')}
          </button>
        </div>
      </div>
    </div>
  );
}
