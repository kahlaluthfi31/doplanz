'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { FaChevronLeft, FaCheck, FaHourglassHalf, FaClock, FaEllipsisVertical, FaPen, FaTrash } from 'react-icons/fa6';
import { t } from '../../../lib/i18n';
import { useLanguage } from '../../components/LanguageProvider';
import { useSettings } from '../../components/SettingsProvider';
import { useModal } from '../../components/ModalProvider';
import TodoModal from '../../components/TodoModal';

export default function TaskGroupDetailPage() {
    const params = useParams();
    const groupId = params?.id;
    const { language, setLanguage } = useLanguage();
    const { formatDate } = useSettings();
    const modal = useModal();
    const lang = language || 'id';
    const [user, setUser] = useState(null);
    const [group, setGroup] = useState(null);
    const [groups, setGroups] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    useEffect(() => {
        if (!menuOpenId) return;
        const handleClickOutside = (event) => {
            if (event.target.closest('[data-task-menu="group-detail"]')) return;
            setMenuOpenId(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpenId]);

    const statusMeta = useCallback(
        (status) => {
            switch (status) {
                case 'completed':
                    return { label: t(lang, 'statusDone'), className: 'bg-emerald-100/60 text-emerald-600 border border-emerald-200', icon: FaCheck };
                case 'in_progress':
                    return { label: t(lang, 'statusInProgress'), className: 'bg-orange-100/60 text-orange-600 border border-orange-200', icon: FaClock };
                default:
                    return { label: t(lang, 'statusTodo'), className: 'bg-indigo-100/60 text-indigo-600 border border-indigo-200', icon: FaHourglassHalf };
            }
        },
        [lang]
    );

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

    const fetchGroupData = useCallback(async () => {
        if (!user?.id || !groupId) return;
        setIsLoading(true);
        try {
            const [groupsRes, tasksRes] = await Promise.all([
                fetch('/api/task-groups', { headers: { 'x-user-id': user.id } }),
                fetch(`/api/tasks?groupId=${groupId}`, { headers: { 'x-user-id': user.id } })
            ]);

            if (groupsRes.ok) {
                const groups = await groupsRes.json();
                setGroups(groups);
                setGroup(groups.find(item => item._id === groupId) || null);
            }
            if (tasksRes.ok) {
                const data = await tasksRes.json();
                setTasks(data || []);
            }
        } catch (error) {
            console.error('Failed to load group tasks:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, groupId]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const openEditModal = (task) => {
        setEditingTask(task);
        setIsEditOpen(true);
        setMenuOpenId(null);
    };

    const handleSave = async (formData) => {
        if (!user?.id || !editingTask) return;
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
            const res = await fetch(`/api/tasks/${editingTask.id}`, {
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
            fetchGroupData();
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
            fetchGroupData();
        } catch (error) {
            await modal.alert({
                title: t(lang, 'alertTitleError'),
                message: error.message || t(lang, 'alertGeneralError'),
                confirmLabel: t(lang, 'okAction'),
                tone: 'error'
            });
        }
    };

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
                fetchGroupData();
            }
        } catch (error) {
            fetchGroupData();
        }
    }, [user?.id, fetchGroupData]);

    const formattedTasks = useMemo(
        () =>
            tasks.map(task => ({
                id: task._id,
                title: task.title,
                description: task.description,
                status: task.status || 'pending',
                dueDate: task.dueDate ? new Date(task.dueDate) : null
            })),
        [tasks]
    );

    return (
        <main className="min-h-screen bg-gray-50 px-6 pb-28 pt-8 font-sans">
            <div className="mx-auto max-w-md space-y-6">
                <header className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600">
                        <FaChevronLeft /> {t(lang, 'homeTaskGroups')}
                    </Link>
                </header>

                <section className="rounded-3xl bg-white p-5 shadow-sm border border-gray-50 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t(lang, 'groupTasksTitle')}</p>
                    <h1 className="text-lg font-extrabold text-gray-900">{group?.name || t(lang, 'homeTaskGroups')}</h1>
                    <p className="text-xs text-gray-500">
                        {t(lang, 'homeTasksCount', { count: formattedTasks.length })}
                    </p>
                </section>

                {isLoading ? (
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-xs font-semibold text-gray-400 shadow-sm animate-pulse">
                        {t(lang, 'reportsLoading')}
                    </div>
                ) : formattedTasks.length === 0 ? (
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-xs font-semibold text-gray-400 shadow-sm">
                        {t(lang, 'groupTasksEmpty')}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {formattedTasks.map(task => {
                            const meta = statusMeta(task.status);
                            const Icon = meta.icon;
                            const isInProgress = task.status === 'in_progress';
                            const isCompleted = task.status === 'completed';
                            return (
                                <div key={task.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${meta.className}`}>
                                            <Icon className="text-[9px]" /> {meta.label}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {task.dueDate && (
                                                <span className="text-[10px] font-semibold text-gray-400">
                                                    {formatDate(task.dueDate)}
                                                </span>
                                            )}
                                            <div className="relative" data-task-menu="group-detail">
                                                <button
                                                    onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-700"
                                                >
                                                    <FaEllipsisVertical className="text-xs" />
                                                </button>
                                                {menuOpenId === task.id && (
                                                    <div className="absolute right-0 top-9 z-10 w-32 rounded-xl border border-gray-100 bg-white shadow-lg">
                                                        <button
                                                            onClick={() => openEditModal(task)}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                                        >
                                                            <FaPen className="text-[10px]" /> {t(lang, 'editAction')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(task.id)}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                                                        >
                                                            <FaTrash className="text-[10px]" /> {t(lang, 'deleteAction')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{task.title}</p>
                                        {task.description && (
                                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                        )}
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="flex rounded-full bg-gray-100 p-0.5 text-[9px] font-bold">
                                            <button
                                                onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                                                className={`rounded-full px-3 py-1 transition-all ${isInProgress ? 'bg-white text-indigo-600 shadow' : 'text-gray-400'
                                                    }`}
                                            >
                                                {t(lang, 'statusInProgress')}
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(task.id, 'completed')}
                                                className={`rounded-full px-3 py-1 transition-all ${isCompleted ? 'bg-emerald-500 text-white shadow' : 'text-gray-400'
                                                    }`}
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
            <TodoModal
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false);
                    setEditingTask(null);
                }}
                onSave={handleSave}
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
                groups={groups}
            />
        </main>
    );
}
