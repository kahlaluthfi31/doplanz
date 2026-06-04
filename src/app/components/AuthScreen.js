'use client'
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import GoogleSignInButton from './GoogleSignInButton';

const initialRegister = {
    fullName: '',
    email: '',
    password: '',
    phone: ''
};

const initialLogin = {
    email: '',
    password: ''
};

const initialForgot = {
    email: ''
};

export default function AuthScreen({ onAuthSuccess }) {
    const [mode, setMode] = useState('login');
    const [loginForm, setLoginForm] = useState(initialLogin);
    const [registerForm, setRegisterForm] = useState(initialRegister);
    const [forgotForm, setForgotForm] = useState(initialForgot);
    const [status, setStatus] = useState({ loading: false, message: '', type: '' });
    const [forgotUseGoogle, setForgotUseGoogle] = useState(false);
    const [pending2FAEmail, setPending2FAEmail] = useState('');
    const [twoFactorLoginCode, setTwoFactorLoginCode] = useState('');
    const [showForm, setShowForm] = useState(false);
    const formRef = useRef(null);

    const isLogin = useMemo(() => mode === 'login', [mode]);
    const isForgot = useMemo(() => mode === 'forgot', [mode]);

    const handleScrollToForm = () => {
        setShowForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };

    const handleChange = (setter) => (event) => {
        const { name, value } = event.target;
        setter(prev => ({ ...prev, [name]: value }));
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        if (!credentialResponse?.credential) {
            setStatus({ loading: false, message: 'Gagal mendapatkan token Google.', type: 'error' });
            return;
        }

        setStatus({ loading: true, message: '', type: '' });

        try {
            const response = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential })
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus({
                    loading: false,
                    message: data.message || 'Gagal masuk dengan Google.',
                    type: 'error'
                });
                return;
            }

            setStatus({
                loading: false,
                message: 'Login dengan Google berhasil!',
                type: 'success'
            });
            onAuthSuccess?.(data);
        } catch (error) {
            console.error('Google auth error:', error);
            setStatus({ loading: false, message: 'Gagal terhubung ke server.', type: 'error' });
        }
    };

    const handleGoogleError = () => {
        setStatus({ loading: false, message: 'Login Google dibatalkan atau gagal.', type: 'error' });
    };

    const handleForgotSubmit = async (event) => {
        event.preventDefault();
        setStatus({ loading: true, message: '', type: '' });
        setForgotUseGoogle(false);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotForm.email })
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus({ loading: false, message: data.message || 'Terjadi kesalahan.', type: 'error' });
                return;
            }

            setForgotUseGoogle(Boolean(data.useGoogle));
            setStatus({
                loading: false,
                message: data.message,
                type: data.useGoogle ? 'info' : 'success'
            });

            if (data.devResetUrl && process.env.NODE_ENV === 'development') {
                console.log('Reset password (dev):', data.devResetUrl);
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            setStatus({ loading: false, message: 'Gagal terhubung ke server.', type: 'error' });
        }
    };

    const handleVerify2FALogin = async (event) => {
        event.preventDefault();
        setStatus({ loading: true, message: '', type: '' });

        try {
            const response = await fetch('/api/auth/verify-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: pending2FAEmail,
                    code: twoFactorLoginCode
                })
            });
            const data = await response.json();
            if (!response.ok) {
                setStatus({ loading: false, message: data.message || 'Kode 2FA salah.', type: 'error' });
                return;
            }
            setPending2FAEmail('');
            setTwoFactorLoginCode('');
            onAuthSuccess?.(data);
        } catch (error) {
            setStatus({ loading: false, message: 'Gagal terhubung ke server.', type: 'error' });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus({ loading: true, message: '', type: '' });

        try {
            const payload = isLogin ? loginForm : registerForm;
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus({
                    loading: false,
                    message: data.message || 'Terjadi kesalahan.',
                    type: 'error',
                    useGoogle: data.useGoogle
                });
                return;
            }

            if (isLogin && data.requiresTwoFactor) {
                setPending2FAEmail(data.email || loginForm.email);
                setStatus({
                    loading: false,
                    message: data.message || 'Masukkan kode 2FA.',
                    type: 'info'
                });
                return;
            }

            setStatus({
                loading: false,
                message: isLogin ? 'Login berhasil! Selamat datang kembali.' : 'Registrasi berhasil! Silakan login.',
                type: 'success'
            });

            if (!isLogin) {
                setMode('login');
                setLoginForm({ email: registerForm.email, password: '' });
                return;
            }

            onAuthSuccess?.(data);
        } catch (error) {
            console.error('Auth error:', error);
            setStatus({ loading: false, message: 'Gagal terhubung ke server.', type: 'error' });
        }
    };

    const statusClass = 'bg-indigo-300 text-white font-medium';

    const googleSection = (
        <>
            <div className="mt-5 text-center">
                <p className="text-xs text-gray-400">other way to sign in</p>
                <div className="mt-3">
                    <GoogleSignInButton
                        label={isLogin || isForgot ? 'signin' : 'signup'}
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        disabled={status.loading}
                        loading={status.loading}
                    />
                </div>
            </div>
        </>
    );

    return (
        <main className={`min-h-screen`}>
            <div className={`${showForm ? 'max-w-[420px] mx-auto' : ''}`}>
                {!showForm ? (
                    <section className="text-center">
                        <Image
                            src="/images/image-lets-start.png"
                            alt="Task management illustration"
                            width={260}
                            height={220}
                            priority
                            className="w-full mb-2"
                        />
                        <div className="px-6">
                            <h1 className="text-xl font-semibold text-gray-900">Task Management & To-Do List</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                This productive tool is designed to help you better manage your task project-wise conveniently!
                            </p>
                        </div>
                        <div className="px-6">
                            <button
                                type="button"
                                onClick={handleScrollToForm}
                                className="mt-6 w-full rounded-full bg-indigo-600 text-white py-3 text-sm font-semibold shadow-lg hover:bg-indigo-700 transition"
                            >
                                Let’s Start
                            </button>
                        </div>
                    </section>
                ) : (
                    <section
                        ref={formRef}
                        className={`bg-white ${isLogin && !isForgot ? 'py-28' : 'py-18'} px-6`}
                    >
                        <div className="text-center">
                            <div className="flex justify-center">
                                <Image
                                    src="/images/doplanz-logo-horizontal.png"
                                    alt="doplanZ"
                                    width={200}
                                    height={48}
                                    priority
                                    className="h-auto w-[200px] max-w-full object-contain"
                                />
                            </div>
                            <p className="text-sm text-indigo-500">
                                {isForgot
                                    ? 'Reset your password'
                                    : isLogin
                                      ? 'Sign in to your account'
                                      : 'Create new account'}
                            </p>
                        </div>

                        {status.message && (
                            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${statusClass}`}>
                                {status.message}
                            </div>
                        )}

                        {isForgot ? (
                            <>
                                <form className="space-y-4 mt-6" onSubmit={handleForgotSubmit}>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={forgotForm.email}
                                            onChange={handleChange(setForgotForm)}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Enter your email address"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={status.loading}
                                        className="w-full rounded-full bg-indigo-600 text-white py-3 text-sm font-semibold shadow-md hover:bg-indigo-700 transition disabled:opacity-60"
                                    >
                                        {status.loading ? 'Processing...' : 'Send reset instructions'}
                                    </button>
                                </form>

                                {forgotUseGoogle && (
                                    <p className="mt-3 text-center text-xs text-gray-500">
                                        Gunakan tombol di bawah untuk masuk dengan Google:
                                    </p>
                                )}

                                {googleSection}

                                <p className="mt-4 text-center text-xs text-gray-400">
                                    Remember your password?
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode('login');
                                            setForgotUseGoogle(false);
                                            setStatus({ loading: false, message: '', type: '' });
                                        }}
                                        className="ml-1 text-indigo-500"
                                    >
                                        Back to Sign in
                                    </button>
                                </p>
                            </>
                        ) : pending2FAEmail ? (
                            <form className="space-y-4 mt-6" onSubmit={handleVerify2FALogin}>
                                <p className="text-xs text-gray-500 text-center">
                                    Verifikasi 2FA untuk <span className="font-semibold">{pending2FAEmail}</span>
                                </p>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Kode 2FA (6 digit)</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        required
                                        value={twoFactorLoginCode}
                                        onChange={(e) => setTwoFactorLoginCode(e.target.value)}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="000000"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={status.loading}
                                    className="w-full rounded-full bg-indigo-600 text-white py-3 text-sm font-semibold shadow-md hover:bg-indigo-700 transition disabled:opacity-60"
                                >
                                    {status.loading ? 'Processing...' : 'Verifikasi & Masuk'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPending2FAEmail('');
                                        setTwoFactorLoginCode('');
                                    }}
                                    className="w-full text-xs text-gray-400"
                                >
                                    Batal
                                </button>
                            </form>
                        ) : (
                            <>
                                <form className="space-y-4 mt-6" onSubmit={handleSubmit}>
                                    {!isLogin && (
                                        <>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Full Name</label>
                                                <input
                                                    name="fullName"
                                                    value={registerForm.fullName}
                                                    onChange={handleChange(setRegisterForm)}
                                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Enter your full name"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Phone Number</label>
                                                <input
                                                    name="phone"
                                                    value={registerForm.phone}
                                                    onChange={handleChange(setRegisterForm)}
                                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Enter your phone number"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={isLogin ? loginForm.email : registerForm.email}
                                            onChange={handleChange(isLogin ? setLoginForm : setRegisterForm)}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Enter your email address"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={isLogin ? loginForm.password : registerForm.password}
                                            onChange={handleChange(isLogin ? setLoginForm : setRegisterForm)}
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        {isLogin && (
                                            <div className="mt-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMode('forgot');
                                                        setForgotForm({ email: loginForm.email });
                                                        setForgotUseGoogle(false);
                                                        setStatus({ loading: false, message: '', type: '' });
                                                    }}
                                                    className="text-xs text-gray-400 hover:text-indigo-500"
                                                >
                                                    Forgot password?
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <label className="flex items-start gap-2 text-xs text-gray-500">
                                        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300" />
                                        <span>
                                            I&apos;ve read and agreed to
                                            <span className="text-indigo-500"> User Agreement</span>
                                            {' '}and
                                            <span className="text-indigo-500"> Privacy Policy</span>
                                        </span>
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={status.loading}
                                        className="w-full rounded-full bg-indigo-600 text-white py-3 text-sm font-semibold shadow-md hover:bg-indigo-700 transition disabled:opacity-60"
                                    >
                                        {status.loading ? 'Processing...' : isLogin ? 'Sign in' : 'Sign up'}
                                    </button>
                                </form>

                                {status.useGoogle && (
                                    <p className="mt-2 text-center text-xs text-gray-500">
                                        Atau gunakan Google di bawah:
                                    </p>
                                )}

                                {googleSection}

                                <p className="mt-4 text-center text-xs text-gray-400">
                                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode(isLogin ? 'register' : 'login');
                                            setStatus({ loading: false, message: '', type: '' });
                                        }}
                                        className="ml-1 text-indigo-500"
                                    >
                                        {isLogin ? 'Create Account' : 'Back to Sign in'}
                                    </button>
                                </p>
                            </>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}
