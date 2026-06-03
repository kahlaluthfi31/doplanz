'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaXmark, FaDownload } from 'react-icons/fa6';
import { t } from '../../lib/i18n';
import { useLanguage } from './LanguageProvider';
import { isStandalonePwa } from '@/lib/device';

const DISMISS_KEY = 'doplanz_install_banner_dismissed';

export default function MobileInstallBanner() {
    const { language } = useLanguage();
    const lang = language || 'id';
    const [visible, setVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installHint, setInstallHint] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isStandalonePwa()) return;
        if (window.localStorage.getItem(DISMISS_KEY) === '1') return;

        setVisible(true);

        const onBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    }, []);

    const dismiss = useCallback(() => {
        window.localStorage.setItem(DISMISS_KEY, '1');
        setVisible(false);
        setInstallHint('');
    }, []);

    const handleInstall = useCallback(async () => {
        const isIOS =
            /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isIOS) {
            setInstallHint(t(lang, 'installIosHint'));
            return;
        }

        if (!deferredPrompt) {
            setInstallHint(t(lang, 'installAndroidHint'));
            return;
        }

        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        dismiss();
    }, [deferredPrompt, dismiss, lang]);

    if (!visible) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[200] px-4 pb-4 pt-2">
            <div className="mx-auto max-w-md rounded-2xl border border-indigo-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <p className="text-xs font-bold text-indigo-900 dark:text-white">
                            {t(lang, 'installMobileTitle')}
                        </p>
                        {installHint && (
                            <p className="mt-2 text-[11px] text-indigo-500 dark:text-indigo-300">
                                {installHint}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="rounded-full p-1 text-indigo-400 hover:bg-indigo-50"
                        aria-label="Close"
                    >
                        <FaXmark />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleInstall}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-xs font-bold text-white"
                >
                    <FaDownload />
                    {t(lang, 'installMobileButton')}
                </button>
            </div>
        </div>
    );
}
