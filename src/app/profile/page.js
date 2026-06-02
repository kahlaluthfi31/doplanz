'use client';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '../../lib/i18n';
import { useLanguage } from '../components/LanguageProvider';
import { useModal } from '../components/ModalProvider';
import AuthScreen from '../components/AuthScreen';
import AddTaskSheet from '../components/AddTaskSheet';
import SettingsToggle from '../components/SettingsToggle';
import { useSettings } from '../components/SettingsProvider';
import { playNotificationSound, requestNotificationPermission } from '@/lib/notification-sound';
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaTrash,
  FaPalette,
  FaLanguage,
  FaCalendarDays,
  FaClock,
  FaBell,
  FaDatabase,
  FaShieldHalved,
  FaCircleInfo,
  FaArrowRightFromBracket,
  FaCamera,
  FaCheck,
  FaChevronRight,
  FaGlobe,
  FaFileExport,
  FaFileImport,
  FaClockRotateLeft,
  FaBoxArchive,
  FaDesktop,
  FaStar,
  FaPaperPlane,
  FaXmark,
  FaTrashCan,
  FaPlus
} from 'react-icons/fa6';

export default function ProfilePage() {
  const router = useRouter();
  const AUTH_KEY = 'todo_auth';
  const { language, setLanguage } = useLanguage();
  const { formatDate, refreshSettings } = useSettings();
  const modal = useModal();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state (autosaved to database)
  const [settings, setSettings] = useState({
    theme: 'light',
    language: language || 'id',
    defaultView: 'today',
    weekStartsOn: 'monday',
    timeFormat: '24h',
    dateFormat: 'DD/MM/YYYY',
    notifyPush: true,
    notifyEmail: false,
    notifySound: true,
    reminderDefault: 15,
    autoArchiveDays: 0
  });

  // Mock states for security / sessions
  const [sessions, setSessions] = useState([
    { id: '1', device: 'Chrome on Windows 11', ip: '182.253.142.11', location: 'Jakarta, Indonesia', current: true },
    { id: '2', device: 'Safari on iPhone 15 Pro', ip: '114.122.34.89', location: 'Bandung, Indonesia', current: false },
    { id: '3', device: 'Next.js Client app', ip: '127.0.0.1', location: 'Localhost', current: false }
  ]);

  const [loginHistory, setLoginHistory] = useState([
    { time: '2026-05-24 00:32', device: 'Chrome / Windows', ip: '182.253.142.11', status: 'Success' },
    { time: '2026-05-23 18:15', device: 'Safari / iPhone', ip: '114.122.34.89', status: 'Success' },
    { time: '2026-05-22 09:40', device: 'Chrome / Windows', ip: '182.253.142.11', status: 'Success' },
    { time: '2026-05-20 14:22', device: 'Firefox / Linux', ip: '36.85.12.98', status: 'Failed (Wrong Password)' }
  ]);

  // Modals / forms state
  const [activeModal, setActiveModal] = useState(null); // 'edit_profile', 'change_email', 'change_password', 'delete_account', 'avatar_picker', 'two_factor', 'sessions', 'about_content', 'contact_us'
  const [modalTitle, setModalTitle] = useState('');
  const [aboutType, setAboutType] = useState(''); // 'privacy', 'terms', 'faq'

  // Input states for modals
  const [editProfileData, setEditProfileData] = useState({ fullName: '', phone: '' });
  const [changeEmailData, setChangeEmailData] = useState({ newEmail: '', otp: '', isOtpSent: false });
  const [changePasswordData, setChangePasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteAccountData, setDeleteAccountData] = useState({ password: '', confirmChecked: false });
  const [contactData, setContactData] = useState({ subject: 'feature', message: '', email: '' });

  const computeCacheSize = useCallback(() => {
    if (typeof window === 'undefined') return '0 KB';
    let total = 0;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      const value = window.localStorage.getItem(key) || '';
      total += key.length + value.length;
    }
    if (total < 1024) return `${total} B`;
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(2)} KB`;
    return `${(total / (1024 * 1024)).toFixed(2)} MB`;
  }, []);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(1); // 1 = setup, 2 = verify
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorQr, setTwoFactorQr] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState('');

  // Cache state
  const [cacheSize, setCacheSize] = useState('0 KB');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  const getLang = () => settings.language || language || 'id';

  const showAlert = (tone, titleKey, message) =>
    modal.alert({
      title: t(getLang(), titleKey),
      message,
      confirmLabel: t(getLang(), 'okAction'),
      tone
    });

  const showConfirm = (titleKey, messageKey, tone = 'warning') =>
    modal.confirm({
      title: t(getLang(), titleKey),
      message: t(getLang(), messageKey),
      confirmLabel: t(getLang(), 'confirmAction'),
      cancelLabel: t(getLang(), 'cancelAction'),
      tone
    });

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result) return;
      await selectAvatar(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Apply theme to <html> element
  const applyTheme = useCallback((theme) => {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) html.classList.add('dark');
    }
    // 'light' = no class needed
  }, []);

  const fetchUserProfileAndSettings = useCallback(async (userId) => {
    try {
      // 1. Fetch profile
      const profileRes = await fetch('/api/users/me', {
        headers: { 'x-user-id': userId }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData);
        setEditProfileData({
          fullName: profileData.fullName || '',
          phone: profileData.phone || ''
        });
      }

      // 2. Fetch settings
      const settingsRes = await fetch('/api/users/settings', {
        headers: { 'x-user-id': userId }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        if (settingsData.language) {
          setLanguage(settingsData.language);
        }
        // Apply theme on load
        applyTheme(settingsData.theme || 'light');
        setTwoFactorEnabled(Boolean(settingsData.twoFactorEnabled));
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  }, [applyTheme, setLanguage]);

  useEffect(() => {
    setCacheSize(computeCacheSize());
  }, [computeCacheSize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedAuth = window.localStorage.getItem(AUTH_KEY);
    if (storedAuth === '1') {
      setIsAuthenticated(true);
      const storedUser = window.localStorage.getItem('todo_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setEditProfileData({
            fullName: parsed.fullName || parsed.full_name || '',
            phone: parsed.phone || ''
          });
          // Fetch settings & profile from API
          fetchUserProfileAndSettings(parsed.id);
        } catch (e) {
          console.error(e);
        }
      }
    }
    setIsLoading(false);
  }, [fetchUserProfileAndSettings]);

  const handleAuthSuccess = (userData) => {
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_KEY, '1');
      if (userData?.id) {
        window.localStorage.setItem('todo_user', JSON.stringify(userData));
        setUser(userData);
        fetchUserProfileAndSettings(userData.id);
      }
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm('confirmLogoutTitle', 'confirmLogoutMessage', 'warning');
    if (!confirmed) return;
    setIsAuthenticated(false);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_KEY);
      window.localStorage.removeItem('todo_user');
    }
    router.push('/');
  };

  // Update specific setting value & sync with db
  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    // Apply theme immediately
    if (key === 'theme') {
      applyTheme(value);
    }
    if (key === 'language') {
      setLanguage(value);
    }
    if (key === 'notifySound' && value) {
      requestNotificationPermission();
      playNotificationSound();
      showAlert('info', 'alertTitleInfo', t(getLang(), 'testSoundPlayed'));
    }

    if (!user?.id) return;
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ [key]: value })
      });
      if (!res.ok) {
        console.error('Gagal menyimpan preferensi ke database.');
      } else {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('todo_settings', JSON.stringify(updated));
          window.dispatchEvent(new Event('todo-settings-changed'));
        }
        refreshSettings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    if (!settings.autoArchiveDays || settings.autoArchiveDays <= 0) return;
    fetch('/api/tasks/archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id
      },
      body: JSON.stringify({ days: settings.autoArchiveDays })
    }).catch((err) => console.error('Auto archive failed:', err));
  }, [user?.id, settings.autoArchiveDays]);

  // Profile update handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(editProfileData)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        window.localStorage.setItem('todo_user', JSON.stringify(updatedUser));
        setActiveModal(null);
        await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertProfileUpdated'));
      } else {
        const error = await res.json();
        await showAlert('error', 'alertTitleError', t(getLang(), 'alertProfileUpdateFailed', { message: error.message }));
      }
    } catch (err) {
      console.error(err);
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertProfileUpdateError'));
    }
  };

  // Change Email handler
  const handleSendEmailVerification = async (e) => {
    e.preventDefault();
    if (!changeEmailData.newEmail) return;
    setChangeEmailData(prev => ({ ...prev, isOtpSent: true }));
    await showAlert(
      'info',
      'alertTitleInfo',
      t(getLang(), 'alertOtpSent', { email: changeEmailData.newEmail })
    );
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (changeEmailData.otp !== '123456') {
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertOtpInvalid'));
      return;
    }

    try {
      const res = await fetch('/api/users/me/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ email: changeEmailData.newEmail })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        window.localStorage.setItem('todo_user', JSON.stringify(data.user));
        setChangeEmailData({ newEmail: '', otp: '', isOtpSent: false });
        setActiveModal(null);
        await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertEmailUpdated'));
      } else {
        const error = await res.json();
        await showAlert('error', 'alertTitleError', t(getLang(), 'alertEmailUpdateFailed', { message: error.message }));
      }
    } catch (err) {
      console.error(err);
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertGeneralError'));
    }
  };

  // Change Password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertPasswordMismatch'));
      return;
    }

    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          oldPassword: changePasswordData.oldPassword,
          newPassword: changePasswordData.newPassword,
          confirmPassword: changePasswordData.confirmPassword
        })
      });

      if (res.ok) {
        setChangePasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setActiveModal(null);
        await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertPasswordUpdated'));
      } else {
        const error = await res.json();
        await showAlert('error', 'alertTitleError', t(getLang(), 'alertPasswordUpdateFailed', { message: error.message }));
      }
    } catch (err) {
      console.error(err);
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertGeneralError'));
    }
  };

  // Delete Account handler
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deleteAccountData.confirmChecked) {
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertConfirmCheckbox'));
      return;
    }

    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ password: deleteAccountData.password })
      });

      if (res.ok) {
        await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertAccountDeleted'));
        setIsAuthenticated(false);
        setUser(null);
        window.localStorage.removeItem(AUTH_KEY);
        window.localStorage.removeItem('todo_user');
        router.push('/');
      } else {
        const error = await res.json();
        await showAlert('error', 'alertTitleError', t(getLang(), 'alertPasswordUpdateFailed', { message: error.message }));
      }
    } catch (err) {
      console.error(err);
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertGeneralError'));
    }
  };

  // Avatar select handler
  const selectAvatar = async (preset) => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ avatarUrl: preset })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        window.localStorage.setItem('todo_user', JSON.stringify(updatedUser));
        setActiveModal(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Data as JSON or CSV
  const handleExportData = async (type) => {
    try {
      const format = type === 'JSON' ? 'json' : 'csv';
      const res = await fetch(`/api/tasks/export?format=${format}`, {
        headers: user?.id ? { 'x-user-id': user.id } : {}
      });
      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `doplanz_tasks_${dateStamp}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertExportSuccess', { type }));
    } catch (err) {
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertExportFailed'));
    }
  };

  // Import Data Handler
  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target.result;
        let todosToImport = [];

        if (file.name.endsWith('.json')) {
          todosToImport = JSON.parse(content);
        } else {
          // simple CSV parse
          const lines = content.split('\n').filter(Boolean);
          const headers = lines[0].split(',');
          todosToImport = lines.slice(1).map(line => {
            const cols = line.split(',');
            return {
              title: cols[1]?.replace(/^"|"$/g, '') || 'Imported Task',
              description: cols[2]?.replace(/^"|"$/g, '') || '',
              category: cols[3] || 'General',
              priority: cols[4] || 'Medium',
              isCompleted: cols[5] === 'Yes',
              dueDate: cols[6] ? new Date(cols[6]) : undefined
            };
          });
        }

        if (!Array.isArray(todosToImport)) {
          todosToImport = [todosToImport];
        }

        // Insert into database
        let successCount = 0;
        for (const todo of todosToImport) {
          const res = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todo)
          });
          if (res.ok) successCount++;
        }

        await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertImportSuccess', { count: successCount }));
      } catch (err) {
        await showAlert('error', 'alertTitleError', t(getLang(), 'alertImportFailed'));
      }
    };
    reader.readAsText(file);
  };

  // Clean Archived Data (e.g. Delete Completed Todos)
  const handleClearArchive = async () => {
    const confirmed = await showConfirm('confirmClearArchiveTitle', 'confirmClearArchiveMessage', 'warning');
    if (!confirmed) return;
    try {
      const res = await fetch('/api/tasks/archive', {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id }
      });
      if (!res.ok) throw new Error('Failed to clear archive');
      const data = await res.json();
      await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertArchiveCleared', { count: data.deletedCount || 0 }));
    } catch (err) {
      await showAlert('error', 'alertTitleError', t(getLang(), 'alertArchiveClearFailed'));
    }
  };

  // Clear cache action
  const handleClearCache = async () => {
    const confirmed = await showConfirm('confirmClearCacheTitle', 'confirmClearCacheMessage', 'warning');
    if (!confirmed) return;

    setCacheSize('Loading...');
    const auth = window.localStorage.getItem(AUTH_KEY);
    const storedUser = window.localStorage.getItem('todo_user');
    const storedLang = window.localStorage.getItem('todo_language');
    const storedSettings = window.localStorage.getItem('todo_settings');

    window.localStorage.clear();

    if (auth) window.localStorage.setItem(AUTH_KEY, auth);
    if (storedUser) window.localStorage.setItem('todo_user', storedUser);
    if (storedLang) window.localStorage.setItem('todo_language', storedLang);
    if (storedSettings) window.localStorage.setItem('todo_settings', storedSettings);

    setCacheSize(computeCacheSize());
    await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertCacheCleared'));
  };

  // Revoke device session
  const revokeSession = (sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    showAlert('success', 'alertTitleSuccess', t(getLang(), 'alertSessionRevoked'));
  };

  // Toggle 2FA Setup
  const start2FASetup = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/users/2fa/setup', {
        method: 'POST',
        headers: { 'x-user-id': user.id }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTwoFactorQr(data.qrCodeDataUrl || '');
      setTwoFactorSecret(data.secret || '');
      setTwoFactorStep(1);
      setActiveModal('two_factor');
    } catch (error) {
      await showAlert('error', 'alertTitleError', error.message || t(getLang(), 'alertGeneralError'));
    }
  };

  const handleToggle2FA = () => {
    if (twoFactorEnabled) {
      setTwoFactorDisableCode('');
      setActiveModal('two_factor_disable');
    } else {
      start2FASetup();
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      const res = await fetch('/api/users/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ code: twoFactorCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTwoFactorEnabled(true);
      setSettings((prev) => ({ ...prev, twoFactorEnabled: true }));
      setActiveModal(null);
      setTwoFactorCode('');
      await showAlert('success', 'alertTitleSuccess', t(getLang(), 'alert2FAEnabled'));
    } catch (error) {
      await showAlert('error', 'alertTitleError', error.message || t(getLang(), 'alert2FAInvalid'));
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      const res = await fetch('/api/users/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ code: twoFactorDisableCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTwoFactorEnabled(false);
      setSettings((prev) => ({ ...prev, twoFactorEnabled: false, twoFactorSecret: null }));
      setActiveModal(null);
      await showAlert('success', 'alertTitleSuccess', t(getLang(), 'confirmDisable2FAMessage'));
    } catch (error) {
      await showAlert('error', 'alertTitleError', error.message || t(getLang(), 'alert2FAInvalid'));
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const subjectMap = {
      feature: t(getLang(), 'contactSubjectFeature'),
      bug: t(getLang(), 'contactSubjectBug'),
      feedback: t(getLang(), 'contactSubjectFeedback'),
      other: t(getLang(), 'contactSubjectOther')
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectMap[contactData.subject] || contactData.subject,
          message: contactData.message,
          email: contactData.email || user?.email,
          userName: user?.fullName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      await showAlert(
        'success',
        'alertTitleSuccess',
        t(getLang(), 'alertContactSent', {
          subject: subjectMap[contactData.subject],
          email: contactData.email || user?.email || ''
        })
      );
      setContactData({ subject: 'feature', message: '', email: '' });
      setActiveModal(null);
    } catch (error) {
      await showAlert(
        'error',
        'alertTitleError',
        t(getLang(), 'contactSendFailed', { message: error.message || t(getLang(), 'alertGeneralError') })
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-indigo-500 dark:bg-slate-950">
        {t(getLang(), 'loadingProfile')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Helper to render user initials or avatar
  const renderAvatar = (large = false) => {
    const classes = large
      ? 'h-24 w-24 text-2xl font-bold relative'
      : 'h-11 w-11 text-sm font-semibold';

    if (user?.avatarUrl) {
      return (
        <div className={`relative ${classes}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.avatarUrl}
            alt="Avatar"
            className="h-full w-full rounded-full object-cover transition-transform duration-300"
          />
          {large && (
            <span className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full text-white text-xs cursor-pointer shadow hover:scale-115 transition-all">
              <FaCamera />
            </span>
          )}
        </div>
      );
    }

    return (
      <div className={`rounded-full bg-indigo-500 text-white flex items-center justify-center ${classes} transition-transform duration-300`}>
        {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'LV'}
        {large && (
          <span className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full text-white text-xs cursor-pointer shadow hover:scale-115 transition-all">
            <FaCamera />
          </span>
        )}
      </div>
    );
  };

  const getJoinedDateFormatted = () => {
    const lang = settings.language || 'id';
    const prefix = t(lang, 'joinedSince');
    if (!user?.createdAt) return `${prefix} Jan 2025`;
    return `${prefix} ${formatDate(user.createdAt)}`;
  };

  const reminderOptions = [
    { value: 5, labelKey: 'reminderBefore5' },
    { value: 15, labelKey: 'reminderBefore15' },
    { value: 30, labelKey: 'reminderBefore30' },
    { value: 60, labelKey: 'reminderBefore60' },
    { value: 1440, labelKey: 'reminderBefore1440' }
  ];

  const archiveOptions = [
    { value: 7, labelKey: 'autoArchive7' },
    { value: 30, labelKey: 'autoArchive30' },
    { value: 90, labelKey: 'autoArchive90' },
    { value: 0, labelKey: 'autoArchiveNever' }
  ];

  return (
    <main className="min-h-screen bg-white px-6 pb-28 pt-8 dark:bg-slate-950">
      <div className="mx-auto max-w-md space-y-6">

        {/* Profile Card Section */}
        <div className="rounded-3xl bg-white p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-indigo-500" />

          <button
            onClick={() => {
              setModalTitle(t(getLang(), 'changeAvatar'));
              setActiveModal('avatar_picker');
            }}
            className="focus:outline-none transition-transform"
          >
            {renderAvatar(true)}
          </button>

          <h2 className="mt-4 text-lg font-bold text-indigo-900">{user?.fullName || 'Kahla Luthfiyah'}</h2>
          <p className="text-xs text-indigo-400 font-medium">{user?.email || 'livia.vaccaro@example.com'}</p>
          <p className="mt-1 text-[11px] text-white bg-indigo-600 px-3 py-1 rounded-full">{getJoinedDateFormatted()}</p>
        </div>

        {/* Section: Akun */}
        <section className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">{t(settings.language, 'managementAccount')}</h3>
          <div className="space-y-1">
            <button
              onClick={() => {
                setModalTitle(t(getLang(), 'editProfile'));
                setActiveModal('edit_profile');
              }}
              className="w-full flex items-center justify-between py-3 px-1 rounded-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 text-sm">
                  <FaUser />
                </span>
                <div>
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">{t(getLang(), 'editProfile')}</p>
                  <p className="text-[10px] text-indigo-400 dark:text-indigo-300">{t(getLang(), 'namePhone')}</p>
                </div>
              </div>
              <FaChevronRight className="text-xs text-indigo-300" />
            </button>

            <button
              onClick={() => {
                setModalTitle(t(getLang(), 'changeEmail'));
                setActiveModal('change_email');
              }}
              className="w-full flex items-center justify-between py-3 px-1 rounded-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 text-sm">
                  <FaEnvelope />
                </span>
                <div>
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">{t(getLang(), 'changeEmail')}</p>
                  <p className="text-[10px] text-indigo-400 dark:text-indigo-300">{t(getLang(), 'verifyNewEmail')}</p>
                </div>
              </div>
              <FaChevronRight className="text-xs text-indigo-300" />
            </button>

            <button
              onClick={() => {
                setModalTitle(t(getLang(), 'changePassword'));
                setActiveModal('change_password');
              }}
              className="w-full flex items-center justify-between py-3 px-1 rounded-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 text-sm">
                  <FaLock />
                </span>
                <div>
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">{t(getLang(), 'changePassword')}</p>
                  <p className="text-[10px] text-indigo-400 dark:text-indigo-300">{t(getLang(), 'updateAccountKey')}</p>
                </div>
              </div>
              <FaChevronRight className="text-xs text-indigo-300" />
            </button>

            <button
              onClick={() => {
                setModalTitle(t(getLang(), 'deleteAccount'));
                setActiveModal('delete_account');
              }}
              className="w-full flex items-center justify-between py-3 px-1 rounded-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 text-sm">
                  <FaTrash />
                </span>
                <div>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{t(getLang(), 'deleteAccount')}</p>
                  <p className="text-[10px] text-indigo-400/80 dark:text-indigo-300/80">{t(getLang(), 'deletePermanent')}</p>
                </div>
              </div>
              <FaChevronRight className="text-xs text-indigo-300" />
            </button>
          </div>
        </section>

        {/* Section: Preferensi */}
        <section className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">{t(settings.language, 'preferences')}</h3>

          <div className="space-y-4">
            {/* Tema */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                {t(settings.language, 'themeDisplay')}
              </div>
              <div className="grid grid-cols-3 gap-2 bg-indigo-600/10 p-1 rounded-2xl text-[10px] font-bold dark:bg-indigo-500/15">
                {[
                  { id: 'light', labelKey: 'themeLight' },
                  { id: 'dark', labelKey: 'themeDark' },
                  { id: 'system', labelKey: 'themeSystem' }
                ].map(th => (
                  <button
                    key={th.id}
                    onClick={() => updateSetting('theme', th.id)}
                    className={`py-2 rounded-xl text-center transition-all ${settings.theme === th.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-indigo-700 hover:bg-indigo-600/15 dark:text-indigo-200 dark:hover:bg-indigo-500/20'
                      }`}
                  >
                    {t(settings.language, th.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bahasa */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-indigo-700">
                <FaLanguage className="text-indigo-500 text-sm" /> {t(settings.language, 'language')}
              </span>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="bg-white border border-indigo-150 rounded-xl px-3 py-1.5 font-semibold text-indigo-600 focus:outline-none text-[11px]"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English (US)</option>
                <option value="su">Basa Sunda</option>
              </select>
            </div>

            {/* Format Waktu */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaClock className="text-purple-500" /> {t(settings.language, 'timeFormat')}
              </span>
              <div className="flex bg-gray-50 p-1 rounded-xl text-[10px] font-bold">
                {[
                  { id: '24h', labelKey: 'timeFormat24h', sampleKey: 'format24hSample' },
                  { id: '12h', labelKey: 'timeFormat12h', sampleKey: 'format12hSample' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateSetting('timeFormat', f.id)}
                    className={`px-3 py-1 rounded-lg transition-all ${settings.timeFormat === f.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500'
                      }`}
                  >
                    {t(settings.language, f.labelKey)} ({t(settings.language, f.sampleKey)})
                  </button>
                ))}
              </div>
            </div>

            {/* Format Tanggal */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaCalendarDays className="text-pink-500" /> {t(settings.language, 'dateFormat')}
              </span>
              <select
                value={settings.dateFormat}
                onChange={(e) => updateSetting('dateFormat', e.target.value)}
                className="bg-gray-50 border border-gray-150 rounded-xl px-3 py-1.5 font-semibold text-gray-600 focus:outline-none text-[11px]"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD MMM YYYY">DD MMM YYYY</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section: Notifikasi */}
        <section className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{t(settings.language, 'notifications')}</h3>

          <div className="space-y-3.5">
            {/* Toggle Push */}
            {/* <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaBell className="text-indigo-500" /> {t(settings.language, 'pushNotif')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyPush}
                  onChange={(e) => updateSetting('notifyPush', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div> */}

            {/* Toggle Email */}
            {/* <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaEnvelope className="text-emerald-500" /> {t(settings.language, 'emailNotif')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyEmail}
                  onChange={(e) => updateSetting('notifyEmail', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div> */}

            {/* Toggle Suara */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaBell className="text-yellow-500" /> {t(settings.language, 'soundNotif')}
              </span>
              <SettingsToggle
                checked={settings.notifySound}
                onChange={(value) => updateSetting('notifySound', value)}
              />
            </div>

            {/* Pengingat Default */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaClock className="text-indigo-500" /> {t(settings.language, 'defaultReminder')}
              </span>
              <select
                value={settings.reminderDefault}
                onChange={(e) => updateSetting('reminderDefault', parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-150 rounded-xl px-3 py-1.5 font-semibold text-gray-600 focus:outline-none text-[11px]"
              >
                {reminderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(settings.language, opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section: Data & Penyimpanan */}
        <section className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{t(settings.language, 'dataStorage')}</h3>

          <div className="space-y-4">
            {/* Ekspor Data */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaFileExport className="text-blue-500" /> {t(settings.language, 'exportData')}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportData('JSON')}
                  className="rounded-lg bg-indigo-600/10 px-2.5 py-1.5 text-[10px] font-bold text-indigo-800 hover:bg-indigo-600/20 transition-all dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25"
                >
                  JSON
                </button>
                <button
                  onClick={() => handleExportData('CSV')}
                  className="rounded-lg bg-emerald-600/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-600/20 transition-all dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* Arsip Otomatis */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaClockRotateLeft className="text-purple-500" /> {t(settings.language, 'autoArchive')}
              </span>
              <select
                value={settings.autoArchiveDays}
                onChange={(e) => updateSetting('autoArchiveDays', parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-150 rounded-xl px-3 py-1.5 font-semibold text-gray-600 focus:outline-none text-[11px]"
              >
                {archiveOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(settings.language, opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Lihat Arsip */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaBoxArchive className="text-indigo-500" /> {t(settings.language, 'archivedData')}
              </span>
              <Link
                href="/archive"
                className="rounded-lg bg-indigo-600/10 px-3 py-1.5 text-[10px] font-bold text-indigo-800 transition-all hover:bg-indigo-600/20 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25"
              >
                {t(settings.language, 'viewArchive')}
              </Link>
            </div>

            {/* Hapus Data Arsip */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaTrash className="text-red-400" /> {t(settings.language, 'deleteArchivedData')}
              </span>
              <button
                onClick={handleClearArchive}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-[10px] font-bold text-white transition-all dark:bg-red-500/15 dark:text-red-600 dark:hover:bg-red-500/25"
              >
                {t(settings.language, 'clearArchive')}
              </button>
            </div>

            {/* Cache */}
            <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-3">
              <div className="flex flex-col">
                <span className="flex items-center gap-2 font-bold text-gray-700">
                  <FaDatabase className="text-gray-500" /> {t(settings.language, 'appCache')}
                </span>
                <span className="text-[9px] text-gray-400 ml-5">{t(settings.language, 'localStorageSize')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-600 text-[11px]">{cacheSize}</span>
                <button
                  onClick={handleClearCache}
                  disabled={cacheSize === 'Loading...' || cacheSize === '0.00 KB'}
                  className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  {t(settings.language, 'clearCache')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Keamanan */}
        <section className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{t(settings.language, 'security')}</h3>

          <div className="space-y-4">
            {/* 2FA */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="flex items-center gap-2 font-bold text-gray-700">
                  <FaShieldHalved className="text-indigo-500" /> {t(settings.language, 'twoFactor')}
                </span>
                <span className="text-[9px] text-gray-400 ml-5">{t(settings.language, 'twoFactorTotpHint')}</span>
              </div>
              <button
                onClick={handleToggle2FA}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${twoFactorEnabled
                  ? 'bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25'
                  : 'bg-indigo-600/10 text-indigo-800 hover:bg-indigo-600/20 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25'
                  }`}
              >
                {twoFactorEnabled ? t(settings.language, 'active') : t(settings.language, 'setupTOTP')}
              </button>
            </div>

            {/* Sesi Aktif */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                <FaDesktop className="text-blue-500" /> {t(settings.language, 'activeSessions')}
              </span>
              <button
                onClick={() => {
                  setModalTitle(t(settings.language, 'activeSessions'));
                  setActiveModal('sessions');
                }}
                className="rounded-lg bg-blue-600/10 px-2.5 py-1.5 text-[10px] font-bold text-blue-800 hover:bg-blue-600/20 transition-all dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25"
              >
                {t(settings.language, 'viewSessions')} ({sessions.length})
              </button>
            </div>
          </div>
        </section>

        {/* Section: Tentang */}
        <section className="rounded-3xl bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{t(settings.language, 'about')}</h3>

          <div className="space-y-1">
            <div className="flex items-center justify-between py-2 px-1 text-xs border-b border-gray-50">
              <span className="flex items-center gap-2 font-bold text-gray-700">
                {t(settings.language, 'appVersion')}
              </span>
              <span className="font-semibold text-gray-400">v1.0.0</span>
            </div>

            <button
              onClick={() => {
                setModalTitle(t(settings.language, 'privacyPolicy'));
                setAboutType('privacy');
                setActiveModal('about_content');
              }}
              className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded-lg transition-all text-left text-xs"
            >
              <span className="font-bold text-gray-600">{t(settings.language, 'privacyPolicy')}</span>
              <FaChevronRight className="text-[10px] text-gray-300" />
            </button>

            <button
              onClick={() => {
                setModalTitle(t(settings.language, 'termsConditions'));
                setAboutType('terms');
                setActiveModal('about_content');
              }}
              className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded-lg transition-all text-left text-xs"
            >
              <span className="font-bold text-gray-600">{t(settings.language, 'termsConditions')}</span>
              <FaChevronRight className="text-[10px] text-gray-300" />
            </button>

            <button
              onClick={() => {
                setModalTitle(t(settings.language, 'faqHelp'));
                setAboutType('faq');
                setActiveModal('about_content');
              }}
              className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded-lg transition-all text-left text-xs"
            >
              <span className="font-bold text-gray-600">{t(settings.language, 'faqHelp')}</span>
              <FaChevronRight className="text-[10px] text-gray-300" />
            </button>

            {/* <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded-lg transition-all text-xs"
            >
              <span className="font-bold text-gray-600 flex items-center gap-1.5">Beri Rating Aplikasi</span>
              <FaChevronRight className="text-[10px] text-gray-300" />
            </a> */}

            <button
              onClick={() => {
                setModalTitle(t(settings.language, 'contactUs'));
                setActiveModal('contact_us');
              }}
              className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded-lg transition-all text-left text-xs"
            >
              <span className="font-bold text-gray-600 flex items-center gap-1.5">{t(settings.language, 'contactUs')}</span>
              <FaChevronRight className="text-[10px] text-gray-300" />
            </button>
          </div>
        </section>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full mt-2 py-4 flex items-center justify-center gap-2 rounded-2xl bg-red-600/10 font-bold text-red-800 shadow-sm transition-all hover:bg-red-600/20 hover:scale-[1.01] dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25"
        >
          <FaArrowRightFromBracket className="text-sm" />
          {t(settings.language, 'logout')}
        </button>

      </div>

      {/* Majestic Bottom Add Button */}
      <button
        type="button"
        onClick={() => setIsAddSheetOpen(true)}
        className="fixed bottom-14 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-indigo-500 text-white shadow-[0_12px_30px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95 transition-all"
        aria-label={t(getLang(), 'addTodo')}
      >
        <FaPlus className="text-xl" />
      </button>
      {/* Floating Glassmorphic Navigation Bar */}
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
          <Link href="/reports" className="flex h-10 w-10 items-center justify-center rounded-xl hover:text-indigo-600 active:scale-95 transition-all">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 9h3v10H5V9zm6-4h3v14h-3V5zm6 7h3v7h-3v-7z" />
            </svg>
          </Link>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-100">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-6 1.67-6 4v2h12v-2c0-2.33-2.67-4-6-4z" />
            </svg>
          </button>
        </div>
      </nav>

      <AddTaskSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        userId={user?.id}
        onCreated={() => setIsAddSheetOpen(false)}
      />

      {/* ===================== MODALS OVERLAYS ===================== */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800">{modalTitle}</h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1 bg-gray-100"
              >
                <FaXmark />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">

              {/* EDIT PROFILE FORM */}
              {activeModal === 'edit_profile' && (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={editProfileData.fullName}
                      onChange={(e) => setEditProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nomor Telepon</label>
                    <input
                      type="tel"
                      value={editProfileData.phone}
                      onChange={(e) => setEditProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder="Masukkan nomor telepon (opsional)"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </form>
              )}

              {/* CHANGE EMAIL FORM */}
              {activeModal === 'change_email' && (
                <div className="space-y-4">
                  {!changeEmailData.isOtpSent ? (
                    <form onSubmit={handleSendEmailVerification} className="space-y-4">
                      <p className="text-[11px] text-gray-500">
                        Kami akan mengirimkan email konfirmasi untuk memverifikasi alamat email baru Anda.
                      </p>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Email Baru</label>
                        <input
                          type="email"
                          required
                          value={changeEmailData.newEmail}
                          onChange={(e) => setChangeEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                          className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                          placeholder="contoh@domain.com"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
                      >
                        Kirim Link Verifikasi
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyEmail} className="space-y-4">
                      <p className="text-[11px] text-gray-500">
                        Silakan masukkan kode OTP yang telah dikirim ke <span className="font-bold text-gray-700">{changeEmailData.newEmail}</span>. Gunakan kode <span className="font-bold text-indigo-600">123456</span> untuk demo.
                      </p>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Kode OTP (6 Digit)</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={changeEmailData.otp}
                          onChange={(e) => setChangeEmailData(prev => ({ ...prev, otp: e.target.value }))}
                          className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-bold tracking-widest text-center focus:outline-none focus:border-indigo-500 focus:bg-white text-gray-700"
                          placeholder="0 0 0 0 0 0"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all"
                      >
                        Verifikasi & Ubah Email
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* CHANGE PASSWORD FORM */}
              {activeModal === 'change_password' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Password Lama</label>
                    <input
                      type="password"
                      required
                      value={changePasswordData.oldPassword}
                      onChange={(e) => setChangePasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1 border-t border-gray-100 pt-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Password Baru</label>
                    <input
                      type="password"
                      required
                      value={changePasswordData.newPassword}
                      onChange={(e) => setChangePasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder="Minimal 6 karakter"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      required
                      value={changePasswordData.confirmPassword}
                      onChange={(e) => setChangePasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder="Ulangi password baru"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
                  >
                    Perbarui Password
                  </button>
                </form>
              )}

              {/* DELETE ACCOUNT FORM */}
              {activeModal === 'delete_account' && (
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <div className="bg-red-600/10 text-red-800 dark:bg-red-500/15 dark:text-red-200 p-4 rounded-2xl text-xs space-y-2 border border-red-600/20 dark:border-red-500/25">
                    <p className="font-bold flex items-center gap-1.5"><FaTrashCan /> Tindakan Berbahaya!</p>
                    <p>
                      Menghapus akun akan memusnahkan seluruh tugas, preferensi, data, dan file Anda secara permanen. Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Konfirmasi Password Anda</label>
                    <input
                      type="password"
                      required
                      value={deleteAccountData.password}
                      onChange={(e) => setDeleteAccountData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-600 pt-1">
                    <input
                      type="checkbox"
                      checked={deleteAccountData.confirmChecked}
                      onChange={(e) => setDeleteAccountData(prev => ({ ...prev, confirmChecked: e.target.checked }))}
                      className="mt-1 accent-red-600"
                    />
                    <span>Saya mengerti dan bersedia menanggung semua konsekuensi kehilangan data.</span>
                  </label>
                  <button
                    type="submit"
                    disabled={!deleteAccountData.confirmChecked || !deleteAccountData.password}
                    className="w-full mt-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow-md hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    Hapus Akun Saya Selamanya
                  </button>
                </form>
              )}

              {/* AVATAR PICKER MODAL */}
              {activeModal === 'avatar_picker' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Upload Foto Profil</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[9px] text-gray-400 block">Maksimal 2MB, format JPG/PNG.</span>
                </div>
              )}

              {/* 2FA SETUP MODAL */}
              {activeModal === 'two_factor' && (
                <div className="space-y-4">
                  {twoFactorStep === 1 ? (
                    <div className="space-y-4 text-center">
                      <div className="flex justify-center">
                        {twoFactorQr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={twoFactorQr} alt="2FA QR" className="h-40 w-40 rounded-xl border border-gray-200" />
                        ) : (
                          <div className="h-40 w-40 rounded-xl bg-gray-100 animate-pulse" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        {t(getLang(), 'twoFactorScanQr')}
                      </p>
                      {twoFactorSecret && (
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-150 text-[10px] text-gray-600 font-mono select-all">
                          {t(getLang(), 'twoFactorSecretLabel')}: <span className="font-bold text-indigo-600">{twoFactorSecret}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setTwoFactorStep(2)}
                        className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
                      >
                        {t(getLang(), 'twoFactorContinue')}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerify2FA} className="space-y-4">
                      <p className="text-[11px] text-gray-500">{t(getLang(), 'login2FAHint')}</p>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t(getLang(), 'twoFactorVerifyCode')}</label>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-bold tracking-widest text-center focus:outline-none focus:border-indigo-500 text-gray-700"
                          placeholder="000000"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTwoFactorStep(1)}
                          className="w-1/3 rounded-xl bg-gray-100 py-3 text-xs font-bold text-gray-600 hover:bg-gray-200 transition-all"
                        >
                          {t(getLang(), 'twoFactorBack')}
                        </button>
                        <button
                          type="submit"
                          className="w-2/3 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all"
                        >
                          {t(getLang(), 'twoFactorActivate')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {activeModal === 'two_factor_disable' && (
                <form onSubmit={handleDisable2FA} className="space-y-4">
                  <p className="text-[11px] text-gray-500">{t(getLang(), 'twoFactorDisablePrompt')}</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t(getLang(), 'twoFactorDisableCode')}</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={twoFactorDisableCode}
                      onChange={(e) => setTwoFactorDisableCode(e.target.value)}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-bold tracking-widest text-center focus:outline-none focus:border-indigo-500 text-gray-700"
                      placeholder="000000"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow-md hover:bg-red-700 transition-all"
                  >
                    {t(getLang(), 'twoFactorDisableAction')}
                  </button>
                </form>
              )}

              {/* SESSIONS & LOGIN HISTORY LIST */}
              {activeModal === 'sessions' && (
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <h5 className="text-[11px] font-bold text-gray-400 uppercase">Perangkat Aktif</h5>
                    <div className="space-y-2">
                      {sessions.map(s => (
                        <div key={s.id} className="bg-gray-50 p-3 rounded-2xl flex items-center justify-between border border-gray-100">
                          <div className="flex items-center gap-2.5 text-xs">
                            <span className="h-8 w-8 rounded-full bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 flex items-center justify-center text-sm">
                              <FaDesktop />
                            </span>
                            <div>
                              <p className="font-bold text-gray-700">{s.device} {s.current && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">Sesi Ini</span>}</p>
                              <p className="text-[9px] text-gray-400">{s.ip} • {s.location}</p>
                            </div>
                          </div>
                          {!s.current && (
                            <button
                              onClick={() => revokeSession(s.id)}
                              className="text-[10px] font-bold text-red-800 bg-red-600/10 px-2 py-1 rounded-lg hover:bg-red-600/20 transition-all dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t border-gray-100 pt-4">
                    <h5 className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1.5"><FaClockRotateLeft /> Riwayat Login Terakhir</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] text-gray-500 border-collapse">
                        <thead>
                          <tr className="border-b border-gray-150 text-gray-400 uppercase font-bold">
                            <th className="pb-2">Waktu</th>
                            <th className="pb-2">Device</th>
                            <th className="pb-2">IP</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loginHistory.map((h, i) => (
                            <tr key={i} className="border-b border-gray-50">
                              <td className="py-2.5 font-medium">{h.time}</td>
                              <td className="py-2.5">{h.device}</td>
                              <td className="py-2.5 font-mono">{h.ip}</td>
                              <td className="py-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${h.status === 'Success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                                  {h.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ABOUT CONTENT (PRIVACY / TERMS / FAQ) */}
              {activeModal === 'about_content' && (
                <div className="space-y-4 text-xs text-gray-600 leading-relaxed max-h-[60vh] overflow-y-auto">
                  {aboutType === 'privacy' && (
                    <div className="space-y-3">
                      <p className="font-bold text-gray-800">Kebijakan Privasi - v1.0.0</p>
                      <p>
                        Kami sangat menghargai privasi data Anda. Aplikasi Todo List kami menyimpan semua data tugas, preferensi, dan rekam jejak aktivitas secara lokal dan aman di server MongoDB cloud.
                      </p>
                      <p className="font-bold text-gray-700">1. Pengumpulan Data</p>
                      <p>
                        Kami mengumpulkan data login berupa email dan nama lengkap untuk mempersonalisasi dashboard Anda. Kami tidak membagikan data ini ke pihak ketiga mana pun.
                      </p>
                      <p className="font-bold text-gray-700">2. Penggunaan Data</p>
                      <p>
                        Data dianalisis hanya di dalam dashboard &quot;Reports&quot; Anda untuk mengukur produktivitas harian Anda sendiri.
                      </p>
                    </div>
                  )}

                  {aboutType === 'terms' && (
                    <div className="space-y-3">
                      <p className="font-bold text-gray-800">Syarat & Ketentuan Layanan</p>
                      <p>
                        Dengan mendaftar dan menggunakan aplikasi ini, Anda setuju untuk terikat oleh syarat dan ketentuan berikut:
                      </p>
                      <p className="font-bold text-gray-700">1. Kewajiban Pengguna</p>
                      <p>
                        Anda wajib menjaga kerahasiaan password dan bertanggung jawab penuh atas segala aktivitas di dalam akun Anda.
                      </p>
                      <p className="font-bold text-gray-700">2. Kehilangan Data</p>
                      <p>
                        Kami berusaha sebaik mungkin menjaga keutuhan data, namun kami tidak bertanggung jawab atas hilangnya data akibat penghapusan arsip atau cache lokal oleh sistem perangkat Anda.
                      </p>
                    </div>
                  )}

                  {aboutType === 'faq' && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="font-bold text-gray-800">Bagaimana cara ekspor data?</p>
                        <p className="mt-1 text-[11px] text-gray-500">Anda dapat mendownload seluruh tugas sebagai file JSON atau CSV melalui bagian &quot;Data & Penyimpanan&quot; di atas.</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="font-bold text-gray-800">Apakah aplikasi ini gratis?</p>
                        <p className="mt-1 text-[11px] text-gray-500">Ya, 100% gratis untuk penggunaan personal tanpa iklan.</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="font-bold text-gray-800">Bagaimana mengaktifkan 2FA?</p>
                        <p className="mt-1 text-[11px] text-gray-500">Pilih Setup TOTP pada menu Keamanan, pindai kode QR yang diberikan, dan masukkan kode OTP 6-digit untuk verifikasi.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CONTACT US FORM */}
              {activeModal === 'contact_us' && (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <p className="text-[11px] text-gray-500">{t(getLang(), 'contactIntro')}</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t(getLang(), 'contactSubjectLabel')}</label>
                    <select
                      value={contactData.subject}
                      onChange={(e) => setContactData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    >
                      <option value="feature">{t(getLang(), 'contactSubjectFeature')}</option>
                      <option value="bug">{t(getLang(), 'contactSubjectBug')}</option>
                      <option value="feedback">{t(getLang(), 'contactSubjectFeedback')}</option>
                      <option value="other">{t(getLang(), 'contactSubjectOther')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t(getLang(), 'contactReplyEmail')}</label>
                    <input
                      type="email"
                      required
                      value={contactData.email}
                      onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder={user?.email || t(getLang(), 'emailPlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t(getLang(), 'contactMessageLabel')}</label>
                    <textarea
                      required
                      rows={4}
                      value={contactData.message}
                      onChange={(e) => setContactData(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white resize-none"
                      placeholder={t(getLang(), 'contactMessagePlaceholder')}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
                  >
                    <FaPaperPlane /> {t(getLang(), 'contactSend')}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </main>
  );
}
