import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { serializeUser } from '@/lib/auth';
import { findOrCreateGoogleUser, verifyGoogleCredential } from '@/lib/google-auth';
import UserSettings from '@/models/UserSettings';

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json({ message: 'Token Google tidak valid.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { message: 'Google Sign-In belum dikonfigurasi. Hubungi administrator.' },
        { status: 503 }
      );
    }

    const payload = await verifyGoogleCredential(credential);
    const user = await findOrCreateGoogleUser(payload);
    const settings = await UserSettings.findOne({ userId: user._id });

    if (settings?.twoFactorEnabled) {
      return NextResponse.json({
        requiresTwoFactor: true,
        email: user.email,
        message: 'Akun ini memerlukan kode 2FA. Masuk dengan email/password lalu verifikasi 2FA.'
      });
    }

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error('Google auth error:', error);
    const message =
      error.message === 'GOOGLE_CLIENT_ID is not configured'
        ? 'Google Sign-In belum dikonfigurasi.'
        : 'Gagal masuk dengan Google. Coba lagi.';
    return NextResponse.json({ message, error: error.message }, { status: 500 });
  }
}
