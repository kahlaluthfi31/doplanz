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

export function canUseApp() {
    return isMobileOrTablet() || allowDesktopDevBypass();
}
