'use client';

import { GoogleLogin } from '@react-oauth/google';

export default function GoogleSignInButton({ onSuccess, onError, label, disabled, loading }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <p className="text-xs text-amber-600 text-center">
        Google Sign-In belum dikonfigurasi. Tambahkan NEXT_PUBLIC_GOOGLE_CLIENT_ID di .env.local
      </p>
    );
  }

  return (
    <div className={`w-full flex justify-center ${disabled || loading ? 'pointer-events-none opacity-60' : ''}`}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        text={label === 'signup' ? 'signup_with' : 'signin_with'}
        shape="pill"
        theme="outline"
        size="large"
        width="340"
        locale="id"
      />
    </div>
  );
}
