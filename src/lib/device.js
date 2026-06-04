/** Mobile & tablet only — desktop/laptop blocked for app usage */
export function isMobileOrTablet() {
    if (typeof window === 'undefined') return true;

    const ua = navigator.userAgent || '';
    const isIPad =
        /iPad/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isTablet =
        isIPad ||
        (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
        /Tablet|PlayBook|Silk/i.test(ua);
    const isPhone =
        /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
            ua
        );

    if (isPhone || isTablet) return true;

    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const narrowTouch =
        window.matchMedia('(max-width: 1024px)').matches &&
        (navigator.maxTouchPoints > 0 || coarsePointer);

    return narrowTouch;
}

export function isStandalonePwa() {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );
}

export function allowDesktopDevBypass() {
    if (typeof window === 'undefined') return false;
    if (process.env.NODE_ENV !== 'development') return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
}

const INSTALL_ACK_KEY = 'doplanz_install_acknowledged';

export function hasAcknowledgedInstall() {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(INSTALL_ACK_KEY) === '1';
}

export function acknowledgeInstall() {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(INSTALL_ACK_KEY, '1');
}

/** Show install landing before the main app (desktop always; mobile browser until user continues or installs PWA). */
export function shouldShowInstallPage() {
    if (typeof window === 'undefined') return false;
    if (allowDesktopDevBypass()) return false;
    if (isStandalonePwa()) return false;
    if (!isMobileOrTablet()) return true;
    return !hasAcknowledgedInstall();
}

export function canUseApp() {
    if (typeof window === 'undefined') return true;
    if (allowDesktopDevBypass()) return true;
    if (isStandalonePwa()) return true;
    if (!isMobileOrTablet()) return false;
    return hasAcknowledgedInstall();
}
