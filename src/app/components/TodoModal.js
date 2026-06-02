// components/TodoModal.js
'use client';
import { useEffect, useMemo, useState } from 'react';
import { FaCalendarDays, FaClock, FaLayerGroup, FaXmark } from 'react-icons/fa6';
import { t } from '../../lib/i18n';
import { useLanguage } from './LanguageProvider';
import { useModal } from './ModalProvider';

const PRIORITY_OPTIONS = [
    { id: 'low', labelKey: 'priorityLow', activeClass: 'border-blue-600 bg-blue-600 text-white' },
    { id: 'medium', labelKey: 'priorityMedium', activeClass: 'border-indigo-600 bg-indigo-600 text-white' },
    { id: 'high', labelKey: 'priorityHigh', activeClass: 'border-amber-500 bg-amber-500 text-white' },
    { id: 'urgent', labelKey: 'priorityUrgent', activeClass: 'border-red-600 bg-red-600 text-white' }
];

const TodoModal = ({ isOpen, onClose, onSave, isEditing, todoData, groups = [] }) => {
    const { language } = useLanguage();
    const modal = useModal();
    const lang = language || 'id';
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        groupId: '',
        dueDate: '',
        dueTime: '',
        isAllDay: false,
        priority: 'medium',
        isCompleted: false
    });
    const [showGroups, setShowGroups] = useState(false);

    const toLocalDateInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
        return iso.slice(0, 10);
    };

    const toLocalTimeInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
        return iso.slice(11, 16);
    };

    useEffect(() => {
        if (isOpen) {
            if (isEditing && todoData) {
                const resolvedGroupId =
                    todoData.groupId ||
                    (todoData.category
                        ? groups.find(group => group.name === todoData.category)?._id
                        : '') ||
                    '';
                const fallbackTime = todoData.dueDate ? toLocalTimeInput(todoData.dueDate) : '';
                const resolvedTime = todoData.dueTime || fallbackTime;
                const resolvedAllDay = todoData.isAllDay ?? !resolvedTime;
                setFormData({
                    title: todoData.title || '',
                    description: todoData.description || '',
                    groupId: resolvedGroupId,
                    dueDate: toLocalDateInput(todoData.dueDate),
                    dueTime: resolvedTime,
                    isAllDay: resolvedAllDay,
                    priority: (todoData.priority || 'medium').toLowerCase(),
                    isCompleted: todoData.isCompleted || false
                });
            } else {
                resetForm();
            }
        }
    }, [isOpen, isEditing, todoData, groups]);

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            groupId: '',
            dueDate: '',
            dueTime: '',
            isAllDay: false,
            priority: 'medium',
            isCompleted: false
        });
        setShowGroups(false);
    };

    const selectedGroup = useMemo(
        () => groups.find(item => item._id === formData.groupId),
        [groups, formData.groupId]
    );

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            modal.alert({
                title: t(lang, 'alertTitleError'),
                message: t(lang, 'todoTitleRequired'),
                confirmLabel: t(lang, 'okAction'),
                tone: 'error'
            });
            return;
        }

        const submitData = {
            ...formData,
            description: formData.description?.trim() || '',
            dueDate: formData.dueDate || undefined,
            dueTime: formData.isAllDay ? null : formData.dueTime || null,
            isAllDay: formData.isAllDay,
            groupId: formData.groupId || null
        };

        onSave(submitData);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={handleClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
                <div
                    className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                        <h3 className="text-sm font-bold text-gray-800">
                            {isEditing ? t(lang, 'editTodo') : t(lang, 'newTodo')}
                        </h3>
                        <button
                            onClick={handleClose}
                            className="rounded-full bg-gray-100 p-2 text-gray-500 hover:text-gray-700"
                        >
                            <FaXmark />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder={t(lang, 'taskTitlePlaceholder')}
                                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-900 focus:outline-none focus:border-indigo-500"
                                autoFocus
                                required
                            />
                            <div className="relative w-full sm:w-44 sm:shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowGroups(!showGroups)}
                                    className="flex w-full items-center justify-between rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700 focus:outline-none"
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <span className="truncate">{selectedGroup?.name || t(lang, 'selectGroup')}</span>
                                    </span>
                                    <span className="text-xs text-gray-400 ml-2 shrink-0">▾</span>
                                </button>
                                {showGroups && (
                                    <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-lg">
                                        {groups.length === 0 ? (
                                            <p className="px-4 py-3 text-xs text-gray-400">{t(lang, 'emptyGroups')}</p>
                                        ) : (
                                            groups.map(group => (
                                                <button
                                                    key={group._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, groupId: group._id }));
                                                        setShowGroups(false);
                                                    }}
                                                    className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
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
                                                    {formData.groupId === group._id && <span className="text-indigo-500">✓</span>}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <input
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder={t(lang, 'taskDescriptionPlaceholder')}
                            className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700 focus:outline-none focus:border-indigo-500"
                        />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
                                {t(lang, 'dueDate')}
                                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
                                    <FaCalendarDays className="text-indigo-500" />
                                    <input
                                        type="date"
                                        name="dueDate"
                                        value={formData.dueDate}
                                        onChange={handleInputChange}
                                        className="w-full bg-transparent text-xs font-semibold text-gray-700 focus:outline-none"
                                    />
                                </div>
                            </label>
                            <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
                                {t(lang, 'dueTime')}
                                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
                                    <FaClock className="text-purple-500" />
                                    {!formData.isAllDay && (
                                        <input
                                            type="time"
                                            name="dueTime"
                                            value={formData.dueTime}
                                            onChange={handleInputChange}
                                            className="w-full bg-transparent text-xs font-semibold text-gray-700 focus:outline-none"
                                        />
                                    )}
                                    <label className="ml-auto flex items-center gap-2 text-[10px] font-semibold text-gray-500">
                                        <input
                                            type="checkbox"
                                            name="isAllDay"
                                            checked={formData.isAllDay}
                                            onChange={handleInputChange}
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
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, priority: option.id }))}
                                        className={`rounded-2xl border px-2 py-2 text-[10px] font-bold ${formData.priority === option.id
                                            ? option.activeClass
                                            : 'border-indigo-200 bg-white text-indigo-600'
                                            }`}
                                    >
                                        {t(lang, option.labelKey)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>

                    <div className="border-t border-gray-100 bg-white px-6 py-4">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full rounded-2xl bg-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200"
                        >
                            {isEditing ? t(lang, 'update') : t(lang, 'save')}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TodoModal;