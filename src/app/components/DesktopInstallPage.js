'use client';

import Image from 'next/image';
import { useCallback, useMemo } from 'react';
import { FaMobileScreen, FaDownload } from 'react-icons/fa6';
import { t } from '../../lib/i18n';
import { useLanguage } from './LanguageProvider';

export default function DesktopInstallPage() {
    const { language } = useLanguage();
    const lang = language || 'id';

    const appUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return window.location.origin;
    }, []);

    const qrSrc = appUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}`
        : '';

    const handleDownload = useCallback(() => {
        if (!appUrl) return;

        const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>doplanZ — Buka di HP/Tablet</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 2rem auto; padding: 1rem; color: #312e81; }
    h1 { color: #4f46e5; }
    a { color: #4f46e5; font-weight: bold; }
    .note { background: #eef2ff; padding: 1rem; border-radius: 12px; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>doplanZ</h1>
  <p>Aplikasi ini hanya untuk <strong>HP dan tablet</strong>, bukan komputer/laptop.</p>
  <p>Buka tautan berikut di perangkat mobile Anda, lalu pilih <strong>Install / Tambahkan ke Layar Utama</strong>:</p>
  <p><a href="${appUrl}">${appUrl}</a></p>
  <div class="note">
    File ini hanya panduan. di komputer tidak akan terpasang sebagai aplikasi desktop.
  </div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'doplanZ-buka-di-hp-atau-tablet.html';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }, [appUrl]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-indigo-50 px-6 py-12 font-sans text-indigo-950">
            <div className="mx-auto w-full max-w-md space-y-8 text-center">
                <div className="flex justify-center">
                    <div className="rounded-2xl bg-white px-6 py-4 shadow-lg ring-2 ring-indigo-100 dark:ring-indigo-200">
                        <Image
                            src="/images/doplanz-logo.png"
                            alt="doplanZ"
                            width={160}
                            height={48}
                            priority
                            className="h-auto w-[160px] max-w-none object-contain"
                            unoptimized
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg">
                        <FaMobileScreen className="text-2xl" />
                    </div>
                    <h1 className="text-xl font-extrabold text-indigo-900">
                        {t(lang, 'installDesktopTitle')}
                    </h1>
                    <p className="text-sm text-indigo-600">
                        {t(lang, 'installDesktopSubtitle')}
                    </p>
                </div>

                {qrSrc && (
                    <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-md">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            {t(lang, 'installDesktopScan')}
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={qrSrc}
                            alt="QR"
                            width={220}
                            height={220}
                            className="mx-auto rounded-xl"
                        />
                        <p className="mt-3 break-all text-[11px] font-semibold text-indigo-700">
                            {appUrl}
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-600 active:scale-[0.98]"
                >
                    <FaDownload />
                    {t(lang, 'installDesktopButton')}
                </button>

                <p className="text-[11px] leading-relaxed text-indigo-500">
                    {t(lang, 'installDesktopHint')}
                </p>
            </div>
        </main>
    );
}
