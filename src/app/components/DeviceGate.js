'use client';

import { useEffect, useState } from 'react';
import { canUseApp } from '@/lib/device';
import DesktopInstallPage from './DesktopInstallPage';
import MobileInstallBanner from './MobileInstallBanner';

export default function DeviceGate({ children }) {
    const [allowed, setAllowed] = useState(null);

    useEffect(() => {
        setAllowed(canUseApp());

        if ('serviceWorker' in navigator && canUseApp()) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
    }, []);

    if (allowed === null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
            </div>
        );
    }

    if (!allowed) {
        return <DesktopInstallPage />;
    }

    return (
        <>
            {children}
            <MobileInstallBanner />
        </>
    );
}
